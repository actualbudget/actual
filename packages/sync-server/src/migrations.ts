import path from 'node:path';

import { load } from 'migrate';

import { config } from './load-config';

type MigrationCallback = (err?: Error) => void;
type MigrationModule = {
  up: (next?: MigrationCallback) => void;
  down: (next?: MigrationCallback) => void;
};

// Vite resolves this glob at build time and inlines a static map of
// () => import('chunks/...js') calls. Each migration becomes its own chunk.
// Runtime fs reads against a migrations/ directory disappear.
const migrationsLoaders = import.meta.glob<MigrationModule>(
  '../migrations/*.{ts,js}',
);

export async function run(direction: 'up' | 'down' = 'up'): Promise<void> {
  console.log(
    `Checking if there are any migrations to run for direction "${direction}"...`,
  );

  try {
    const sortedKeys = Object.keys(migrationsLoaders).sort();
    const migrationsModules: Record<string, MigrationModule> = {};

    for (const key of sortedKeys) {
      const fileName = key.split('/').pop()!;
      migrationsModules[fileName] = await migrationsLoaders[key]();
    }

    return new Promise<void>((resolve, reject) => {
      load(
        {
          stateStore: `${path.join(config.get('dataDir'), '.migrate')}${config.get('mode') === 'test' ? '-test' : ''}`,
          migrations: migrationsModules,
        },
        (err, set) => {
          if (err) return reject(err);

          set[direction](err => {
            if (err) return reject(err);

            console.log('Migrations: DONE');
            resolve();
          });
        },
      );
    });
  } catch (err) {
    console.error('Error during migration process:', err);
    throw err;
  }
}
