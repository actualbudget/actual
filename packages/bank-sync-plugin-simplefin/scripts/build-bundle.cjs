#!/usr/bin/env node

/**
 * Build script to bundle the plugin with all dependencies
 * Uses esbuild to create a single self-contained JavaScript file
 */

const esbuild = require('esbuild');
const path = require('path');

async function bundle() {
  try {
    console.log('Bundling plugin with dependencies...');

    const entryPoint = path.join(__dirname, '..', 'dist', 'index.js');
    const outFile = path.join(__dirname, '..', 'dist', 'bundle.js');
    const pluginsCoreSyncServerEntry = path.join(
      __dirname,
      '..',
      '..',
      'plugins-core-sync-server',
      'src',
      'index.ts',
    );

    await esbuild.build({
      entryPoints: [entryPoint],
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'esm',
      outfile: outFile,
      plugins: [
        {
          name: 'workspace-plugins-core-sync-server-source',
          setup(build) {
            build.onResolve(
              { filter: /^@actual-app\/plugins-core-sync-server$/ },
              () => ({ path: pluginsCoreSyncServerEntry }),
            );
          },
        },
      ],
      external: ['express', 'axios'],
      minify: false,
      sourcemap: false,
      treeShaking: true,
    });

    console.log('Bundle created successfully');
    console.log(`Output: dist/bundle.js`);
  } catch (error) {
    console.error('Failed to bundle:', error.message);
    process.exit(1);
  }
}

void bundle();
