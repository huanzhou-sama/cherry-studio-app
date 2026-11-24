export type BuiltInToolApproval = 'auto' | 'ask' | 'deny';

export type BuiltInToolEffect = 'read' | 'write';

export type BuiltInToolCapabilityScope =
  | 'calendar'
  | 'location'
  | 'device'
  | 'ssh'
  | 'http'
  | 'files'
  | 'office'
  | 'agents'
  | 'mcp'
  | 'skills'
  | 'library'
  | 'images';

export type BuiltInToolGroup =
  | 'calendar'
  | 'location'
  | 'ssh'
  | 'web'
  | 'workspace'
  | 'library'
  | 'office'
  | 'agents'
  | 'mcp'
  | 'skills'
  | 'images';

export type BuiltInToolPlatform = 'ios' | 'android' | 'web';

export interface BuiltInToolDescriptor {
  capabilityId: string;
  toolName: string;
  /** Group used by UI pickers and coarse capability checks. */
  group: BuiltInToolGroup;
  scope: BuiltInToolCapabilityScope;
  /** Default approval when the agent has not configured a specific override. */
  defaultApproval: BuiltInToolApproval;
  /** Whether the agent-level `auto` approval mode can automatically approve this tool. */
  autoApprovalEligible: boolean;
  /** Fine-grained permission scopes gated at the runtime/UI level. */
  permissionScopes: string[];
  /** Side-effect classification for confirmation prompts and auditing. */
  effect?: BuiltInToolEffect;
  /** Platforms on which this tool is registered. Defaults to all platforms when omitted. */
  platforms?: BuiltInToolPlatform[];
}

const DEFAULTS = {
  autoApprovalEligible: true,
  permissionScopes: [] as string[],
} as const;

function describe(
  id: string,
  defaultApproval: BuiltInToolApproval,
  overrides: Partial<Omit<BuiltInToolDescriptor, 'capabilityId' | 'toolName' | 'defaultApproval'>> = {},
): BuiltInToolDescriptor {
  const scope = overrides.scope ?? inferScope(id);
  const group = overrides.group ?? scopeToGroup(scope);
  return {
    capabilityId: id,
    toolName: id,
    group,
    scope,
    defaultApproval,
    ...DEFAULTS,
    ...overrides,
  };
}

function inferScope(id: string): BuiltInToolCapabilityScope {
  if (id.startsWith('calendar_')) return 'calendar';
  if (id.startsWith('location_')) return 'location';
  if (id.startsWith('ssh_')) return 'ssh';
  if (id === 'http_request' || id.startsWith('web_')) return 'http';
  if (
    id === 'read_file' ||
    id === 'write_file' ||
    id === 'edit_file' ||
    id.endsWith('_workspace') ||
    id.includes('_workspace_')
  ) {
    return 'files';
  }
  if (id.startsWith('library_')) return 'library';
  if (
    id.includes('_document') ||
    id.includes('_workbook') ||
    id.includes('_presentation') ||
    id.includes('_office_')
  ) {
    return 'office';
  }
  if (id.startsWith('agent_')) return 'agents';
  if (id.startsWith('mcp_')) return 'mcp';
  if (id.endsWith('_skill') || id.endsWith('_skills')) return 'skills';
  if (id === 'generate_image') return 'images';
  return 'device';
}

function scopeToGroup(scope: BuiltInToolCapabilityScope): BuiltInToolGroup {
  switch (scope) {
    case 'calendar':
      return 'calendar';
    case 'location':
    case 'device':
      return 'location';
    case 'ssh':
      return 'ssh';
    case 'http':
      return 'web';
    case 'files':
      return 'workspace';
    case 'library':
      return 'library';
    case 'office':
      return 'office';
    case 'agents':
      return 'agents';
    case 'mcp':
      return 'mcp';
    case 'skills':
      return 'skills';
    case 'images':
      return 'images';
  }
}

