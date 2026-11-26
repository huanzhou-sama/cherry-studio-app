import type { FileFolder } from '@/shared/data/types/fileLibrary';

import { cacheService } from '../CacheService';

const KEY = 'agent.default_folder';

/** Agent-level default library folder, persisted so it survives restarts. */
export function readAgentDefaultFolder(agentId: string | undefined): string | null {
  if (!agentId) return null;
  return cacheService.getPersist(KEY)[agentId] ?? null;
}

/** Resolves the binding only while the folder still exists in the library. */
export function resolveAgentDefaultFolder(
  agentId: string | undefined,
  folders: readonly FileFolder[] | undefined,
): FileFolder | undefined {
  const id = readAgentDefaultFolder(agentId);
  return id ? folders?.find((folder) => folder.id === id) : undefined;
}

export function writeAgentDefaultFolder(
  agentId: string,
  folderId: string | null | undefined,
): void {
  const all = { ...cacheService.getPersist(KEY) };
  if (folderId) all[agentId] = folderId;
  else delete all[agentId];
  cacheService.setPersist(KEY, all);
}

export function forgetAgentDefaultFolder(agentId: string | undefined): void {
  if (!agentId) return;
  writeAgentDefaultFolder(agentId, null);
}
