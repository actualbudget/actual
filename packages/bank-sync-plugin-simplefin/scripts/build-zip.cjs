#!/usr/bin/env node

/**
 * Build script to create a plugin distribution zip file
 * Creates: {packageName}.{version}.zip containing dist/index.js, manifest.json, and package.json
 */

const { createWriteStream, existsSync } = require('fs');
const { join } = require('path');
const archiver = require('archiver');

// Import package.json to get name and version
// Note: __dirname is already available in CommonJS and refers to the scripts/ directory
function importPackageJson() {
  try {
    const packageJson = require('../package.json');
    return packageJson;
  } catch (error) {
    console.error('Could not import package.json:', error.message);
    process.exit(1);
  }
}

async function createZip() {
  try {
    console.log('Creating plugin distribution zip...');

    // Get package info
    const packageJson = importPackageJson();
    const packageName = packageJson.name;
    const version = packageJson.version;

    // Create zip filename
    const zipFilename = `${packageName.replace('@', '').replace('/', '-')}.${version}.zip`;
    const zipPath = join(__dirname, '..', zipFilename);

    console.log(`Creating ${zipFilename}`);

    // Check if required files exist
    const bundlePath = join(__dirname, '..', 'dist', 'bundle.js');
    const manifestPath = join(__dirname, '..', 'manifest.json');

    if (!existsSync(bundlePath)) {
      console.error('dist/bundle.js not found. Run: npm run build:bundle');
      process.exit(1);
    }

    if (!existsSync(manifestPath)) {
      console.error('manifest.json not found. Run: npm run build:manifest');
      process.exit(1);
    }

    // Create zip file
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });

    // Handle archive events
    archive.on('error', err => {
      console.error('Archive error:', err);
      process.exit(1);
    });

    archive.on('end', () => {
      const stats = archive.pointer();
      console.log(`${zipFilename} created successfully`);
      console.log(`Size: ${(stats / 1024).toFixed(2)} KB`);
      console.log(
        `📁 Contents: index.js (bundled with dependencies), manifest.json`,
      );
    });

    // Pipe archive to file
    archive.pipe(output);

    // Create package.json for the plugin with runtime dependencies
    const pluginPackageJson = {
      type: 'module',
      dependencies: {
        express: packageJson.dependencies.express,
        axios: packageJson.dependencies.axios,
      },
    };
    const pluginPackageJsonContent = JSON.stringify(
      pluginPackageJson,
      null,
      2,
    );

    // Add files to archive
    archive.file(bundlePath, { name: 'index.js' });
    archive.file(manifestPath, { name: 'manifest.json' });
    archive.append(pluginPackageJsonContent, { name: 'package.json' });

    // Finalize the archive
    await archive.finalize();
  } catch (error) {
    console.error('Failed to create zip:', error.message);
    process.exit(1);
  }
}

createZip();
