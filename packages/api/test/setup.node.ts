import * as path from 'path';

import { vi } from 'vitest';

// In tests we run from source; loot-core's API fs uses __dirname (for the built dist/).
// Mock the fs so path constants point at loot-core package root where migrations live.
vi.mock(
  '../../loot-core/src/platform/server/fs/index.api',
  async importOriginal => {
    const actual = (await importOriginal()) as Record<string, unknown>;
    const lootCoreRoot = path.join(__dirname, '..', '..', 'loot-core');
    return {
      ...actual,
      migrationsPath: path.join(lootCoreRoot, 'migrations'),
      bundledDatabasePath: path.join(lootCoreRoot, 'default-db.sqlite'),
      demoBudgetPath: path.join(lootCoreRoot, 'demo-budget'),
    };
  },
);

global.IS_TESTING = true;
