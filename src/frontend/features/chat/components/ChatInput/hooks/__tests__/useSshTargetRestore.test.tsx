import { act, create } from 'react-test-renderer';

import { cacheService } from '@/frontend/data/CacheService';
import { readAgentDefaultSsh, writeAgentDefaultSsh } from '@/frontend/data/utils/agentDefaultSsh';
import { SshError, type SshProfile, type SshTarget } from '@/shared/data/types/ssh';

import { useSshTargetRestore } from '../useSshTargetRestore';

const mockSsh = {
  getTarget: jest.fn<SshTarget | null, [string]>(),
  selectTarget: jest.fn<Promise<void>, [string, { id: string; revision: string } | null]>(),
  getRememberedTarget: jest.fn<Promise<SshProfile | null>, [string]>(),
  decideRememberedTarget: jest.fn(),
};

jest.mock('@/frontend/data', () => ({
  useBackendModule: () => mockSsh,
}));

const profile: SshProfile = {
  id: '00000000-0000-7000-8000-000000000001',
  revision: '00000000-0000-7000-8000-000000000002',
  name: 'Prod VPS',
  host: 'example.com',
  port: 22,
  username: 'ubuntu',
  authMethod: 'privateKey',
  fingerprint: 'SHA256:abc',
  isEnabled: true,
  remoteDirectory: '/home/ubuntu',
};

function renderHook(
  contextId: string | undefined,
  enabled: boolean,
  agentId?: string,
  ensureDraftContext?: () => void,
) {
  let latest!: ReturnType<typeof useSshTargetRestore>;
  function Harness() {
    latest = useSshTargetRestore(contextId, enabled, agentId, ensureDraftContext);
    return null;
  }
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(<Harness />);
  });
  return {
    latest: () => latest,
    unmount: () => act(() => tree.unmount()),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  cacheService.setPersist('agent.default_ssh', {});
  mockSsh.getTarget.mockReturnValue(null);
  mockSsh.selectTarget.mockResolvedValue(undefined);
  mockSsh.getRememberedTarget.mockResolvedValue(null);
  mockSsh.decideRememberedTarget.mockResolvedValue(undefined);
});

afterEach(() => {
  cacheService.setPersist('agent.default_ssh', {});
});

test('silently attaches an Agent default SSH on mount without prompting', async () => {
  writeAgentDefaultSsh('agent-1', { id: profile.id, revision: profile.revision });
  const hook = renderHook('draft:123', true, 'agent-1');

  await act(async () => {});
  expect(mockSsh.selectTarget).toHaveBeenCalledWith('draft:123', {
    id: profile.id,
    revision: profile.revision,
  });
  expect(hook.latest().prompt).toBeUndefined();

  await act(async () => {
    await hook.latest().prepare([]);
  });
  expect(mockSsh.getRememberedTarget).not.toHaveBeenCalled();
  expect(hook.latest().prompt).toBeUndefined();
  hook.unmount();
});

test('respects an existing manual SSH selection on the context', async () => {
  writeAgentDefaultSsh('agent-1', { id: profile.id, revision: profile.revision });
  mockSsh.getTarget.mockReturnValue({ selectionId: 'sel-1', profile, grant: null });
  const hook = renderHook('session-1', true, 'agent-1');

  await act(async () => {});
  expect(mockSsh.selectTarget).not.toHaveBeenCalled();
  await act(async () => {
    await hook.latest().prepare([]);
  });
  expect(mockSsh.selectTarget).not.toHaveBeenCalled();
  hook.unmount();
});

test('drops stale Agent default SSH bindings when the profile no longer matches', async () => {
  writeAgentDefaultSsh('agent-1', { id: profile.id, revision: profile.revision });
  mockSsh.selectTarget.mockRejectedValue(new SshError('changed'));
  const hook = renderHook('session-1', true, 'agent-1');

  await act(async () => {});
  expect(readAgentDefaultSsh('agent-1')).toBeNull();
  hook.unmount();
});

test('preserves the restore confirmation prompt when the Agent has no default SSH', async () => {
  mockSsh.getRememberedTarget.mockResolvedValue(profile);
  const hook = renderHook('session-1', true, 'agent-1');

  let pending!: Promise<void>;
  act(() => {
    pending = hook.latest().prepare([])!;
  });
  await act(async () => {});

  expect(hook.latest().prompt?.profile).toEqual(profile);
  await act(async () => {
    hook.latest().prompt?.decide('restore');
    await pending;
  });
  expect(mockSsh.decideRememberedTarget).toHaveBeenCalledWith('session-1', profile, 'restore');
  hook.unmount();
});

test('requests a draft context id when a new draft has an Agent default SSH', async () => {
  writeAgentDefaultSsh('agent-1', { id: profile.id, revision: profile.revision });
  const ensureDraftContext = jest.fn();
  const hook = renderHook(undefined, true, 'agent-1', ensureDraftContext);

  await act(async () => {});
  expect(ensureDraftContext).toHaveBeenCalledTimes(1);
  expect(mockSsh.selectTarget).not.toHaveBeenCalled();
  hook.unmount();
});
