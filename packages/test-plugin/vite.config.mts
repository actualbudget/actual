import { defineConfig } from 'vite';
import path from 'path';
import { federation } from '@module-federation/vite';
import { fileURLToPath } from 'url';
import { createWriteStream, rmSync, writeFileSync, mkdirSync } from 'fs';
import archiver from 'archiver';
import react from '@vitejs/plugin-react-swc';
import topLevelAwait from 'vite-plugin-top-level-await';

import { manifest } from './src/manifest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  server: {
    origin: 'http://localhost:2000',
    port: 2000,
  },
  preview: {
    port: 2000,
    host: '0.0.0.0',
  },
  base: 'http://localhost:2000',
  build: {
    target: 'es2022',
    outDir: 'build',
    lib: {
      entry: path.resolve(__dirname, 'src/index.tsx'),
      name: 'test-plugin',
      fileName: format => `test-plugin.${format}.js`,
      formats: ['es'],
    },
    rollupOptions: {
      input: path.resolve(__dirname, 'src/index.tsx'),
      output: {
        globals: {},
      },
      // Keep dependencies bundled as fallback, but allow sharing via module federation
      external: [],
    },
  },
  // Force bundling of workspace packages
  ssr: {
    noExternal: [
      '@actual-app/plugins-core',
      '@actual-app/components',
      'react',
      'react-dom',
    ],
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(
      process.env.NODE_ENV || 'production',
    ),
  },
  plugins: [
    federation({
      name: manifest.name, // Use the same name as in manifest.ts
      ignoreOrigin: true,
      manifest: true,
      exposes: {
        '.': './src/index.tsx',
      },
      shared: {
        'react-i18next': {
          singleton: true,
        },
        i18next: {
          singleton: true,
        },
        'i18next-resources-to-backend': {
          singleton: true,
        },
      },
    }),
    // If you set build.target: "chrome89", you can remove this plugin
    false && topLevelAwait(),
    react({ reactRefreshHost: 'http://localhost:2000' }),
    {
      name: 'vite-plugin-clean-build',
      generateBundle() {
        const distPath = path.resolve(__dirname, 'build');
        console.log('🧹 Cleaning build folder...');
        rmSync(distPath, { recursive: true, force: true });
        console.log('✅ Build folder cleaned.');
      },
    },
    {
      name: 'vite-plugin-generate-manifest',
      closeBundle() {
        const buildDir = path.resolve(
          path.dirname(fileURLToPath(import.meta.url)),
          'build',
        );
        const outputPath = path.resolve(buildDir, 'manifest.json');

        // Ensure the build directory exists
        mkdirSync(buildDir, { recursive: true });

        writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf-8');
        console.log('✅ manifest.json generated in /build');
      },
    },
    {
      name: 'vite-plugin-zip-build',
      closeBundle() {
        const distPath = path.resolve(__dirname, 'build');
        const zipName = `payload-${manifest.name}-${manifest.version}.zip`;
        const outputPath = path.resolve(__dirname, 'build', zipName);
        const output = createWriteStream(outputPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        console.log(`📦 Creating ${zipName}...`);

        archive.glob('**/*', {
          cwd: distPath,
          ignore: [zipName],
        });

        archive.pipe(output);
        archive.finalize();

        archive.on('close', () => {
          console.log(
            `✅ ${zipName} created (${archive.pointer()} total bytes)`,
          );
        });

        archive.on('error', (err: Error) => {
          console.error('❌ Error creating ZIP file:', err.message);
        });
      },
    },
  ],
});
