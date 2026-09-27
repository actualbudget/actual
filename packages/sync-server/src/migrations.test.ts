import { describe, expect, it, vi } from 'vitest';

import { loadMigrationModules } from './migrations';

const migrationModule = {
  up: vi.fn(),
  down: vi.fn(),
};

describe('migrations', () => {
  it('preserves the legacy JavaScript title for a TypeScript migration', async () => {
    const migrations = await loadMigrationModules({
      '../migrations/1694360000000-create-folders.ts': async () =>
        migrationModule,
    });

    expect(Object.keys(migrations)).toEqual([
      '1694360000000-create-folders.js',
    ]);
  });

  it('rejects duplicate migration titles after normalization', async () => {
    const loader = async () => migrationModule;

    await expect(
      loadMigrationModules({
        '../migrations/example.js': loader,
        '../migrations/example.ts': loader,
      }),
    ).rejects.toThrow('Duplicate migration title: example.js');
  });
});
