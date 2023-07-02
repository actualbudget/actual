import { Budget } from './budget';

export type FileState =
  | 'local'
  | 'remote'
  | 'synced'
  | 'detached'
  | 'broken'
  | 'unknown';

type LocalFile = Omit<Budget, 'cloudFileId' | 'groupId'> & { state: 'local' };
type SyncableLocalFile = Budget & {
  cloudFileId: string;
  groupId: string;
  state: 'broken' | 'unknown';
};
type SyncedLocalFile = Budget & {
  encryptKeyId?: string;
  hasKey: boolean;
  state: 'synced' | 'detached';
};
type RemoteFile = {
  cloudFileId: string;
  groupId: string;
  name: string;
  enccryptKeyId?: string;
  hasKey: boolean;
  state: 'remote';
};

export type File = LocalFile | SyncableLocalFile | SyncedLocalFile | RemoteFile;
