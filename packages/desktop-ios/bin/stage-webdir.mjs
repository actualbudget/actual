#!/usr/bin/env node
// Stages the web build (packages/desktop-client/build) into the Capacitor
// webDir (packages/desktop-ios/webdir) so `cap sync ios` can copy it into the
// native project. Kept as a separate step so the webDir is a clean, disposable
// copy rather than a symlink into another workspace's build output.

import { access, cp, rm } from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');
const webBuildDir = path.resolve(pkgRoot, '../desktop-client/build');
const webDir = path.resolve(pkgRoot, 'webdir');

try {
  await access(webBuildDir);
} catch {
  console.error(
    `Web build not found at ${webBuildDir}.\n` +
      'Run `yarn workspace @actual-app/ios build:web` (or `yarn build:ios`) first.',
  );
  process.exit(1);
}

await rm(webDir, { recursive: true, force: true });
await cp(webBuildDir, webDir, { recursive: true });

console.log(`Staged web build into ${path.relative(process.cwd(), webDir)}`);
