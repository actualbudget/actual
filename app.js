import run from './src/app.js';
import runMigrations from './src/migrations.js';

runMigrations()
  .then(run)
  .catch((err) => {
    console.log('Error starting app:', err);
    process.exit(1);
  });
