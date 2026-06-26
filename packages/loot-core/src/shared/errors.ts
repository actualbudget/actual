type ErrorWithMeta = {
  reason: string;
  meta?: unknown;
};

// NOTE: These error formatters are consumed by the headless `@actual-app/api`
// (see `src/server/api.ts`), which has no i18n. They intentionally return
// plain English strings. User-facing, translated equivalents live in the
// desktop-client (`src/util/error.ts`).

function isDatabaseSchemaMismatch(meta?: unknown): boolean {
  if (
    meta &&
    typeof meta === 'object' &&
    'error' in meta &&
    meta.error &&
    typeof meta.error === 'object' &&
    'message' in meta.error &&
    typeof meta.error.message === 'string'
  ) {
    return /no such (column|table)/i.test(meta.error.message);
  }
  return false;
}

function getSchemaMismatchError() {
  return 'This budget could not be loaded because it uses a newer database schema than this version of Actual supports. Make sure you are using the latest version, then try again.';
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
  if (reason === 'invalid-schema' && isDatabaseSchemaMismatch(meta)) {
    return getSchemaMismatchError();
  }

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
      return 'This budget cannot be loaded with this version of the app. Make sure the app is up-to-date.';

    case 'clock-drift':
      return 'Failed to download the budget because your device time differs too much from the server. Please check your device time settings and ensure they are correct.';

    default: {
      const info =
        meta && typeof meta === 'object' && 'fileId' in meta && meta.fileId
          ? `, fileId: ${String(meta.fileId)}`
          : '';
      return `Something went wrong trying to download that file, sorry! Visit https://actualbudget.org/contact/ for support. reason: ${reason}${info}`;
    }
  }
}

export function getTestKeyError({ reason }: ErrorWithMeta) {
  switch (reason) {
    case 'network':
      return 'Unable to connect to the server. We need to access the server to get some information about your keys.';
    case 'old-key-style':
      return 'This file is encrypted with an old unsupported key style. Recreate the key on a device where the file is available, or use an older version of Actual to download it.';
    case 'decrypt-failure':
      return 'Unable to decrypt file with this password. Please try again.';
    default:
      return 'Something went wrong trying to create a key, sorry! Visit https://actualbudget.org/contact/ for support.';
  }
}

export function getSyncError(error: string, id: string, meta?: unknown) {
  if (error === 'out-of-sync-migrations' || error === 'out-of-sync-data') {
    return 'This budget cannot be loaded with this version of the app.';
  } else if (error === 'invalid-schema' && isDatabaseSchemaMismatch(meta)) {
    return getSchemaMismatchError();
  } else if (error === 'budget-not-found') {
    return `Budget "${id}" not found. Check the ID of your budget in the Advanced section of the settings page.`;
  } else if (error === 'clock-drift') {
    return 'Failed to sync because your device time differs too much from the server. Please check your device time settings and ensure they are correct.';
  } else {
    return `We had an unknown problem opening "${id}".`;
  }
}

export function getBankSyncError(error: { message?: string }) {
  return error.message || 'We had an unknown problem syncing the account.';
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
