import path from 'node:path';

import { load } from 'migrate';

import { config } from './load-config';

type MigrationCallback = (err?: Error) => void;
type MigrationModule = {
  up: (next?: MigrationCallback) => void;
  down: (next?: MigrationCallback) => void;
};
type MigrationLoader = () => Promise<MigrationModule>;

// Vite resolves this glob at build time and inlines a static map of
// () => import('chunks/...js') calls. Each migration becomes its own chunk.
// Runtime fs reads against a migrations/ directory disappear.
const migrationsLoaders = import.meta.glob<MigrationModule>(
  '../migrations/*.{ts,js}',
);

export async function loadMigrationModules(
  loaders: Record<string, MigrationLoader>,
): Promise<Record<string, MigrationModule>> {
  const migrationsModules: Record<string, MigrationModule> = {};

  for (const key of Object.keys(loaders).sort()) {
    // Migration titles are persisted in .migrate. Keep their original .js
    // titles when source files are converted to TypeScript.
    const fileName = key
      .slice(key.lastIndexOf('/') + 1)
      .replace(/\.ts$/, '.js');

    if (Object.prototype.hasOwnProperty.call(migrationsModules, fileName)) {
      throw new Error(`Duplicate migration title: ${fileName}`);
    }

    migrationsModules[fileName] = await loaders[key]();
  }

  return migrationsModules;
}

export async function run(direction: 'up' | 'down' = 'up'): Promise<void> {
  console.log(
    `Checking if there are any migrations to run for direction "${direction}"...`,
  );

  try {
    const migrationsModules = await loadMigrationModules(migrationsLoaders);

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
