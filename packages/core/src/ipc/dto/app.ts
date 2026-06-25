export type UpdateState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'unavailable'
  | 'error';

export interface AppUpdateStatusDto {
  readonly state: UpdateState;
  readonly version?: string;
  readonly message?: string;
  readonly progress?: number;
}
