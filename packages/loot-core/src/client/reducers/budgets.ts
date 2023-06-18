import * as constants from '../constants';

function sortFiles(arr) {
  arr.sort((x, y) => {
    let name1 = x.name.toLowerCase();
    let name2 = y.name.toLowerCase();
    let i = name1 < name2 ? -1 : name1 > name2 ? 1 : 0;
    if (i === 0) {
      i = x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
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
function reconcileFiles(localFiles, remoteFiles) {
  let reconciled = new Set();

  let files = localFiles.map(localFile => {
    if (localFile.cloudFileId) {
      // This is the case where for some reason getting the files from
      // the server failed. We don't want to scare the user, just show
      // an unknown state and tell them it'll be OK once they come
      // back online

      if (remoteFiles == null) {
        return { ...localFile, state: 'unknown' };
      }

      let remote = remoteFiles.find(f => localFile.cloudFileId === f.fileId);
      if (remote) {
        // Mark reconciled
        reconciled.add(remote.fileId);

        if (remote.groupId === localFile.groupId) {
          return {
            ...localFile,
            name: remote.name,
            deleted: remote.deleted,
            encryptKeyId: remote.encryptKeyId,
            hasKey: remote.hasKey,
            state: 'synced',
          };
        } else {
          return {
            ...localFile,
            name: remote.name,
            deleted: remote.deleted,
            encryptKeyId: remote.encryptKeyId,
            hasKey: remote.hasKey,
            state: 'detached',
          };
        }
      } else {
        return { ...localFile, state: 'broken' };
      }
    } else {
      return { ...localFile, state: 'local' };
    }
  });

  let sorted = sortFiles(
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

const initialState = {
  budgets: [],
  availableImports: [],
  remoteFiles: null,
  allFiles: null,
};

export default function update(state = initialState, action) {
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
        budgets: action.budgetes,
        remoteFiles: action.remoteFiles,
        allFiles: reconcileFiles(action.budgets, action.remoteFiles),
      };
    case constants.SET_AVAILABLE_IMPORTS:
      return {
        ...state,
        availableImports: action.imports,
      };
    case constants.SIGN_OUT:
      // If the user logs out, make sure to reset all the files
      return { ...state, allFiles: null };
    default:
  }
  return state;
}
