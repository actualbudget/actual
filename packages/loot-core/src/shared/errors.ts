// @ts-strict-ignore
import { t } from 'i18next';
export function getUploadError({
  reason,
  meta,
}: {
  reason: string;
  meta?: unknown;
}) {
  switch (reason) {
    case 'unauthorized':
      return t('You are not logged in.');
    case 'encrypt-failure':
      if ((meta as { isMissingKey: boolean }).isMissingKey) {
        return t(
          'Encrypting your file failed because you are missing your encryption key. Create your key in the next step.',
        );
      }
      return t(
        'Encrypting the file failed. You have the correct key so this is an internal bug. To fix this, generate a new key in the next step.',
      );
    case 'file-has-reset':
      // Something really weird happened - during reset a sanity
      // check on the server failed. The user just needs to
      // restart the whole process.
      return t(
        'Something went wrong while resetting your file. Please try again.',
      );
    case 'file-has-new-key':
      return t(
        'Unable to encrypt your data because you are missing the key. Create the latest key in the next step.',
      );
    case 'network':
      return t('Uploading the file failed. Check your network connection.');
    default:
      return t(
        'An internal error occurred, sorry! Visit https://actualbudget.org/contact/ for support. (ref: {{reason}})',
        { reason },
      );
  }
}

export function getDownloadError({
  reason,
  meta,
  fileName,
}: {
  reason: string;
  meta?: unknown;
  fileName?: string;
}) {
  switch (reason) {
    case 'network':
    case 'download-failure':
      return t('Downloading the file failed. Check your network connection.');
    case 'not-zip-file':
    case 'invalid-zip-file':
    case 'invalid-meta-file':
      return t(
        'Downloaded file is invalid, sorry! Visit https://actualbudget.org/contact/ for support.',
      );
    case 'decrypt-failure':
      return (
        'Unable to decrypt file ' +
        (fileName || '(unknown)') +
        '. To change your key, first ' +
        'download this file with the proper password.'
      );

    case 'out-of-sync-migrations':
      return t(
        'This budget cannot be loaded with this version of the app. Make sure the app is up-to-date.',
      );

    default:
      const info =
        meta && typeof meta === 'object' && 'fileId' in meta && meta.fileId
          ? `, fileId: ${meta.fileId}`
          : '';
      return t(
        'Something went wrong trying to download that file, sorry! Visit https://actualbudget.org/contact/ for support. reason: {{reason}}{{info}}',
        { reason, info },
      );
  }
}

export function getCreateKeyError(error) {
  return getUploadError(error);
}

export function getTestKeyError({ reason }) {
  switch (reason) {
    case 'network':
      return t(
        'Unable to connect to the server. We need to access the server to get some information about your keys.',
      );
    case 'old-key-style':
      return t(
        'This file is encrypted with an old unsupported key style. Recreate the key on a device where the file is available, or use an older version of Actual to download it.',
      );
    case 'decrypt-failure':
      return t('Unable to decrypt file with this password. Please try again.');
    default:
      return t(
        'Something went wrong trying to create a key, sorry! Visit https://actualbudget.org/contact/ for support.',
      );
  }
}

export function getSyncError(error, id) {
  if (error === 'out-of-sync-migrations' || error === 'out-of-sync-data') {
    return t('This budget cannot be loaded with this version of the app.');
  } else if (error === 'budget-not-found') {
    return t(
      'Budget “{{id}}” not found. Check the ID of your budget in the Advanced section of the settings page.',
      { id },
    );
  } else {
    return t('We had an unknown problem opening “{{id}}”.', { id });
  }
}

export function getBankSyncError(error: { message?: string }) {
  return error.message || t('We had an unknown problem syncing the account.');
}

export class LazyLoadFailedError extends Error {
  type = 'app-init-failure';
  meta = {};

  constructor(name: string, cause: unknown) {
    super(`Error: failed loading lazy-loaded module ${name}`);
    this.meta = { name };
    this.cause = cause;
  }
}

export function getUserAccessErrors(reason: string) {
  switch (reason) {
    case 'unauthorized':
      return t('You are not logged in.');
    case 'token-expired':
      return t('Login expired, please log in again.');
    case 'user-cant-be-empty':
      return t('Please select a user.');
    case 'invalid-file-id':
      return t('This file is invalid.');
    case 'file-denied':
      return t('You don`t have permissions over this file.');
    case 'user-already-have-access':
      return t('User already has access.');
    default:
      return t(
        'An internal error occurred, sorry! Visit https://actualbudget.org/contact/ for support. (ref: {{reason}})',
        { reason },
      );
  }
}

export function getSecretsError(error: string, reason: string) {
  switch (reason) {
    case 'unauthorized':
      return t('You are not logged in.');
    case 'not-admin':
      return t('You have to be admin to set secrets');
    default:
      return error;
  }
}

export function getOpenIdErrors(reason: string) {
  switch (reason) {
    case 'unauthorized':
      return t('You are not logged in.');
    case 'configuration-error':
      return t('This configuration is not valid. Please check it again.');
    case 'unable-to-change-file-config-enabled':
      return t(
        'Unable to enable OpenID. Please update the config.json file in this case.',
      );
    default:
      return t(
        'An internal error occurred, sorry! Visit https://actualbudget.org/contact/ for support. (ref: {{reason}})',
        { reason },
      );
  }
}
