let api = require('./dist/index');

async function run() {
  let app = await api.init({ dataDir: '/tmp' });
  await app.send('create-budget', { testMode: true });
  await api.shutdown();
}

run();
