#!/usr/bin/env node

/**
 * Build script to bundle the plugin with all dependencies
 * Uses esbuild to create a single self-contained JavaScript file
 */

const esbuild = require('esbuild');
const { join } = require('path');

async function bundle() {
  try {
    console.log('Bundling plugin with dependencies...');

    const entryPoint = join(__dirname, '..', 'dist', 'index.js');
    const outFile = join(__dirname, '..', 'dist', 'bundle.js');

    await esbuild.build({
      entryPoints: [entryPoint],
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'esm',
      outfile: outFile,
      external: [],
      minify: false,
      sourcemap: false,
      treeShaking: true,
    });

    console.log('✅ Bundle created successfully');
    console.log(`📦 Output: dist/bundle.js`);
  } catch (error) {
    console.error('❌ Failed to bundle:', error.message);
    process.exit(1);
  }
}

bundle();
