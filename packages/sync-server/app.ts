import { run as runMigrations } from './src/migrations';

runMigrations()
  .then(() => {
    //import the app here becasue initial migrations need to be run first - they are dependencies of the app.js
    import('./src/app.js').then(app => app.run()); // run the app
  })
  .catch(err => {
    console.log('Error starting app:', err);
    process.exit(1);
  });
