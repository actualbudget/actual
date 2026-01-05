import tsparser from '@typescript-eslint/parser';
import pluginPerfectionist from 'eslint-plugin-perfectionist';
import pluginTypescriptPaths from 'eslint-plugin-typescript-paths';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  {
    ignores: [
      'packages/api/app/bundle.api.js',
      'packages/api/app/stats.json',
      'packages/api/@types',
      'packages/api/migrations',
      'packages/crdt/src/proto/sync_pb.js',
      'packages/component-library/src/icons/**/*',
      'packages/desktop-client/bundle.browser.js',
      'packages/desktop-client/dev-dist/',
      'packages/desktop-client/service-worker/*',
      'packages/desktop-client/build-electron/',
      'packages/desktop-client/build-stats/',
      'packages/desktop-client/public/kcab/',
      'packages/desktop-client/public/data/',
      'packages/desktop-client/test-results/',
      'packages/desktop-client/playwright-report/',
      'packages/desktop-electron/client-build/',
      'packages/loot-core/**/lib-dist/*',
      'packages/loot-core/**/proto/*',
      'packages/sync-server/coverage/',
      'packages/sync-server/user-files/',
      'packages/sync-server/server-files/',
      '.yarn/*',
      '.github/*',
      '**/build/',
      '**/dist/',
      '**/node_modules/',
    ],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    languageOptions: {
      parser: tsparser,
    },
  },
  {
    plugins: {
      perfectionist: pluginPerfectionist,
    },
    rules: {
      // TODO: https://github.com/oxc-project/oxc/issues/17076
      'perfectionist/sort-imports': [
        'warn',
        {
          groups: [
            'react',
            'builtin',
            'external',
            'loot-core',
            'parent',
            'sibling',
            'index',
            'desktop-client',
          ],
          customGroups: [
            {
              groupName: 'react',
              elementNamePattern: '^react(-.*)?$',
            },
            {
              groupName: 'loot-core',
              elementNamePattern: '^loot-core',
            },
            {
              groupName: 'desktop-client',
              elementNamePattern: '^@desktop-client',
            },
          ],
          newlinesBetween: 'always',
        },
      ],
    },
  },
  {
    files: ['packages/desktop-client/**/*.{js,ts,jsx,tsx}'],
    plugins: {
      'typescript-paths': pluginTypescriptPaths,
    },
    rules: {
      'typescript-paths/absolute-parent-import': [
        'error',
        { preferPathOverBaseUrl: true },
      ],
      'typescript-paths/absolute-import': ['error', { enableAlias: false }],
    },
  },
);
