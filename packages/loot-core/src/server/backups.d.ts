export type Backup = { id: string; date: Date } | LatestBackup;
export type LatestBackup = { id: string; date: null; isLatest: true };

export async function getAvailableBackups(id: string): Promise<Backup[]>;

export async function updateBackups(backups: Backup[]): Promise<Backup[]>;

export async function makeBackup(id: string);

/**
 * Removes all backup files associated with the specified budget ID.
 * This function is typically used when deleting a budget to ensure all related backups are also removed.
 * @param {string} id - The ID of the budget whose backups should be removed.
 * @returns {Promise<boolean>} A promise that resolves to true if all backups were successfully removed, false otherwise.
 */
export async function removeAllBackups(id: string): Promise<boolean>;

export async function loadBackup(id: string, backupId: string);

export function startBackupService(id: string);

export function stopBackupService();
