import { runClassic } from 'eslint-vitest-rule-tester';

import plugin from '../../index';
const rule = plugin.rules['theme-token-roles'];

function textOnBackground(token, property = 'backgroundColor') {
  return {
    messageId: 'roleMismatch',
    data: { token, tokenRole: 'text', property, propertyRole: 'background' },
  };
}

function backgroundOnText(token) {
  return {
    messageId: 'roleMismatch',
    data: {
      token,
      tokenRole: 'background',
      property: 'color',
      propertyRole: 'text',
    },
  };
}

void runClassic(
  'theme-token-roles',
  rule,
  {
    valid: [
      `const style = { color: theme.pageText };`,
      `const style = { backgroundColor: theme.tableBackground };`,
      `const style = { background: theme.buttonPrimaryBackgroundHover };`,
      `const style = { color: theme.reportsBlue, backgroundColor: theme.reportsBlue };`,
      `const style = { borderColor: theme.pageText, fill: theme.tableBackground };`,
      `const style = { color: theme.menuAutoCompleteTextHover };`,
      `const style = { backgroundColor: theme.formInputTextBackground };`,
      `const style = { backgroundColor: other.pageText };`,
      `const style = { backgroundColor: theme[name] };`,
      `const style = { backgroundColor: theme.contextMenuHighlight };`,
      `<Icon color={theme.pageTextSubdued} />`,
    ],

    invalid: [
      {
        code: `const style = { backgroundColor: theme.pageText };`,
        output: null,
        errors: [textOnBackground('pageText')],
      },
      {
        code: `const style = { color: theme.tableBackground };`,
        output: null,
        errors: [backgroundOnText('tableBackground')],
      },
      {
        code: `const style = { background: isActive ? theme.pageTextLink : theme.tableBackground };`,
        output: null,
        errors: [textOnBackground('pageTextLink', 'background')],
      },
      {
        code: `const style = { background: \`linear-gradient(\${theme.errorText}, \${theme.errorBackground})\` };`,
        output: null,
        errors: [textOnBackground('errorText', 'background')],
      },
      {
        code: `const style = { '&:hover': { 'background-color': theme.pageTextSubdued } };`,
        output: null,
        errors: [textOnBackground('pageTextSubdued')],
      },
      {
        code: `const style = { backgroundColor: theme.textSecondary, color: theme.backgroundRaised };`,
        output: null,
        errors: [
          textOnBackground('textSecondary'),
          backgroundOnText('backgroundRaised'),
        ],
      },
      {
        code: `<Icon color={theme.pillBackgroundLight} />`,
        output: null,
        errors: [backgroundOnText('pillBackgroundLight')],
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
