import { run as runMigrations } from './src/migrations';

runMigrations()
  // Import the app only after the initial migrations ran: they are
  // dependencies of app.js. Chained so that a failure while loading or
  // starting it is reported below instead of as an anonymous rejection.
  .then(() => import('./src/app.js'))
  .then(app => app.run())
  .catch(err => {
    console.log('Error starting app:', err);
    process.exit(1);
  });
