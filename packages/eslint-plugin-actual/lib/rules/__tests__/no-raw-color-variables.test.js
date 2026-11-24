import { runClassic } from 'eslint-vitest-rule-tester';

import plugin from '../../index';
const rule = plugin.rules['no-raw-color-variables'];

void runClassic(
  'no-raw-color-variables',
  rule,
  {
    valid: [
      `const style = { color: theme.pageText };`,
      `const style = { width: 'var(--sidebar-width)' };`,
      `const name = '--color-pageText';`,
      `const style = { border: \`1px solid \${theme.tableBorder}\` };`,
    ],

    invalid: [
      {
        code: `const style = { color: 'var(--color-pageText)' };`,
        output: null,
        errors: [{ messageId: 'useThemeToken' }],
      },
      {
        code: `const style = { border: \`1px solid var(--color-tableBorder)\` };`,
        output: null,
        errors: [{ messageId: 'useThemeToken' }],
      },
      {
        code: `const color = 'var( --color-pageText, #fff)';`,
        output: null,
        errors: [{ messageId: 'useThemeToken' }],
      },
      {
        code: `<View className="text-[var(--color-pageText)]" />`,
        output: null,
        errors: [{ messageId: 'useThemeToken' }],
      },
    ],
  },
  {
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    },
  },
);
