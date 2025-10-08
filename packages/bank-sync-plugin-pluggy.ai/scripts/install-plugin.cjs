#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const packageJson = require('../package.json');
const packageName = packageJson.name;
const version = packageJson.version;
const pluginName = packageName.replace('@', '').replace('/', '-');
const zipFileName = `${pluginName}.${version}.zip`;

// Source: built zip in package root (not in dist/)
const sourceZip = path.join(__dirname, '..', zipFileName);

// Target: sync-server plugins directory
// Go up to monorepo root, then to sync-server
const targetDir = path.join(
  __dirname,
  '..',
  '..',
  'sync-server',
  'server-files',
  'plugins-api',
);
const targetZip = path.join(targetDir, zipFileName);

console.log('📦 Installing plugin to sync-server...');
console.log(`   Source: ${sourceZip}`);
console.log(`   Target: ${targetZip}`);

// Check if source exists
if (!fs.existsSync(sourceZip)) {
  console.error(`Error: ZIP file not found at ${sourceZip}`);
  console.error('   Run "npm run build" first to create the ZIP file.');
  process.exit(1);
}

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  console.log(`Creating plugins directory: ${targetDir}`);
  fs.mkdirSync(targetDir, { recursive: true });
}

// Remove old versions of this plugin
try {
  const files = fs.readdirSync(targetDir);
  const oldVersions = files.filter(
    f => f.startsWith(pluginName) && f.endsWith('.zip') && f !== zipFileName,
  );

  for (const oldFile of oldVersions) {
    const oldPath = path.join(targetDir, oldFile);
    console.log(`  Removing old version: ${oldFile}`);
    fs.unlinkSync(oldPath);
  }
} catch (err) {
  console.warn(`  Warning: Could not clean old versions: ${err.message}`);
}

// Copy the new ZIP
try {
  fs.copyFileSync(sourceZip, targetZip);
  console.log(` Plugin installed successfully!`);
  console.log(`   Location: ${targetZip}`);
  console.log('');
  console.log(' Restart your sync-server to load the plugin.');
} catch (err) {
  console.error(` Error copying file: ${err.message}`);
  process.exit(1);
}
