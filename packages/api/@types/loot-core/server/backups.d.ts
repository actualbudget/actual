export type Backup = {
    id: string;
    date: string;
} | LatestBackup;
type LatestBackup = {
    id: string;
    date: null;
    isLatest: true;
};
export declare function getAvailableBackups(id: string): Promise<Backup[]>;
export declare function updateBackups(backups: any): Promise<any[]>;
export declare function makeBackup(id: string): Promise<void>;
export declare function loadBackup(id: string, backupId: string): Promise<void>;
export declare function startBackupService(id: string): void;
export declare function stopBackupService(): void;
export {};
