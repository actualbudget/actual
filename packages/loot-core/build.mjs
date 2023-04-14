import fs from 'fs';
import * as path from 'path';

import * as esbuild from 'esbuild';
import { polyfillNode } from 'esbuild-plugin-polyfill-node';
import peg from 'peggy';

const IS_DEV = process.env.NODE_ENV === 'development';

const pegPlugin = {
  name: 'peg',
  setup: build => {
    build.onResolve({ filter: /\.pegjs$/ }, args => ({
      path: path.isAbsolute(args.path)
        ? args.path
        : path.join(args.resolveDir, args.path),
      namespace: 'peg',
    }));

    build.onLoad({ filter: /.*/, namespace: 'peg' }, async args => {
      let text = await fs.promises.readFile(args.path, 'utf8');
      const output = IS_DEV ? 'source-with-inline-map' : 'source';
      const grammarSource = IS_DEV ? args.path : '';
      return {
        loader: 'js',
        contents: peg.generate(text, { output, grammarSource, format: 'umd' }),
      };
    });
  },
};

const extensions = process.env.EXTENSIONS?.split(',') ?? [
  '.web.js',
  '.web.ts',
  '.web.tsx',
  '.js',
  '.ts',
  '.tsx',
  '.json',
];

const config = {
  entryPoints: [{ out: 'kcab.worker', in: 'src/server/main.js' }],
  bundle: true,
  // We must manually package node-libofx until either:
  // 1. esbuild provides code-splitting for non-esm builds
  // 2. Browsers support `import()` in module-workers.
  //    See https://developer.mozilla.org/en-US/docs/Web/API/Worker/Worker#browser_compatibility
  //    (Firefox support is behind flag)
  // Once one of these are done, we can set
  // platform: 'neutral', format: 'esm', splitting: true, mainFields: ['main']
  // and node-libofx will be auto split.
  external: ['/kcab/node-libofx.js'],
  mainFields: ['main'],
  outdir: process.env.OUTPATH ?? 'lib-dist/browser',
  globalName: 'backend',
  format: 'iife',
  platform: 'neutral',
  publicPath: '/kcab/',
  minify: !IS_DEV,
  sourcemap: IS_DEV,
  entryNames: process.env.OUTFMT ?? '[dir]/[name]',
  loader: {
    '.ts': 'ts',
    '.web.ts': 'ts',
    '.api.ts': 'ts',
    '.js': 'js',
    '.web.js': 'js',
    '.api.js': 'js',
  },
  resolveExtensions: extensions,
  define: {
    'process.env.IS_DEV': JSON.stringify(IS_DEV),
    'process.env.IS_BETA': JSON.stringify(
      process.env.ACTUAL_RELEASE_TYPE === 'beta',
    ),
    'process.env.PUBLIC_URL': JSON.stringify(process.env.PUBLIC_URL || '/'),
    'process.env.ACTUAL_DATA_DIR': JSON.stringify('/'),
    'process.env.ACTUAL_DOCUMENT_DIR': JSON.stringify('/documents'),
  },
  alias: {
    // fs: require.resolve('memfs'),
  },
  plugins: [pegPlugin, polyfillNode()],
  // target: ['es2020'], // TODO: should we set this?
};

if (process.env.BUILD_ENV === 'development') {
  let ctx = await esbuild.context(config);
  ctx.watch();
} else {
  await esbuild.build(config);
  console.log('Build success!');
}
