import { UsersWithAccess } from '../server/cloud-storage';

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
  hasKey: boolean;
};

export type SyncableLocalFile = Budget & {
  cloudFileId: string;
  groupId: string;
  state: 'broken' | 'unknown';
  hasKey: boolean;
  owner: string;
};

export type SyncedLocalFile = Budget & {
  cloudFileId: string;
  groupId: string;
  encryptKeyId?: string;
  hasKey: boolean;
  state: 'synced' | 'detached';
  owner: string;
  usersWithAccess: UsersWithAccess[];
};

export type RemoteFile = {
  cloudFileId: string;
  groupId: string;
  name: string;
  encryptKeyId?: string;
  hasKey: boolean;
  state: 'remote';
  owner: string;
  usersWithAccess: UsersWithAccess[];
};

export type File = LocalFile | SyncableLocalFile | SyncedLocalFile | RemoteFile;
