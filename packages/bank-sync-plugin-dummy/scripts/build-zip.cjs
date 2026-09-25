const fs = require('fs');
const path = require('path');

const { zipSync } = require('fflate');

const packageRoot = path.join(__dirname, '..');
const distDir = path.join(packageRoot, 'dist');
const pluginDir = path.join(distDir, 'plugin');
const zipPath = path.join(distDir, 'dummy-bank-sync.zip');

function collectZipEntries(directory, basePath = '') {
  const entries = {};

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    const zipEntryPath = path.posix.join(basePath, entry.name);

    if (entry.isDirectory()) {
      Object.assign(entries, collectZipEntries(entryPath, zipEntryPath));
      continue;
    }

    if (entry.isFile()) {
      entries[zipEntryPath] = fs.readFileSync(entryPath);
    }
  }

  return entries;
}

fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(zipPath, Buffer.from(zipSync(collectZipEntries(pluginDir))));

console.log(`Built ${zipPath}`);
