import type { RemoteFile } from '../../server/cloud-storage';
import type { Budget } from '../../types/budget';
import { type File } from '../../types/file';
import * as constants from '../constants';
import type { Action } from '../state-types';
import type { BudgetsState } from '../state-types/budgets';

function sortFiles(arr: File[]) {
  arr.sort((x, y) => {
    const name1 = x.name.toLowerCase();
    const name2 = y.name.toLowerCase();
    let i = name1 < name2 ? -1 : name1 > name2 ? 1 : 0;
    if (i === 0) {
      const xId = x.state === 'remote' ? x.cloudFileId : x.id;
      const yId = x.state === 'remote' ? x.cloudFileId : x.id;
      i = xId < yId ? -1 : xId > yId ? 1 : 0;
    }
    return i;
  });
  return arr;
}

// States of a file:
// 1. local - Only local (not uploaded/synced)
// 2. remote - Unavailable locally, available to download
// 3. synced - Downloaded & synced
// 4. detached - Downloaded but broken group id (reset sync state)
// 5. broken - user shouldn't have access to this file
// 6. unknown - user is offline so can't determine the status
function reconcileFiles(
  localFiles: Budget[],
  remoteFiles: RemoteFile[] | null,
): File[] {
  const reconciled = new Set();

  const files = localFiles.map((localFile): File & { deleted: boolean } => {
    const { cloudFileId, groupId } = localFile;
    if (cloudFileId && groupId) {
      // This is the case where for some reason getting the files from
      // the server failed. We don't want to scare the user, just show
      // an unknown state and tell them it'll be OK once they come
      // back online
      if (remoteFiles == null) {
        return {
          ...localFile,
          cloudFileId,
          groupId,
          deleted: false,
          state: 'unknown',
          hasKey: true,
        };
      }

      const remote = remoteFiles.find(f => localFile.cloudFileId === f.fileId);
      if (remote) {
        // Mark reconciled
        reconciled.add(remote.fileId);

        if (remote.groupId === localFile.groupId) {
          return {
            ...localFile,
            cloudFileId,
            groupId,
            name: remote.name,
            deleted: remote.deleted,
            encryptKeyId: remote.encryptKeyId,
            hasKey: remote.hasKey,
            state: 'synced',
          };
        } else {
          return {
            ...localFile,
            cloudFileId,
            groupId,
            name: remote.name,
            deleted: remote.deleted,
            encryptKeyId: remote.encryptKeyId,
            hasKey: remote.hasKey,
            state: 'detached',
          };
        }
      } else {
        return {
          ...localFile,
          cloudFileId,
          groupId,
          deleted: false,
          state: 'broken',
          hasKey: true,
        };
      }
    } else {
      return { ...localFile, deleted: false, state: 'local', hasKey: true };
    }
  });

  const sorted = sortFiles(
    files
      .concat(
        (remoteFiles || [])
          .filter(f => !reconciled.has(f.fileId))
          .map(f => {
            return {
              cloudFileId: f.fileId,
              groupId: f.groupId,
              name: f.name,
              deleted: f.deleted,
              encryptKeyId: f.encryptKeyId,
              hasKey: f.hasKey,
              state: 'remote',
            };
          }),
      )
      .filter(f => !f.deleted),
  );

  // One last pass to list all the broken (unauthorized) files at the
  // bottom
  return sorted
    .filter(f => f.state !== 'broken')
    .concat(sorted.filter(f => f.state === 'broken'));
}

const initialState: BudgetsState = {
  budgets: [],
  remoteFiles: null,
  allFiles: null,
};

export function update(state = initialState, action: Action): BudgetsState {
  switch (action.type) {
    case constants.SET_BUDGETS:
      return {
        ...state,
        budgets: action.budgets,
        allFiles: reconcileFiles(action.budgets, state.remoteFiles),
      };
    case constants.SET_REMOTE_FILES:
      return {
        ...state,
        remoteFiles: action.files,
        allFiles: reconcileFiles(state.budgets, action.files),
      };
    case constants.SET_ALL_FILES:
      return {
        ...state,
        budgets: action.budgets,
        remoteFiles: action.remoteFiles,
        allFiles: reconcileFiles(action.budgets, action.remoteFiles),
      };
    case constants.SIGN_OUT:
      // If the user logs out, make sure to reset all the files
      return { ...state, allFiles: null };
    default:
  }
  return state;
}
