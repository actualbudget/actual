export type Backup =
  | { id: string; date: Date; isLatest?: boolean }
  | LatestBackup;
export type LatestBackup = { id: string; date: null; isLatest: boolean };

export function getAvailableBackups(id: string): Promise<Backup[]>;

export function updateBackups(backups: Backup[]): Promise<Backup[]>;

export function makeBackup(id: string);

/**
 * Removes all backup files associated with the specified budget ID.
 * This function is typically used when deleting a budget to ensure all related backups are also removed.
 * @param {string} id - The ID of the budget whose backups should be removed.
 * @returns {Promise<boolean>} A promise that resolves to true if all backups were successfully removed, false otherwise.
 */
export function removeAllBackups(id: string): Promise<boolean>;

export function loadBackup(id: string, backupId: string);

export function startBackupService(id: string);

export function stopBackupService(): void;
