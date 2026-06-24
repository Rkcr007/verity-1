import type {
  CreateProjectInput,
  Project,
  ProjectSettings,
  WorkspaceId,
} from '../index.js';

/**
 * CommandMap (resolution P-01) — the closed, typed catalog of request/response
 * IPC commands. The preload bridge exposes ONLY these channels; the renderer
 * cannot invoke anything outside this map.
 *
 * EPIC 0 seeds the `app:*`, `project:*`, and `settings:*` commands. Later epics
 * extend this map (semantic:*, execution:*, git:*, intelligence:*) without
 * changing the IPC infrastructure.
 */
export interface CommandMap {
  'app:ping': {
    request: void;
    response: { pong: true; version: string };
  };
  'project:create': {
    request: CreateProjectInput;
    response: Project;
  };
  'project:list': {
    request: void;
    response: Project[];
  };
  'project:get': {
    request: { projectId: WorkspaceId };
    response: Project;
  };
  'project:open': {
    request: { projectId: WorkspaceId };
    response: Project;
  };
  'settings:get': {
    request: { projectId: WorkspaceId };
    response: ProjectSettings;
  };
  'settings:update': {
    request: { projectId: WorkspaceId; settings: ProjectSettings };
    response: ProjectSettings;
  };
}

export type CommandChannel = keyof CommandMap;
export type CommandRequest<C extends CommandChannel> = CommandMap[C]['request'];
export type CommandResponse<C extends CommandChannel> = CommandMap[C]['response'];

export const COMMAND_CHANNELS = [
  'app:ping',
  'project:create',
  'project:list',
  'project:get',
  'project:open',
  'settings:get',
  'settings:update',
] as const satisfies readonly CommandChannel[];
