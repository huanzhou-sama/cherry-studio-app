import type { SshReference } from '@/shared/data/types/ssh';

import { cacheService } from '../CacheService';

const KEY = 'agent.default_ssh';

/**
 * Agent-level default SSH binding, persisted so it survives restarts.
 *
 * Kept outside the Agent record on purpose: it is a device-local convenience for
 * a personal build, so it needs no schema migration or policy surface.
 */
export function readAgentDefaultSsh(agentId: string | undefined): SshReference | null {
  if (!agentId) return null;
  const entry = cacheService.getPersist(KEY)[agentId];
  return entry ? { id: entry.id, revision: entry.revision } : null;
}

export function writeAgentDefaultSsh(
  agentId: string,
  reference: SshReference | null | undefined,
): void {
  const all = { ...cacheService.getPersist(KEY) };
  if (reference) all[agentId] = { id: reference.id, revision: reference.revision };
  else delete all[agentId];
  cacheService.setPersist(KEY, all);
}

export function forgetAgentDefaultSsh(agentId: string | undefined): void {
  if (!agentId) return;
  writeAgentDefaultSsh(agentId, null);
}
