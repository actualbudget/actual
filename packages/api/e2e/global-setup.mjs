import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));

// Build the consumer fixture (e2e/consumer) for production with Vite, exactly
// as a third-party app would. serve-dist.mjs then serves the output (with the
// COOP/COEP headers) at /e2e/consumer/dist/. This is the coverage the
// verbatim-dist harness can't give: a consumer bundler processing browser.js.
// Playwright's globalSetup contract requires a default export.
// oxlint-disable-next-line import/no-default-export
export default async function globalSetup() {
  await build({
    root: path.join(here, 'consumer'),
    base: './',
    logLevel: 'warn',
    // The workspace package keeps a dev-only `development` export condition; a
    // published consumer has none. Drop it so `browser` (dist/browser.js) wins.
    resolve: { conditions: ['browser', 'module', 'default'] },
    build: { outDir: path.join(here, 'consumer', 'dist'), emptyOutDir: true },
  });
}
