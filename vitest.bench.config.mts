import codspeedPlugin from '@codspeed/vitest-plugin';
import { defineConfig } from 'vitest/config';

// Continuous benchmarking config. Benchmarks live next to the code they measure
// as `*.bench.ts` files and run with `yarn bench`. In CI the CodSpeed plugin
// instruments them so performance deltas can be reported on pull requests.
export default defineConfig({
  plugins: [codspeedPlugin()],
  // Mirror loot-core's node test resolution so platform-specific (`#platform`,
  // `#shared`, …) subpath imports resolve the same way they do under `yarn test`.
  resolve: {
    conditions: ['electron', 'module', 'browser', 'development'],
  },
  ssr: {
    resolve: { conditions: ['electron', 'module', 'node', 'development'] },
  },
  test: {
    benchmark: {
      include: ['packages/*/src/**/*.bench.ts'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/lib-dist/**'],
    },
  },
});
