import run from './src/app.js';

run().catch((err) => {
  console.log('Error starting app:', err);
  process.exit(1);
});
