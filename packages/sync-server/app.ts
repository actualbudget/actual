import { run as runMigrations } from './src/migrations';

runMigrations()
  .then(() => {
    //import the app here becasue initial migrations need to be run first - they are dependencies of the app.js
    // Returned (not `void`) so a failure while starting the server — e.g. not
    // being able to bind the configured address — reaches the catch below
    // instead of becoming an unhandled rejection.
    return import('./src/app.js').then(app => app.run()); // run the app
  })
  .catch(err => {
    console.log('Error starting app:', err);
    process.exit(1);
  });
