/* eslint-disable rulesdir/typography */
const path = require('path');

const rulesDirPlugin = require('eslint-plugin-rulesdir');
rulesDirPlugin.RULES_DIR = path.join(
  __dirname,
  'packages',
  'eslint-plugin-actual',
  'lib',
  'rules',
);

const ruleFCMsg =
  'Type the props argument and let TS infer or use ComponentType for a component prop';

const restrictedImportPatterns = [
  {
    group: ['*.api', '*.web', '*.electron'],
    message: 'Don’t directly reference imports from other platforms',
  },
  {
    group: ['uuid'],
    importNames: ['*'],
    message: "Use `import { v4 as uuidv4 } from 'uuid'` instead",
  },
];

module.exports = {
  plugins: ['prettier', 'import', 'rulesdir', '@typescript-eslint'],
  extends: ['react-app', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: { project: [path.join(__dirname, './tsconfig.json')] },
  reportUnusedDisableDirectives: true,
  rules: {
    'prettier/prettier': 'error',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        args: 'none',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],

    curly: ['error', 'multi-line', 'consistent'],

    'no-restricted-globals': ['error'].concat(
      require('confusing-browser-globals').filter(g => g !== 'self'),
    ),

    'react/jsx-no-useless-fragment': 'error',

    'rulesdir/typography': 'error',

    // https://github.com/eslint/eslint/issues/16954
    // https://github.com/eslint/eslint/issues/16953
    'no-loop-func': 'off',

    // TODO: re-enable these rules
    'react-hooks/exhaustive-deps': 'off',
    // 'react-hooks/exhaustive-deps': [
    //   'error',
    //   {
    //     additionalHooks: 'useLiveQuery',
    //   },
    // ],

    'import/extensions': [
      'error',
      'never',
      {
        json: 'always',
      },
    ],
    'import/no-useless-path-segments': 'error',
    'import/no-duplicates': ['error', { 'prefer-inline': true }],
    'import/no-unused-modules': ['error', { unusedExports: true }],
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

    'no-restricted-syntax': [
      'error',
      {
        // forbid React.* as they are legacy https://twitter.com/dan_abramov/status/1308739731551858689
        selector:
          ":matches(MemberExpression[object.name='React'], TSQualifiedName[left.name='React'])",
        message:
          'Using default React import is discouraged, please use named exports directly instead.',
      },
      {
        // forbid <a> in favor of <LinkButton> or <ExternalLink>
        selector: 'JSXOpeningElement[name.name="a"]',
        message:
          'Using <a> is discouraged, please use <LinkButton> or <ExternalLink> instead.',
      },
    ],
    'no-restricted-imports': ['error', { patterns: restrictedImportPatterns }],

    // Rules disable during TS migration
    '@typescript-eslint/no-var-requires': 'off',
    'prefer-const': 'off',
    'prefer-spread': 'off',
    '@typescript-eslint/no-empty-function': 'off',
  },
  overrides: [
    {
      files: ['.eslintrc.js', './**/.eslintrc.js'],
      parserOptions: { project: null },
      rules: {
        '@typescript-eslint/consistent-type-exports': 'off',
      },
    },
    {
      files: [
        './packages/desktop-client/**/*.{ts,tsx}',
        './packages/loot-core/src/client/**/*.{ts,tsx}',
      ],
      rules: {
        // enforce type over interface
        '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
        // enforce import type
        '@typescript-eslint/consistent-type-imports': [
          'error',
          { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
        ],
        '@typescript-eslint/ban-types': [
          'error',
          {
            types: {
              // forbid FC as superflous
              FunctionComponent: { message: ruleFCMsg },
              FC: { message: ruleFCMsg },
            },
            extendDefaults: true,
          },
        ],
      },
    },
    {
      files: ['./packages/loot-core/src/**/*'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              ...restrictedImportPatterns,
              {
                group: ['loot-core/**'],
                message:
                  'Please use relative imports in loot-core instead of importing from `loot-core/*`',
              },
            ],
          },
        ],
      },
    },
    {
      files: [
        '**/icons/**/*.js',
        '**/mocks/**/*.{js,ts,tsx}',
        '**/{mocks,__mocks__}/*.{js,ts,tsx}',
        // can't correctly resolve usages
        '**/*.{testing,electron,browser,web,api}.ts',
      ],
      rules: { 'import/no-unused-modules': 'off' },
    },
  ],
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
      },
    },
  },
};
