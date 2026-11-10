// Errors the storage layer raises while opening a budget's database. The
// budget loader maps them to user-facing error codes. Kept free of wasm
// imports so every platform module can re-export them.

export class BudgetInUseError extends Error {
  constructor(path: string) {
    super(`The database at ${path} is open in another tab or window`);
    this.name = 'BudgetInUseError';
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
