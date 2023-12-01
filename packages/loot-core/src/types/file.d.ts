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
  cloudFileId: string;
  groupId: string;
  encryptKeyId?: string;
  hasKey: boolean;
  state: 'synced' | 'detached';
};
export type RemoteFile = {
  id?: string;
  cloudFileId: string;
  groupId: string;
  name: string;
  enccryptKeyId?: string;
  hasKey: boolean;
  state: 'remote';
};

export function isLocalFile(file: File): file is LocalFile {
  return file.state === 'local';
}

export type File = LocalFile | SyncableLocalFile | SyncedLocalFile | RemoteFile;
