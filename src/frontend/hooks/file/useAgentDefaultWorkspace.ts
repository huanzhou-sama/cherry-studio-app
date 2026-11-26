import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { v7 as uuidv7 } from 'uuid';

import { chatRouteParams, type ChatTarget } from '@/frontend/appShell/navigation/chat';
import { cacheService } from '@/frontend/data/CacheService';
import { resolveAgentDefaultFolder } from '@/frontend/data/utils/agentDefaultFolder';
import type { FileFolder } from '@/shared/data/types/fileLibrary';

/**
 * Seeds a draft chat's workspace from the Agent's default folder once per Agent
 * selection, without overwriting a manual pick or an explicit clear ("None").
 */
export function useAgentDefaultWorkspace({
  agentId,
  availableFolders,
  draftFolderId,
  isFocused,
  isMinimalAgent,
  sessionId,
  sessionKey,
  target,
}: {
  agentId: string | undefined;
  availableFolders: readonly FileFolder[] | undefined;
  draftFolderId: string | null | undefined;
  isFocused: boolean;
  isMinimalAgent: boolean;
  sessionId: string | undefined;
  sessionKey: number;
  target: ChatTarget;
}): string | null | undefined {
  const defaultAgentFolder = useMemo(() => {
    if (sessionId || isMinimalAgent) return undefined;
    return resolveAgentDefaultFolder(agentId, availableFolders);
  }, [agentId, availableFolders, isMinimalAgent, sessionId]);

  const router = useRouter() as {
    setParams?: (params: Record<string, string | undefined>) => void;
  };
  const seededDraftFolderRef = useRef<
    { sessionKey: number; agentId?: string; folderId: string | null } | undefined
  >(undefined);
  const draftWorkspaceId = target.kind === 'draft' ? target.workspaceDraftId : undefined;

  useEffect(() => {
    if (target.kind !== 'draft' || !isFocused || isMinimalAgent) return;
    const prev = seededDraftFolderRef.current;
    if (prev?.sessionKey === sessionKey && prev.agentId === agentId) return;

    const targetFolderId = defaultAgentFolder?.id ?? null;
    const canReplace =
      !draftFolderId || (prev?.sessionKey === sessionKey && draftFolderId === prev.folderId);
    if (!canReplace) {
      seededDraftFolderRef.current = { sessionKey, agentId, folderId: draftFolderId };
      return;
    }
    if (!targetFolderId && !draftWorkspaceId) {
      seededDraftFolderRef.current = { sessionKey, agentId, folderId: null };
      return;
    }

    const nextDraftId = draftWorkspaceId ?? uuidv7();
    const seedRecordKey = `agent_folder_seed:${nextDraftId}`;
    if (cacheService.getCasual<string>(seedRecordKey) === (agentId ?? '')) {
      seededDraftFolderRef.current = { sessionKey, agentId, folderId: draftFolderId ?? null };
      return;
    }

    cacheService.set(`chat.draft_workspace.${nextDraftId}`, targetFolderId);
    cacheService.setCasual(seedRecordKey, agentId ?? '');
    seededDraftFolderRef.current = { sessionKey, agentId, folderId: targetFolderId };
    if (!draftWorkspaceId && targetFolderId && typeof router.setParams === 'function') {
      router.setParams(chatRouteParams({ ...target, workspaceDraftId: nextDraftId }));
    }
  }, [
    agentId,
    defaultAgentFolder,
    draftFolderId,
    draftWorkspaceId,
    isFocused,
    isMinimalAgent,
    router,
    sessionKey,
    target,
  ]);

  if (sessionId) return undefined;
  const isDraftFolderSeeded =
    Boolean(draftWorkspaceId) &&
    cacheService.getCasual<string>(`agent_folder_seed:${draftWorkspaceId}`) === (agentId ?? '');
  return isDraftFolderSeeded
    ? (draftFolderId ?? null)
    : (draftFolderId ?? defaultAgentFolder?.id ?? null);
}
