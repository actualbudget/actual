import { Budget } from './budget';

export type FileState =
  | 'local'
  | 'remote'
  | 'synced'
  | 'detached'
  | 'broken'
  | 'unknown';

export type LocalFile = Omit<Budget, 'cloudFileId' | 'groupId'> & {
  state: 'local';
};
export type SyncableLocalFile = Budget & {
  cloudFileId: string;
  groupId: string;
  state: 'broken' | 'unknown';
};
export type SyncedLocalFile = Budget & {
  encryptKeyId?: string;
  hasKey: boolean;
  state: 'synced' | 'detached';
};
export type RemoteFile = {
  cloudFileId: string;
  groupId: string;
  name: string;
  enccryptKeyId?: string;
  hasKey: boolean;
  state: 'remote';
};

export type File = LocalFile | SyncableLocalFile | SyncedLocalFile | RemoteFile;
