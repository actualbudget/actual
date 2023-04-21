import * as api from './index';

async function run() {
  let app = await api.init({ config: { dataDir: '/tmp' } });
  await app.send('create-budget', { testMode: true });
}

run();
