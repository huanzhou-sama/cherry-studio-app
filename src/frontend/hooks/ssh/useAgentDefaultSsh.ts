import { useEffect, useEffectEvent } from 'react';

import { useBackendModule } from '@/frontend/data';
import { forgetAgentDefaultSsh, readAgentDefaultSsh } from '@/frontend/data/utils/agentDefaultSsh';
import { SshError } from '@/shared/data/types/ssh';

/** An Agent binding pointing at a deleted profile is useless; drop it on the spot. */
export function dropStaleAgentDefaultSsh(agentId: string | undefined, error: unknown) {
  if (error instanceof SshError && (error.code === 'changed' || error.code === 'not-found'))
    forgetAgentDefaultSsh(agentId);
}

/**
 * Silently attaches an Agent's default SSH profile when its chat context is
 * active, or requests a draft context ID when a brand-new draft has none yet.
 */
export function useAgentDefaultSsh({
  agentId,
  contextId,
  enabled,
  ensureDraftContext,
}: {
  agentId: string | undefined;
  contextId: string | undefined;
  enabled: boolean;
  ensureDraftContext?: () => void;
}) {
  const ssh = useBackendModule('ssh');
  const requestDraftContext = useEffectEvent(() => ensureDraftContext?.());

  useEffect(() => {
    if (!enabled || !agentId) return;
    const defaultSsh = readAgentDefaultSsh(agentId);
    if (!defaultSsh) return;
    if (!contextId) {
      requestDraftContext();
      return;
    }
    if (!ssh.getTarget(contextId)) {
      void ssh
        .selectTarget(contextId, defaultSsh)
        .catch((error: unknown) => dropStaleAgentDefaultSsh(agentId, error));
    }
  }, [agentId, contextId, enabled, ssh]);
}
