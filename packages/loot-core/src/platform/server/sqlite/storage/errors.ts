import { logger } from '#platform/server/log';

// Errors the storage layer raises while opening a budget's database. The
// budget loader maps them to user-facing error codes. Kept free of wasm
// imports so every platform module can re-export them.

// The user sees one generic message for every cause, so the cause is
// logged here, where the error is raised, for the console to tell them
// apart
export class BudgetInUseError extends Error {
  constructor(path: string, reason: string) {
    super(`The database at ${path} is in use: ${reason}`);
    this.name = 'BudgetInUseError';
    logger.warn('sqlite storage: budget in use', path, reason);
  }
}

export class StorageMigrationError extends Error {
  constructor(path: string, cause: unknown) {
    super(`Moving the database at ${path} to the new storage failed`);
    this.name = 'StorageMigrationError';
    this.cause = cause;
  }
}

export class StorageUnavailableError extends Error {
  constructor(reason: string) {
    super(`No usable browser storage: ${reason}`);
    this.name = 'StorageUnavailableError';
  }
}

// The browser no longer has the bytes of a file its marker says it holds.
// Unlike storage that is out of reach, nothing brings them back
export class StorageLostError extends Error {
  constructor(path: string) {
    super(`The browser no longer holds the database at ${path}`);
    this.name = 'StorageLostError';
  }
}
