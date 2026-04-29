import { runClassic } from 'eslint-vitest-rule-tester';

import plugin from '../../index';
const rule = plugin.rules['no-extraneous-dependencies'];

void runClassic(
  'no-extraneous-dependencies',
  rule,
  {
    valid: [
      // Relative imports are always allowed
      `import foo from './foo'`,
      `import foo from '../foo'`,

      // Subpath imports are always allowed
      `import foo from '#utils/foo'`,

      // Node.js built-ins are allowed (including subpaths)
      `import fs from 'fs'`,
      `import path from 'path'`,
      `import crypto from 'node:crypto'`,
      `import { readFile } from 'fs/promises'`,
      `import posix from 'path/posix'`,

      // Virtual modules are allowed
      `import { registerSW } from 'virtual:pwa-register'`,

      // require() with relative path
      `const foo = require('./foo')`,
    ],

    invalid: [
      {
        code: `import foo from 'not-a-real-package'`,
        errors: [
          {
            messageId: 'extraneous',
            data: { packageName: 'not-a-real-package' },
          },
        ],
      },
      {
        code: `import foo from '@not-real/package'`,
        errors: [
          {
            messageId: 'extraneous',
            data: { packageName: '@not-real/package' },
          },
        ],
      },
      {
        code: `import foo from '@not-real/package/deep/path'`,
        errors: [
          {
            messageId: 'extraneous',
            data: { packageName: '@not-real/package' },
          },
        ],
      },
      {
        code: `export { foo } from 'not-a-real-package'`,
        errors: [
          {
            messageId: 'extraneous',
            data: { packageName: 'not-a-real-package' },
          },
        ],
      },
      {
        code: `export * from 'not-a-real-package'`,
        errors: [
          {
            messageId: 'extraneous',
            data: { packageName: 'not-a-real-package' },
          },
        ],
      },
      {
        code: `const foo = require('not-a-real-package')`,
        errors: [
          {
            messageId: 'extraneous',
            data: { packageName: 'not-a-real-package' },
          },
        ],
      },
    ],
  },
  {
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
  },
);
