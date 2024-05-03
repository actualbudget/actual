// @ts-strict-ignore
export function getUploadError({
  reason,
  meta,
}: {
  reason: string;
  meta?: unknown;
}) {
  switch (reason) {
    case 'unauthorized':
      return 'You are not logged in.';
    case 'encrypt-failure':
      if ((meta as { isMissingKey: boolean }).isMissingKey) {
        return 'Encrypting your file failed because you are missing your encryption key. Create your key in the next step.';
      }
      return 'Encrypting the file failed. You have the correct key so this is an internal bug. To fix this, generate a new key in the next step.';
    case 'file-has-reset':
      // Something really weird happened - during reset a sanity
      // check on the server failed. The user just needs to
      // restart the whole process.
      return 'Something went wrong while resetting your file. Please try again.';
    case 'file-has-new-key':
      return 'Unable to encrypt your data because you are missing the key. Create the latest key in the next step.';
    case 'network':
      return 'Uploading the file failed. Check your network connection.';
    default:
      return `An internal error occurred, sorry! Visit https://actualbudget.org/contact/ for support. (ref: ${reason})`;
  }
}

export function getDownloadError({ reason, meta, fileName }) {
  switch (reason) {
    case 'network':
    case 'download-failure':
      return 'Downloading the file failed. Check your network connection.';
    case 'not-zip-file':
    case 'invalid-zip-file':
    case 'invalid-meta-file':
      return 'Downloaded file is invalid, sorry! Visit https://actualbudget.org/contact/ for support.';
    case 'decrypt-failure':
      return (
        'Unable to decrypt file ' +
        (fileName || '(unknown)') +
        '. To change your key, first ' +
        'download this file with the proper password.'
      );

    case 'out-of-sync-migrations':
      return (
        'This budget cannot be loaded with this version of the app. ' +
        'Make sure the app is up-to-date.'
      );

    default:
      const info = meta && meta.fileId ? `, fileId: ${meta.fileId}` : '';
      return (
        'Something went wrong trying to download that file, sorry! ' +
        'Visit https://actualbudget.org/contact/ for support. ' +
        `(reason: ${reason}${info})`
      );
  }
}

export function getCreateKeyError(error) {
  return getUploadError(error);
}

export function getTestKeyError({ reason }) {
  switch (reason) {
    case 'network':
      return 'Unable to connect to the server. We need to access the server to get some information about your keys.';
    case 'old-key-style':
      return (
        'This file is encrypted with an old unsupported key style. Recreate the key ' +
        'on a device where the file is available, or use an older version of Actual to download ' +
        'it.'
      );
    case 'decrypt-failure':
      return 'Unable to decrypt file with this password. Please try again.';
    default:
      return 'Something went wrong trying to create a key, sorry! Visit https://actualbudget.org/contact/ for support.';
  }
}

export function getSyncError(error, id) {
  if (error === 'out-of-sync-migrations' || error === 'out-of-sync-data') {
    return 'This budget cannot be loaded with this version of the app.';
  } else if (error === 'budget-not-found') {
    return `Budget “${id}” not found. Check the id of your budget in the Advanced section of the settings page.`;
  } else {
    return `We had an unknown problem opening “${id}”.`;
  }
}

export class LazyLoadFailedError extends Error {
  type = 'app-init-failure';
  meta = {};

  constructor(name: string) {
    super(`Error: failed loading lazy-loaded module ${name}`);
    this.meta = { name };
  }
}
