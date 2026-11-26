import { act, create } from 'react-test-renderer';

import type { ChatTarget } from '@/frontend/appShell/navigation/chat';
import { cacheService } from '@/frontend/data/CacheService';
import { writeAgentDefaultFolder } from '@/frontend/data/utils/agentDefaultFolder';
import type { FileFolder } from '@/shared/data/types/fileLibrary';

import { useAgentDefaultWorkspace } from '../useAgentDefaultWorkspace';

const mockSetParams = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ setParams: mockSetParams }),
}));

const folder = (id: string): FileFolder => ({
  id,
  parentId: null,
  name: `folder-${id}`,
  createdAt: 0,
  updatedAt: 0,
  deletedAt: null,
});

function renderHook(props: {
  agentId: string;
  availableFolders?: FileFolder[];
  draftFolderId: string | null;
  isMinimalAgent?: boolean;
  sessionId?: string;
  sessionKey?: number;
  target: ChatTarget;
}) {
  let latest: string | null | undefined;
  function Harness(p: typeof props) {
    latest = useAgentDefaultWorkspace({
      agentId: p.agentId,
      availableFolders: p.availableFolders,
      draftFolderId: p.draftFolderId,
      isFocused: true,
      isMinimalAgent: p.isMinimalAgent ?? false,
      sessionId: p.sessionId,
      sessionKey: p.sessionKey ?? 1,
      target: p.target,
    });
    return null;
  }
  const tree = create(<Harness {...props} />);
  return {
    latest: () => latest,
    rerender: (next: typeof props) => act(() => tree.update(<Harness {...next} />)),
    unmount: () => act(() => tree.unmount()),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  cacheService.setPersist('agent.default_folder', {});
});

afterEach(() => {
  cacheService.setPersist('agent.default_folder', {});
});

test('seeds a fresh draft with the Agent default folder and sets workspaceDraftId', async () => {
  const f1 = folder('00000000-0000-7000-8000-000000000001');
  writeAgentDefaultFolder('agent-1', f1.id);
  const hook = renderHook({
    agentId: 'agent-1',
    availableFolders: [f1],
    draftFolderId: null,
    target: { kind: 'draft', agentId: 'agent-1' },
  });
  await act(async () => {});

  expect(hook.latest()).toBe(f1.id);
  expect(mockSetParams).toHaveBeenCalledWith(
    expect.objectContaining({
      agentId: 'agent-1',
      workspaceDraftId: expect.any(String),
    }),
  );
  const draftId = mockSetParams.mock.calls[0][0].workspaceDraftId as string;
  expect(cacheService.get(`chat.draft_workspace.${draftId}`)).toBe(f1.id);

  // User explicitly clears the folder ("None"): must NOT re-seed the default.
  hook.rerender({
    agentId: 'agent-1',
    availableFolders: [f1],
    draftFolderId: null,
    target: { kind: 'draft', agentId: 'agent-1', workspaceDraftId: draftId },
  });
  await act(async () => {});
  expect(hook.latest()).toBeNull();
  expect(cacheService.get(`chat.draft_workspace.${draftId}`)).toBe(f1.id);
  hook.unmount();
});

test('does not seed minimal mode Agents or existing sessions', async () => {
  const f1 = folder('00000000-0000-7000-8000-000000000001');
  writeAgentDefaultFolder('agent-1', f1.id);
  const minimal = renderHook({
    agentId: 'agent-1',
    availableFolders: [f1],
    draftFolderId: null,
    isMinimalAgent: true,
    target: { kind: 'draft', agentId: 'agent-1' },
  });
  await act(async () => {});
  expect(minimal.latest()).toBeNull();
  expect(mockSetParams).not.toHaveBeenCalled();
  minimal.unmount();

  const existing = renderHook({
    agentId: 'agent-1',
    availableFolders: [f1],
    draftFolderId: null,
    sessionId: 'session-1',
    target: { kind: 'session', sessionId: 'session-1' },
  });
  await act(async () => {});
  expect(existing.latest()).toBeUndefined();
  existing.unmount();
});
