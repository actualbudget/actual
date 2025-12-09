import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir } from 'node:fs/promises';

import migrate from 'migrate';

import { config } from './load-config.js';

export async function run(direction: 'up' | 'down' = 'up'): Promise<void> {
  console.log(
    `Checking if there are any migrations to run for direction "${direction}"...`,
  );

  const __dirname = dirname(fileURLToPath(import.meta.url)); // this directory
  const migrationsDir = path.join(__dirname, '../migrations');

  try {
    // Load all script files in the migrations directory
    const files = await readdir(migrationsDir);
    const migrationsModules: { [key: string]: { up: Function, down: Function } } = {};

    await Promise.all(
      files
        .sort()
        .map(async (f) => {
          migrationsModules[f] = await import(path.join(migrationsDir, f));
        })
    );

    return new Promise<void>((resolve, reject) => {
      migrate.load(
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
        }
      );
    });
  } catch (err) {
    console.error('Error during migration process:', err);
    throw err;
  }
}
