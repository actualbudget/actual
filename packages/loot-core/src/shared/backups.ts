import * as d from 'date-fns';

import * as monthUtils from './months';

export const MAX_BACKUPS = 10;
export const MAX_BACKUPS_TODAY = 3;
export const MAX_BACKUPS_PER_PAST_DAY = 1;
export const BACKUP_FILENAME_DATE_FORMAT = 'yyyy-MM-dd_HH-mm-ss';

export type BackupEntry = { id: string; date: Date };

/**
 * Decides which backups to delete. Keeps up to 3 backups for the current
 * day (so fine-grained edits are kept around), one backup per earlier day,
 * and at most 10 backups in total. Input order does not matter; the newest
 * backups win. Returns the ids of the backups to remove.
 */
export function selectBackupsToRemove(
  backups: BackupEntry[],
  today: string = monthUtils.currentDay(),
): string[] {
  const sorted = [...backups].sort(
    (backupA, backupB) => backupB.date.getTime() - backupA.date.getTime(),
  );

  const byDay = new Map<string, BackupEntry[]>();
  for (const backup of sorted) {
    const day = d.format(backup.date, 'yyyy-MM-dd');
    const dayBackups = byDay.get(day) ?? [];
    dayBackups.push(backup);
    byDay.set(day, dayBackups);
  }

  const removed: string[] = [];
  for (const [day, dayBackups] of byDay) {
    const keep = day === today ? MAX_BACKUPS_TODAY : MAX_BACKUPS_PER_PAST_DAY;
    for (const backup of dayBackups.slice(keep)) {
      removed.push(backup.id);
    }
  }

  const remaining = sorted.filter(backup => !removed.includes(backup.id));
  return removed.concat(remaining.slice(MAX_BACKUPS).map(backup => backup.id));
}

export function makeBackupFilename(date: Date): string {
  return `${d.format(date, BACKUP_FILENAME_DATE_FORMAT)}.zip`;
}

/**
 * Parses a filename produced by `makeBackupFilename`. Returns null for
 * anything else (including the Electron "latest" sqlite marker).
 */
export function parseBackupFilename(name: string): Date | null {
  const match = name.match(/^(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})\.zip$/);
  if (!match) {
    return null;
  }
  const parsed = d.parse(match[1], BACKUP_FILENAME_DATE_FORMAT, new Date());
  return d.isValid(parsed) ? parsed : null;
}
