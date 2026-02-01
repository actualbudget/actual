import { readdir } from 'node:fs/promises';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { load } from 'migrate';

import { config } from './load-config';

type MigrationCallback = (err?: Error) => void;

export async function run(direction: 'up' | 'down' = 'up'): Promise<void> {
  console.log(
    `Checking if there are any migrations to run for direction "${direction}"...`,
  );

  const __dirname = dirname(fileURLToPath(import.meta.url)); // this directory
  const migrationsDir = path.join(__dirname, '../migrations');

  try {
    // Load all script files in the migrations directory
    const files = await readdir(migrationsDir);
    const migrationsModules: Record<
      string,
      {
        up: (next?: MigrationCallback) => void;
        down: (next?: MigrationCallback) => void;
      }
    > = {};

    for (const f of files
      .filter(f => f.endsWith('.js') || f.endsWith('.ts'))
      .sort()) {
      migrationsModules[f] = await import(path.join(migrationsDir, f));
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
