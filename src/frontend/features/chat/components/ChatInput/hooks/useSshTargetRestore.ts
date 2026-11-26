import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { useBackendModule } from '@/frontend/data';
import { forgetAgentDefaultSsh, readAgentDefaultSsh } from '@/frontend/data/utils/agentDefaultSsh';
import { SshError, type SshProfile, type SshReference } from '@/shared/data/types/ssh';

type Decision = 'restore' | 'forget' | 'cancel';
type RestorePrompt = {
  profile: SshProfile;
  canForget: boolean;
  decide: (decision: Decision) => void;
};

const cancelled = () =>
  Object.assign(new Error('SSH target confirmation cancelled'), { name: 'AbortError' });

/** An Agent binding pointing at a deleted profile is useless; drop it on the spot. */
function dropStaleBinding(agentId: string | undefined, error: unknown) {
  if (error instanceof SshError && (error.code === 'changed' || error.code === 'not-found'))
    forgetAgentDefaultSsh(agentId);
}

export function useSshTargetRestore(
  contextId: string | undefined,
  enabled: boolean,
  agentId?: string,
) {
  const ssh = useBackendModule('ssh');
  const lifetime = useRef<AbortController | null>(null);
  const [prompt, setPrompt] = useState<RestorePrompt>();

  useLayoutEffect(() => {
    if (!contextId || !enabled) return;
    const controller = new AbortController();
    lifetime.current = controller;
    if (agentId && !ssh.getTarget(contextId)) {
      // An Agent default attaches silently: no @SSH mention and no restore prompt.
      const defaultSsh = readAgentDefaultSsh(agentId);
      if (defaultSsh)
        void ssh
          .selectTarget(contextId, defaultSsh)
          .catch((error: unknown) => dropStaleBinding(agentId, error));
    }
    return () => {
      lifetime.current = null;
      controller.abort();
    };
  }, [agentId, contextId, enabled, ssh]);

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
            dropStaleBinding(agentId, error);
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
