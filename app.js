const run = require('./src/app');

run().catch((err) => {
  console.log('Error starting app:', err);
  process.exit(1);
});
