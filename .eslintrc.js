const path = require('path');

const rulesDirPlugin = require('eslint-plugin-rulesdir');
rulesDirPlugin.RULES_DIR = path.join(
  __dirname,
  'packages',
  'eslint-plugin-actual',
  'lib',
  'rules',
);

module.exports = {
  plugins: ['prettier', 'import', 'rulesdir', '@typescript-eslint'],
  extends: ['react-app', 'plugin:@typescript-eslint/recommended'],
  reportUnusedDisableDirectives: true,
  rules: {
    'prettier/prettier': 'error',
    'no-unused-vars': [
      'error',
      {
        args: 'none',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],

    'no-restricted-globals': ['error'].concat(
      require('confusing-browser-globals').filter(g => g !== 'self'),
    ),

    'rulesdir/typography': 'error',

    // https://github.com/eslint/eslint/issues/16954
    // https://github.com/eslint/eslint/issues/16953
    'no-loop-func': 'off',

    // TODO: re-enable these rules
    'react-hooks/exhaustive-deps': 'off',

    'import/no-useless-path-segments': 'error',
    'import/order': [
      'error',
      {
        alphabetize: {
          caseInsensitive: true,
          order: 'asc',
        },
        groups: [
          'builtin', // Built-in types are first
          'external',
          'parent',
          'sibling',
          'index', // Then the index file
        ],
        'newlines-between': 'always',
        pathGroups: [
          // Enforce that React (and react-related packages) is the first import
          { group: 'builtin', pattern: 'react?(-*)', position: 'before' },
          // Separate imports from Actual from "real" external imports
          {
            group: 'external',
            pattern: 'loot-{core,design}/**/*',
            position: 'after',
          },
        ],
        pathGroupsExcludedImportTypes: ['react'],
      },
    ],

    // Rules disable during TS migration
    '@typescript-eslint/no-var-requires': 'off',
    'prefer-const': 'off',
    'prefer-spread': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
  },
};
