import path from 'node:path';

import migrate from 'migrate';

import config from './load-config.js';

export function run(direction = 'up') {
  console.log(
    `Checking if there are any migrations to run for direction "${direction}"...`,
  );

  return new Promise(resolve =>
    migrate.load(
      {
        stateStore: `${path.join(config.dataDir, '.migrate')}${
          config.mode === 'test' ? '-test' : ''
        }`,
        migrationsDirectory: `${path.join(config.projectRoot, 'migrations')}`,
      },
      (err, set) => {
        if (err) {
          throw err;
        }

        set[direction](err => {
          if (err) {
            throw err;
          }

          console.log('Migrations: DONE');
          resolve();
        });
      },
    ),
  );
}
