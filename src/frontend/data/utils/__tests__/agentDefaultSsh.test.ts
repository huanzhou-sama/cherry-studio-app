import { cacheService } from '@/frontend/data/CacheService';

import {
  forgetAgentDefaultSsh,
  readAgentDefaultSsh,
  writeAgentDefaultSsh,
} from '../agentDefaultSsh';

afterEach(() => {
  cacheService.setPersist('agent.default_ssh', {});
});

test('round-trips an Agent default SSH binding', () => {
  writeAgentDefaultSsh('agent', { id: 'profile', revision: 'rev' });
  expect(readAgentDefaultSsh('agent')).toEqual({ id: 'profile', revision: 'rev' });
  expect(readAgentDefaultSsh('other')).toBeNull();
  expect(readAgentDefaultSsh(undefined)).toBeNull();
});

test('keeps bindings per Agent and clears a single one', () => {
  writeAgentDefaultSsh('a', { id: 'p1', revision: 'r1' });
  writeAgentDefaultSsh('b', { id: 'p2', revision: 'r2' });
  forgetAgentDefaultSsh('a');
  expect(readAgentDefaultSsh('a')).toBeNull();
  expect(readAgentDefaultSsh('b')).toEqual({ id: 'p2', revision: 'r2' });
  forgetAgentDefaultSsh('b');
  expect(cacheService.getPersist('agent.default_ssh')).toEqual({});
});