export const BUILT_IN_TOOL_DESCRIPTORS: BuiltInToolDescriptor[] = [
  // Calendar
  describe('calendar_list_collections', 'auto', {
    effect: 'read',
    permissionScopes: ['calendar.read'],
    platforms: ['ios', 'android'],
  }),
  describe('calendar_list_events', 'auto', {
    effect: 'read',
    permissionScopes: ['calendar.read'],
    platforms: ['ios', 'android'],
  }),
  describe('calendar_create_event', 'ask', {
    permissionScopes: ['calendar.write'],
    platforms: ['ios', 'android'],
  }),
  describe('calendar_update_event', 'ask', {
    permissionScopes: ['calendar.write'],
    platforms: ['ios', 'android'],
  }),
  describe('calendar_delete_event', 'ask', {
    autoApprovalEligible: false,
    permissionScopes: ['calendar.write'],
    platforms: ['ios', 'android'],
  }),

  // Location
  describe('location_get_current', 'ask', {
    effect: 'read',
    permissionScopes: ['location.read'],
    platforms: ['ios', 'android'],
  }),

  // SSH
  describe('ssh_execute', 'auto', { platforms: ['ios', 'android'] }),
  describe('ssh_list_files', 'auto', {
    effect: 'read',
    platforms: ['ios', 'android'],
  }),
  describe('ssh_read_file', 'auto', {
    effect: 'read',
    platforms: ['ios', 'android'],
  }),
  describe('ssh_write_file', 'auto', { platforms: ['ios', 'android'] }),
  describe('ssh_download_file', 'auto', {
    platforms: ['ios', 'android'],
  }),
  describe('ssh_upload_file', 'auto', {
    platforms: ['ios', 'android'],
  }),

  // HTTP / Web
  describe('http_request', 'ask', { autoApprovalEligible: false }),
  describe('web_search', 'auto', { effect: 'read' }),
  describe('web_fetch', 'auto', { effect: 'read' }),

  // Images
  describe('generate_image', 'auto'),

  // Files & Workspace
  describe('list_workspace', 'auto', { effect: 'read' }),
  describe('find_workspace_files', 'auto', { effect: 'read' }),
  describe('create_workspace_folder', 'auto'),
  describe('read_file', 'auto', { effect: 'read' }),
  describe('write_file', 'auto'),
  describe('edit_file', 'auto'),

  // Library
  describe('library_search_files', 'auto', { effect: 'read' }),
  describe('library_read_file', 'auto', { effect: 'read' }),
  describe('library_list_folders', 'auto', { effect: 'read' }),
  describe('library_create_folder', 'auto'),
  describe('library_move_item', 'ask'),
  describe('library_rename_item', 'ask'),
  describe('library_trash_item', 'ask', { autoApprovalEligible: false }),
  describe('library_list_trash', 'auto', { effect: 'read' }),
  describe('library_restore_item', 'ask'),

  // Office
  describe('inspect_office_file', 'auto', { effect: 'read' }),
  describe('read_office_content', 'auto', { effect: 'read' }),
  describe('create_document', 'auto'),
  describe('create_workbook', 'auto'),
  describe('create_presentation', 'auto'),
  describe('edit_document', 'auto'),
  describe('edit_workbook', 'auto'),
  describe('edit_presentation', 'auto'),
  describe('run_office_script', 'auto'),

  // Agents
  describe('agent_list', 'auto', { effect: 'read' }),
  describe('agent_get', 'auto', { effect: 'read' }),
  describe('agent_create', 'ask'),
  describe('agent_update', 'ask'),
  describe('agent_set_avatar', 'ask'),
  describe('agent_list_mcp_servers', 'auto', { effect: 'read' }),
  describe('agent_set_mcp_binding', 'ask'),

  // MCP management
  describe('mcp_list_servers', 'auto', { effect: 'read' }),
  describe('mcp_get_server', 'auto', { effect: 'read' }),
  describe('mcp_create_server', 'ask'),
  describe('mcp_update_server', 'ask'),

  // Skills
  describe('list_installed_skills', 'auto', { effect: 'read' }),
  describe('find_skills', 'auto', { effect: 'read' }),
  describe('install_skill', 'ask', { autoApprovalEligible: false }),
  describe('create_skill', 'ask', { autoApprovalEligible: false }),
  describe('adapt_skill', 'ask', { autoApprovalEligible: false }),
];

export const BUILT_IN_TOOL_DESCRIPTOR_MAP: ReadonlyMap<string, BuiltInToolDescriptor> = new Map(
  BUILT_IN_TOOL_DESCRIPTORS.map((descriptor) => [descriptor.capabilityId, descriptor]),
);

const BUILT_IN_TOOL_DESCRIPTOR_BY_TOOL_NAME: ReadonlyMap<string, BuiltInToolDescriptor> = new Map(
  BUILT_IN_TOOL_DESCRIPTORS.map((descriptor) => [descriptor.toolName, descriptor]),
);

export function getBuiltInToolDescriptor(id: string): BuiltInToolDescriptor | undefined {
  return BUILT_IN_TOOL_DESCRIPTOR_MAP.get(id) ?? BUILT_IN_TOOL_DESCRIPTOR_BY_TOOL_NAME.get(id);
}

export function getBuiltInToolsForGroup(group: BuiltInToolGroup): BuiltInToolDescriptor[] {
  return BUILT_IN_TOOL_DESCRIPTORS.filter((descriptor) => descriptor.group === group);
}
