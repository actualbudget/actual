import type { Database } from '@jlongster/sql.js';
// @ts-strict-ignore
import AdmZip from 'adm-zip';
import * as dateFns from 'date-fns';

import * as connection from '#platform/server/connection';
import * as fs from '#platform/server/fs';
import { logger } from '#platform/server/log';
import * as sqlite from '#platform/server/sqlite';
import * as cloudStorage from '#server/cloud-storage';
import * as prefs from '#server/prefs';
import * as monthUtils from '#shared/months';

// A special backup that represents the latest version of the db that
// can be reverted to after loading a backup
const LATEST_BACKUP_FILENAME = 'db.latest.sqlite';
let serviceInterval = null;

export type Backup = { id: string; date: string } | LatestBackup;
type LatestBackup = { id: string; date: null; isLatest: true };
type BackupWithDate = { id: string; date: Date };

async function getBackups(id: string): Promise<BackupWithDate[]> {
  const budgetDir = fs.getBudgetDir(id);
  const backupDir = fs.join(budgetDir, 'backups');

  let paths = [];
  if (await fs.exists(backupDir)) {
    paths = await fs.listDir(backupDir);
    paths = paths.filter(file => file.match(/\.zip$/));
  }

  const backups = await Promise.all(
    paths.map(async path => {
      const mtime = await fs.getModifiedTime(fs.join(backupDir, path));
      return {
        id: path,
        date: new Date(mtime),
      };
    }),
  );

  backups.sort((b1, b2) => {
    if (b1.date < b2.date) {
      return 1;
    } else if (b1.date > b2.date) {
      return -1;
    }
    return 0;
  });

  return backups;
}

async function getLatestBackup(id: string): Promise<LatestBackup | null> {
  const budgetDir = fs.getBudgetDir(id);
  if (await fs.exists(fs.join(budgetDir, LATEST_BACKUP_FILENAME))) {
    return {
      id: LATEST_BACKUP_FILENAME,
      date: null,
      isLatest: true,
    };
  }
  return null;
}

export async function getAvailableBackups(id: string): Promise<Backup[]> {
  const backups = await getBackups(id);

  const latestBackup = await getLatestBackup(id);
  if (latestBackup) {
    backups.unshift(latestBackup);
  }

  return backups.map(backup => ({
    ...backup,
    date: backup.date ? dateFns.format(backup.date, 'yyyy-MM-dd H:mm') : null,
  }));
}

export async function updateBackups(backups) {
  const byDay = backups.reduce((groups, backup) => {
    const day = dateFns.format(backup.date, 'yyyy-MM-dd');
    groups[day] = groups[day] || [];
    groups[day].push(backup);
    return groups;
  }, {});

  const removed = [];
  for (const day of Object.keys(byDay)) {
    const dayBackups = byDay[day];
    const isToday = day === monthUtils.currentDay();
    // Allow 3 backups of the current day (so fine-grained edits are
    // kept around). Otherwise only keep around one backup per day.
    // And only keep a total of 10 backups.
    for (const backup of dayBackups.slice(isToday ? 3 : 1)) {
      removed.push(backup.id);
    }
  }

  // Get the list of remaining backups and only keep the latest 10
  const currentBackups = backups.filter(backup => !removed.includes(backup.id));
  return removed.concat(currentBackups.slice(10).map(backup => backup.id));
}

