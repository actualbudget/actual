import { Database } from 'better-sqlite3';
export declare function withMigrationsDir(dir: string, func: () => Promise<void>): Promise<void>;
export declare function getMigrationsDir(): string;
export declare function getUpMigration(id: any, names: any): any;
export declare function getAppliedMigrations(db: Database): Promise<number[]>;
export declare function getMigrationList(migrationsDir: string): Promise<string[]>;
export declare function getPending(appliedIds: number[], all: string[]): string[];
export declare function applyMigration(db: Database, name: string, migrationsDir: string): Promise<void>;
export declare function migrate(db: Database): Promise<string[]>;
