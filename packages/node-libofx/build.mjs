import * as esbuild from 'esbuild';
import { polyfillNode } from 'esbuild-plugin-polyfill-node';

const config = {
  entryPoints: ['index.js'],
  platform: 'neutral',
  bundle: true,
  outfile: process.env.OUTFILE ?? 'xfo.js',
  banner: {
    // These should be provided by emcc,
    // but building libofx.web.js is broken right now, so debugging this is impossible.
    js: 'var tempDouble = null; var tempI64 = null;',
  },
  format: 'iife',
  globalName: 'libofx',
  minify: true,
  sourcemap: false,
  plugins: [polyfillNode()],
};

await esbuild.build(config);
