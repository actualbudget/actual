// Stages the web build into `www/` for Capacitor to copy into the native
// apps. Source maps are left out: nothing on a phone reads them and they
// are around 70% of the web build, so shipping them more than triples the
// installed app size.
import { cpSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const webBuildDir = path.join(
  path.dirname(require.resolve('@actual-app/web/package.json')),
  'build',
);
const wwwDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'www',
);

rmSync(wwwDir, { recursive: true, force: true });
cpSync(webBuildDir, wwwDir, {
  recursive: true,
  filter: src => !src.endsWith('.map'),
});
