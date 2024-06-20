import type { RemoteFile } from '../../server/cloud-storage';
import type { Budget } from '../../types/budget';
import type { File } from '../../types/file';
import type * as constants from '../constants';

export type BudgetsState = {
  budgets: Budget[];
  remoteFiles: RemoteFile[] | null;
  allFiles: File[] | null;
};

export type SetBudgetsAction = {
  type: typeof constants.SET_BUDGETS;
  budgets: Budget[];
};

export type SetRemoteFilesAction = {
  type: typeof constants.SET_REMOTE_FILES;
  files: RemoteFile[];
};

export type SetAllFilesAction = {
  type: typeof constants.SET_ALL_FILES;
  budgets: Budget[];
  remoteFiles: RemoteFile[];
};

export type SignOutAction = {
  type: typeof constants.SIGN_OUT;
};

export type BudgetsActions =
  | SetBudgetsAction
  | SetRemoteFilesAction
  | SetAllFilesAction
  | SignOutAction;
