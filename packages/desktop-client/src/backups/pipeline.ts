// The destination-agnostic backup pipeline: export the open budget, write
// it to the destination, then prune old backups with the same retention
// rule the desktop app uses.

import { send } from '@actual-app/core/platform/client/connection';
import {
  makeBackupFilename,
  selectBackupsToRemove,
} from '@actual-app/core/shared/backups';

import { isAccessLostError } from './types';
import type { BackupDestination, BackupWriteResult } from './types';

export async function runBackupTo(
  destination: BackupDestination,
): Promise<BackupWriteResult> {
  const response = await send('export-budget');
  if ('error' in response || !response.data) {
    return { ok: false, reason: 'export-failed' };
  }

  try {
    await destination.write(makeBackupFilename(new Date()), response.data);

    const entries = await destination.list();
    for (const id of selectBackupsToRemove(entries)) {
      await destination.remove(id);
    }

    return { ok: true, warnings: response.warnings ?? [] };
  } catch (error) {
    if (isAccessLostError(error)) {
      return { ok: false, reason: 'access-lost', error };
    }
    return { ok: false, reason: 'write-failed', error };
  }
}
