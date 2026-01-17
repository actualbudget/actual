import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/*/vitest.config.{ts,mts}',
      'packages/component-library/vitest.web.config.ts',
      {
        extends: 'packages/loot-core/vitest.web.config.ts',
        test: { name: 'loot-core-web', dir: 'packages/loot-core' },
      },
    ],
    onConsoleLog: (log, type) => {
      // print only console.error
      return type === 'stderr';
    },
  },
});
