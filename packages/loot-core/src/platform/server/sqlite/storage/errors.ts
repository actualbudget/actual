// Errors the storage layer raises while opening a budget's database. They
// carry stable codes so the budget loader can map them to user messages.
// Kept free of wasm imports so every platform module can re-export them.

export class BudgetInUseError extends Error {
  code = 'budget-in-use' as const;

  constructor(path: string) {
    super(`The database at ${path} is open in another tab or window`);
    this.name = 'BudgetInUseError';
  }
}

export class StorageMigrationError extends Error {
  code = 'storage-migration-failed' as const;

  constructor(path: string, cause: unknown) {
    super(`Moving the database at ${path} to the new storage failed`);
    this.name = 'StorageMigrationError';
    this.cause = cause;
  }
}

export class StorageUnavailableError extends Error {
  code = 'storage-unavailable' as const;

  constructor(reason: string) {
    super(`No usable browser storage: ${reason}`);
    this.name = 'StorageUnavailableError';
  }
}