export async function makeBackup(id: string) {
  const budgetDir = fs.getBudgetDir(id);

  // When making a backup, we no longer consider the user to be
  // viewing any backups. If there exists a "latest backup" we should
  // delete it and consider whatever is current as the latest
  if (await fs.exists(fs.join(budgetDir, LATEST_BACKUP_FILENAME))) {
    await fs.removeFile(fs.join(fs.getBudgetDir(id), LATEST_BACKUP_FILENAME));
  }

  const backupId = `${dateFns.format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.zip`;
  const backupPath = fs.join(budgetDir, 'backups', backupId);

  if (!(await fs.exists(fs.join(budgetDir, 'backups')))) {
    await fs.mkdir(fs.join(budgetDir, 'backups'));
  }

  // Copy db to a temp path so we can clean CRDT messages before zipping
  const tempDbPath = fs.join(
    budgetDir,
    'backups',
    `db.${Date.now()}.sqlite.tmp`,
  );

  await fs.copyFile(fs.join(budgetDir, 'db.sqlite'), tempDbPath);

  let db: Database | undefined;

  try {
    // Remove all the messages from the backup
    db = await sqlite.openDatabase(tempDbPath);
    sqlite.runQuery(db, 'DELETE FROM messages_crdt');
    sqlite.runQuery(db, 'DELETE FROM messages_clock');
    // Zip up the cleaned db and metadata into a single backup file
    const zip = new AdmZip();
    zip.addLocalFile(tempDbPath, '', 'db.sqlite');
    zip.addLocalFile(fs.join(budgetDir, 'metadata.json'));
    zip.writeZip(backupPath);
  } finally {
    if (db) {
      sqlite.closeDatabase(db);
    }
    if (await fs.exists(tempDbPath)) {
      await fs.removeFile(tempDbPath);
    }
  }

  const toRemove = await updateBackups(await getBackups(id));
  for (const id of toRemove) {
    await fs.removeFile(fs.join(budgetDir, 'backups', id));
  }

  connection.send('backups-updated', await getAvailableBackups(id));
}

export async function loadBackup(id: string, backupId: string) {
  const budgetDir = fs.getBudgetDir(id);

  if (!(await fs.exists(fs.join(budgetDir, LATEST_BACKUP_FILENAME)))) {
    // If this is the first time we're loading a backup, save the
    // current version so the user can easily revert back to it
    await fs.copyFile(
      fs.join(budgetDir, 'db.sqlite'),
      fs.join(budgetDir, LATEST_BACKUP_FILENAME),
    );

    await fs.copyFile(
      fs.join(budgetDir, 'metadata.json'),
      fs.join(budgetDir, 'metadata.latest.json'),
    );

    // Restart the backup service to make sure the user has the full
    // amount of time to figure out which one they want
    stopBackupService();
    startBackupService(id);

    await prefs.loadPrefs(id);
  }

  if (backupId === LATEST_BACKUP_FILENAME) {
    logger.log('Reverting backup');

    // If reverting back to the latest, copy and delete the latest
    // backup
    await fs.copyFile(
      fs.join(budgetDir, LATEST_BACKUP_FILENAME),
      fs.join(budgetDir, 'db.sqlite'),
    );
    await fs.copyFile(
      fs.join(budgetDir, 'metadata.latest.json'),
      fs.join(budgetDir, 'metadata.json'),
    );
    await fs.removeFile(fs.join(budgetDir, LATEST_BACKUP_FILENAME));
    await fs.removeFile(fs.join(budgetDir, 'metadata.latest.json'));

    // Re-upload the new file
    try {
      await cloudStorage.upload();
    } catch {}
    prefs.unloadPrefs();
  } else {
    logger.log('Loading backup', backupId);

    // This function is only ever called when a budget isn't loaded,
    // so it's safe to load our prefs in. We need to forget about any
    // syncing data if we are loading a backup (the current sync data
    // will be restored if the user reverts to the original version)
    await prefs.loadPrefs(id);
    await prefs.savePrefs({
      groupId: null,
      lastSyncedTimestamp: null,
      lastUploaded: null,
    });

    // Re-upload the new file
    try {
      await cloudStorage.upload();
    } catch {}

    prefs.unloadPrefs();

    const zip = new AdmZip(fs.join(budgetDir, 'backups', backupId));
    zip.extractEntryTo('db.sqlite', budgetDir, false, true);
    zip.extractEntryTo('metadata.json', budgetDir, false, true);
  }
}

export function startBackupService(id: string) {
  if (serviceInterval) {
    clearInterval(serviceInterval);
  }

  // Make a backup every 15 minutes
  serviceInterval = setInterval(
    async () => {
      logger.log('Making backup');
      await makeBackup(id);
    },
    1000 * 60 * 15,
  );
}

export function stopBackupService() {
  clearInterval(serviceInterval);
  serviceInterval = null;
}
