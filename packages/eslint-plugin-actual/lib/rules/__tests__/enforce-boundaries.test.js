//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import { runClassic } from 'eslint-vitest-rule-tester';

import * as rule from '../enforce-boundaries';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

void runClassic(
  'enforce-boundaries',
  rule,
  {
    valid: [
      // ── Imports that are fine ───────────────────────────────────
      `import foo from './sibling'`,
      `import foo from '../nearby'`,
      `import foo from '#components/Button'`,
      `import foo from '@actual-app/components'`,
      `import foo from 'react'`,

      // require with acceptable paths
      `const foo = require('./local')`,
      `const foo = require('../nearby')`,
      `const foo = require('some-package')`,

      // Dynamic import with acceptable path
      `const mod = import('./local')`,

      // re-exports with acceptable paths
      `export { bar } from './sibling'`,
      `export * from '../nearby'`,

      // Config objects without forbidden properties
      `const config = { compilerOptions: { strict: true } }`,
      `const config = { resolve: { conditions: ['module'] } }`,

      // Export without source clause
      `const foo = 1; export { foo }`,

      // Non-literal require/import arguments
      `const foo = require(variable)`,
      `const mod = import(variable)`,

      // Properties named paths/alias but NOT in forbidden context
      `const config = { paths: { foo: 'bar' } }`,
      `const config = { alias: { foo: 'bar' } }`,
      `const config = { options: { paths: ['/usr/bin'] } }`,
      `const config = { other: { alias: 'something' } }`,
    ],

    invalid: [
      // ── Backtracked imports ─────────────────────────────────────
      {
        code: `import foo from '../../deep/path'`,
        output: null,
        errors: [
          {
            messageId: 'noBacktrackedImport',
            data: { source: '../../deep/path' },
          },
        ],
      },
      {
        code: `import bar from '../../../even/deeper'`,
        output: null,
        errors: [
          {
            messageId: 'noBacktrackedImport',
            data: { source: '../../../even/deeper' },
          },
        ],
      },

      // Backtracked re-exports
      {
        code: `export { bar } from '../../somewhere'`,
        output: null,
        errors: [
          {
            messageId: 'noBacktrackedImport',
            data: { source: '../../somewhere' },
          },
        ],
      },
      {
        code: `export * from '../../somewhere'`,
        output: null,
        errors: [
          {
            messageId: 'noBacktrackedImport',
            data: { source: '../../somewhere' },
          },
        ],
      },

      // Backtracked require
      {
        code: `const x = require('../../deep')`,
        output: null,
        errors: [
          {
            messageId: 'noBacktrackedImport',
            data: { source: '../../deep' },
          },
        ],
      },

      // Backtracked dynamic import
      {
        code: `const mod = import('../../deep')`,
        output: null,
        errors: [
          {
            messageId: 'noBacktrackedImport',
            data: { source: '../../deep' },
          },
        ],
      },

      // ── tsconfig compilerOptions.paths ──────────────────────────
      {
        code: `const config = { compilerOptions: { paths: { "@/*": ["./src/*"] } } }`,
        output: null,
        errors: [{ messageId: 'noTsconfigPaths' }],
      },
      {
        code: `module.exports = { compilerOptions: { paths: { "~/*": ["./src/*"] } } }`,
        output: null,
        errors: [{ messageId: 'noTsconfigPaths' }],
      },

      // ── Vite resolve.alias ──────────────────────────────────────
      {
        code: `const config = { resolve: { alias: { "@": "./src" } } }`,
        output: null,
        errors: [{ messageId: 'noResolveAlias' }],
      },
      {
        code: `export default { resolve: { alias: { "~": "/src" } } }`,
        output: null,
        errors: [{ messageId: 'noResolveAlias' }],
      },

      // ── String-keyed config properties ─────────────────────────
      {
        code: `const config = { "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }`,
        output: null,
        errors: [{ messageId: 'noTsconfigPaths' }],
      },
      {
        code: `const config = { "resolve": { "alias": { "@": "./src" } } }`,
        output: null,
        errors: [{ messageId: 'noResolveAlias' }],
      },

      // ── Multiple violations in one file ─────────────────────────
      {
        code: `import a from '../../foo';\nimport b from '../../bar';`,
        output: null,
        errors: [
          {
            messageId: 'noBacktrackedImport',
            data: { source: '../../foo' },
          },
          {
            messageId: 'noBacktrackedImport',
            data: { source: '../../bar' },
          },
        ],
      },
    ],
  },
  {
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
);
