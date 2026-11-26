import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { useBackendModule } from '@/frontend/data';
import { readAgentDefaultSsh } from '@/frontend/data/utils/agentDefaultSsh';
import {
  dropStaleAgentDefaultSsh,
  useAgentDefaultSsh,
} from '@/frontend/hooks/ssh/useAgentDefaultSsh';
import { SshError, type SshProfile, type SshReference } from '@/shared/data/types/ssh';

type Decision = 'restore' | 'forget' | 'cancel';
type RestorePrompt = {
  profile: SshProfile;
  canForget: boolean;
  decide: (decision: Decision) => void;
};

const cancelled = () =>
  Object.assign(new Error('SSH target confirmation cancelled'), { name: 'AbortError' });

export function useSshTargetRestore(
  contextId: string | undefined,
  enabled: boolean,
  agentId?: string,
  ensureDraftContext?: () => void,
) {
  const ssh = useBackendModule('ssh');
  const lifetime = useRef<AbortController | null>(null);
  const [prompt, setPrompt] = useState<RestorePrompt>();

  // Lifetime depends solely on the context and active state; unrelated callback
  // identity changes must never abort an open restore confirmation dialog.
  useLayoutEffect(() => {
    if (!contextId || !enabled) return;
    const controller = new AbortController();
    lifetime.current = controller;
    return () => {
      lifetime.current = null;
      controller.abort();
    };
  }, [contextId, enabled]);

  useAgentDefaultSsh({ agentId, contextId, enabled, ensureDraftContext });

  const prepare = useCallback(
    (mentions: readonly SshReference[]) => {
      if (!contextId || !enabled || ssh.getTarget(contextId)) return;
      const signal = lifetime.current?.signal;
      if (!signal) throw cancelled();
      return (async () => {
        const defaultSsh = readAgentDefaultSsh(agentId);
        if (defaultSsh) {
          try {
            await ssh.selectTarget(contextId, defaultSsh);
            if (signal.aborted) throw cancelled();
            return;
          } catch (error) {
            if (signal.aborted) throw cancelled();
            dropStaleAgentDefaultSsh(agentId, error);
          }
        }
        const profile = await ssh.getRememberedTarget(contextId);
        if (signal.aborted) throw cancelled();
        if (!profile) return;
        if (mentions.some(({ id, revision }) => id !== profile.id || revision !== profile.revision))
          throw new SshError('changed');

        const { promise, resolve } = Promise.withResolvers<Decision>();
        const cancel = () => resolve('cancel');
        const request = { profile, canForget: mentions.length === 0, decide: resolve };
        signal.addEventListener('abort', cancel, { once: true });
        setPrompt(request);
        const decision = await promise;
        signal.removeEventListener('abort', cancel);
        setPrompt((current) => (current === request ? undefined : current));
        if (decision === 'cancel' || signal.aborted) throw cancelled();
        await ssh.decideRememberedTarget(contextId, profile, decision);
        if (signal.aborted) throw cancelled();
      })();
    },
    [agentId, contextId, enabled, ssh],
  );

  return { prepare, prompt };
}
