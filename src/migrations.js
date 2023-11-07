import migrate from 'migrate';
import config from './load-config.js';

export default function run(direction = 'up') {
  console.log(
    `Checking if there are any migrations to run for direction "${direction}"...`,
  );

  return new Promise((resolve) =>
    migrate.load(
      {
        stateStore: `.migrate${config.mode === 'test' ? '-test' : ''}`,
      },
      (err, set) => {
        if (err) {
          throw err;
        }

        set[direction]((err) => {
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
