#!/usr/bin/env node

/**
 * Build script to convert TypeScript manifest to JSON
 * This script imports the manifest.ts file and writes it as JSON to manifest.json
 */

const { writeFileSync } = require('fs');
const { join } = require('path');

// Import the manifest from the built TypeScript file
async function importManifest() {
  try {
    const manifestModule = await import('../dist/manifest.js');
    return manifestModule.manifest;
  } catch (error) {
    console.error('Could not import compiled manifest:', error.message);
    console.log(
      'Make sure TypeScript is compiled first. Run: npm run build:compile',
    );
    process.exit(1);
  }
}

async function buildManifest() {
  try {
    console.log('Building manifest.json...');

    const manifest = await importManifest();
    const jsonContent = JSON.stringify(manifest, null, 2);
    const manifestPath = join(__dirname, '..', 'manifest.json');
    writeFileSync(manifestPath, jsonContent + '\n');

    console.log('manifest.json created successfully');
    console.log(`Package: ${manifest.name}@${manifest.version}`);
    console.log(`Description: ${manifest.description}`);
    console.log(`Entry point: ${manifest.entry}`);
  } catch (error) {
    console.error('❌ Failed to build manifest:', error.message);
    process.exit(1);
  }
}

buildManifest();
