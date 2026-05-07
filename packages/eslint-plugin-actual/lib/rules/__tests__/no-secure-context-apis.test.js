import { runClassic } from 'eslint-vitest-rule-tester';

import plugin from '../../index';
const rule = plugin.rules['no-secure-context-apis'];

void runClassic(
  'no-secure-context-apis',
  rule,
  {
    valid: [
      // Different `crypto` member that doesn't require a secure context.
      'crypto.getRandomValues(new Uint8Array(16));',
      // Locally-named property access shouldn't false-positive.
      'const obj = { crypto: { randomUUID: () => 1 } }; obj.crypto.randomUUID();',
      // Importing a UUID library is the suggested replacement.
      "import { v4 as uuidv4 } from 'uuid'; uuidv4();",
      // Computed access — we deliberately don't try to resolve dynamic keys.
      "crypto['randomUUID'];",
      // Unrelated bare identifier with the same name as a deny entry but used
      // as a local variable (declarations are not flagged).
      'function f(Notification) { return Notification; }',
    ],
    invalid: [
      {
        code: 'crypto.randomUUID();',
        output: null,
        errors: [
          {
            messageId: 'secureContextOnly',
            data: { path: 'crypto.randomUUID' },
          },
        ],
      },
      {
        code: 'const id = crypto.randomUUID();',
        output: null,
        errors: [
          {
            messageId: 'secureContextOnly',
            data: { path: 'crypto.randomUUID' },
          },
        ],
      },
      {
        code: "await navigator.clipboard.writeText('hi');",
        output: null,
        errors: [
          {
            messageId: 'secureContextOnly',
            data: { path: 'navigator.clipboard' },
          },
        ],
      },
      {
        code: 'crypto.subtle.encrypt(algo, key, data);',
        output: null,
        errors: [
          {
            messageId: 'secureContextOnly',
            data: { path: 'crypto.subtle' },
          },
        ],
      },
      {
        code: "new Notification('title');",
        output: null,
        errors: [
          {
            messageId: 'secureContextOnly',
            data: { path: 'Notification' },
          },
        ],
      },
      {
        code: "caches.open('cache-v1');",
        output: null,
        errors: [
          {
            messageId: 'secureContextOnly',
            data: { path: 'caches' },
          },
        ],
      },
      {
        code: "navigator.serviceWorker.register('/sw.js');",
        output: null,
        errors: [
          {
            messageId: 'secureContextOnly',
            data: { path: 'navigator.serviceWorker' },
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
