// A minimal third-party consumer of @actual-app/api. It does nothing special:
// just `import` the package and `init()`. The only host requirement is COOP/COEP
// headers, which serve-dist.mjs sets. This fixture is bundled for production by
// global-setup.ts, exercising a consumer bundler processing dist/browser.js.
import * as api from '@actual-app/api';

const out = document.getElementById('out');
if (out == null) {
  throw new Error('Missing `#out` element in consumer fixture');
}
function report(state: 'ok' | 'error', detail: unknown) {
  out.textContent = JSON.stringify(detail);
  out.setAttribute('data-state', state);
}

async function run() {
  await api.init({ dataDir: '/documents' });
  await api.runImport('Consumer E2E', async () => {
    await api.createAccount({ name: 'Checking', offbudget: false }, 12345);
  });
  const accounts = await api.getAccounts();
  report('ok', { accounts: accounts.map(a => a.name) });
}

run().catch(err =>
  report('error', err instanceof Error ? err.message : String(err)),
);
