import { cacheService } from '@/frontend/data/CacheService';
import type { FileFolder } from '@/shared/data/types/fileLibrary';

import {
  forgetAgentDefaultFolder,
  readAgentDefaultFolder,
  resolveAgentDefaultFolder,
  writeAgentDefaultFolder,
} from '../agentDefaultFolder';

const folder = (id: string): FileFolder => ({
  id,
  parentId: null,
  name: `folder-${id}`,
  createdAt: 0,
  updatedAt: 0,
  deletedAt: null,
});

afterEach(() => {
  cacheService.setPersist('agent.default_folder', {});
});

test('round-trips an Agent default folder', () => {
  writeAgentDefaultFolder('agent', 'folder-1');
  expect(readAgentDefaultFolder('agent')).toBe('folder-1');
  expect(readAgentDefaultFolder('other')).toBeNull();
  expect(readAgentDefaultFolder(undefined)).toBeNull();
  forgetAgentDefaultFolder('agent');
  expect(cacheService.getPersist('agent.default_folder')).toEqual({});
});

test('resolves the binding only while the folder still exists', () => {
  writeAgentDefaultFolder('agent', 'folder-1');
  expect(resolveAgentDefaultFolder('agent', [folder('folder-1')])?.id).toBe('folder-1');
  expect(resolveAgentDefaultFolder('agent', [folder('folder-2')])).toBeUndefined();
  expect(resolveAgentDefaultFolder('agent', undefined)).toBeUndefined();
});
