import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  logLevel: 'silent',
});
try {
  const { default: bank } = await server.ssrLoadModule(
    fileURLToPath(new URL('../../commerzbank_cobadeff.ts', import.meta.url)),
  );
  const inputs = JSON.parse(readFileSync(0, 'utf8'));
  process.stdout.write(
    JSON.stringify(
      inputs.map(input => bank.normalizeTransaction(input, false)?.notes),
    ),
  );
} finally {
  await server.close();
}
