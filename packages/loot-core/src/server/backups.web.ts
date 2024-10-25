// @ts-strict-ignore
import { type Database } from '@jlongster/sql.js';
import * as dateFns from 'date-fns';

import * as connection from '../platform/server/connection';
import * as fs from '../platform/server/fs';
import * as sqlite from '../platform/server/sqlite';
import * as monthUtils from '../shared/months';

import * as cloudStorage from './cloud-storage';
import * as prefs from './prefs';

// A special backup that represents the latest version of the db that
// can be reverted to after loading a backup
const LATEST_BACKUP_FILENAME = 'db.latest.sqlite';
let serviceInterval = null;

export type Backup = { id: string; date: string } | LatestBackup;
type LatestBackup = { id: string; date: null; isLatest: true };
type BackupWithDate = { id: string; date: Date };

async function getBackups(id: string): Promise<BackupWithDate[]> {
  const budgetDir = fs.getBudgetDir(id);

  let paths = [];
  paths = await fs.listDir(budgetDir);
  paths = paths.filter(file => file.match(/db\.backup\.sqlite$/));

  const backups = await Promise.all(
    paths.map(async path => {
      const dateString = path.substring(0, 17); // 'yyyyMMddHHmmssSSS'
      const date = dateFns.parse(dateString, 'yyyyMMddHHmmssSSS', new Date());

      if (date.toString() === 'Invalid Date') return null;

      return {
        id: path,
        date,
      };
    }),
  );

  const validBackups = backups.filter(backup => backup !== null);

  validBackups.sort((b1, b2) => b2.date.getTime() - b1.date.getTime());

  return validBackups;
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
    await fs.removeFile(fs.join(budgetDir, LATEST_BACKUP_FILENAME));
  }

  const currentTime = new Date();
  const backupId = `${dateFns.format(currentTime, 'yyyyMMddHHmmssSSS')}-db.backup.sqlite`;

  await fs.copyFile(
    fs.join(budgetDir, 'db.sqlite'),
    fs.join(budgetDir, backupId),
  );

  // Remove all the messages from the backup
  let db: Database;
  try {
    db = await sqlite.openDatabase(fs.join(budgetDir, backupId));
    await sqlite.runQuery(db, 'DELETE FROM messages_crdt');
    await sqlite.runQuery(db, 'DELETE FROM messages_clock');
  } catch (error) {
    console.error('Error cleaning up backup messages:', error);
  } finally {
    if (db) {
      sqlite.closeDatabase(db);
    }
  }

  const toRemove = await updateBackups(await getBackups(id));
  for (const id of toRemove) {
    await fs.removeFile(fs.join(budgetDir, id));
  }

  connection.send('backups-updated', await getAvailableBackups(id));
}

/**
 * Removes all backup files associated with the specified budget ID.
 * This function is typically used when deleting a budget to ensure all related backups are also removed.
 * @param {string} id - The ID of the budget whose backups should be removed.
 * @returns {Promise<boolean>} A promise that resolves to true if all backups were successfully removed, false otherwise.
 */
export async function removeAllBackups(id: string): Promise<boolean> {
  const budgetDir = fs.getBudgetDir(id);
  const toRemove = await getAvailableBackups(id);
  let success = true;

  for (const item of toRemove) {
    try {
      await fs.removeFile(fs.join(budgetDir, item.id));
    } catch (error) {
      console.error(`Failed to remove backup ${item.id}:`, error);
      success = false;
    }
  }

  return success;
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
    console.log('Reverting backup');

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
    } catch (error) {
      console.error('Error uploading to cloud storage:', error);
    }
    prefs.unloadPrefs();
  } else {
    console.log('Loading backup', backupId);

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
    } catch (error) {
      console.error('Error uploading to cloud storage:', error);
    }

    prefs.unloadPrefs();

    await fs.copyFile(
      fs.join(budgetDir, backupId),
      fs.join(budgetDir, 'db.sqlite'),
    );
  }
}

export function startBackupService(id: string) {
  if (serviceInterval) {
    clearInterval(serviceInterval);
  }

  // Make a backup every 15 minutes
  serviceInterval = setInterval(
    async () => {
      try {
        console.log('Making backup');
        await makeBackup(id);
      } catch (error) {
        console.error('Error making backup:', error);
      }
    },
    1000 * 60 * 15,
  );
}

export function stopBackupService() {
  clearInterval(serviceInterval);
  serviceInterval = null;
}
