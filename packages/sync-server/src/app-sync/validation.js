// This is a version representing the internal format of sync
// messages. When this changes, all sync files need to be reset. We
// will check this version when syncing and notify the user if they
// need to reset.
const SYNC_FORMAT_VERSION = 2;

const validateSyncedFile = (groupId, keyId, currentFile) => {
  if (
    currentFile.syncVersion == null ||
    currentFile.syncVersion < SYNC_FORMAT_VERSION
  ) {
    return 'file-old-version';
  }

  // When resetting sync state, something went wrong. There is no
  // group id and it's awaiting a file to be uploaded.
  if (currentFile.groupId == null) {
    return 'file-needs-upload';
  }

  // Check to make sure the uploaded file is valid and has been
  // encrypted with the same key it is registered with (this might
  // be wrong if there was an error during the key creation
  // process)
  let uploadedKeyId = currentFile.encryptMeta
    ? JSON.parse(currentFile.encryptMeta).keyId
    : null;
  if (uploadedKeyId !== currentFile.encryptKeyId) {
    return 'file-key-mismatch';
  }

  // The changes being synced are part of an old group, which
  // means the file has been reset. User needs to re-download.
  if (groupId !== currentFile.groupId) {
    return 'file-has-reset';
  }

  // The data is encrypted with a different key which is
  // unacceptable. We can't accept these changes. Reject them and
  // tell the user that they need to generate the correct key
  // (which necessitates a sync reset so they need to re-download).
  if (keyId !== currentFile.encryptKeyId) {
    return 'file-has-new-key';
  }

  return null;
};

const validateUploadedFile = (groupId, keyId, currentFile) => {
  if (!currentFile) {
    // File is new, so no need to validate
    return null;
  }
  // The uploading file is part of an old group, so reject
  // it. All of its internal sync state is invalid because its
  // old. The sync state has been reset, so user needs to
  // either reset again or download from the current group.
  if (groupId !== currentFile.groupId) {
    return 'file-has-reset';
  }

  // The key that the file is encrypted with is different than
  // the current registered key. All data must always be
  // encrypted with the registered key for consistency. Key
  // changes always necessitate a sync reset, which means this
  // upload is trying to overwrite another reset. That might
  // be be fine, but since we definitely cannot accept a file
  // encrypted with the wrong key, we bail and suggest the
  // user download the latest file.
  if (keyId !== currentFile.encryptKeyId) {
    return 'file-has-new-key';
  }

  return null;
};

export { validateSyncedFile, validateUploadedFile };
