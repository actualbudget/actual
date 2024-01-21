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

const restrictedImportColors = [
  {
    group: ['**/style', '**/colors'],
    importNames: ['colors'],
    message: 'Please use themes instead of colors',
  },
];

module.exports = {
  plugins: ['prettier', 'import', 'rulesdir', '@typescript-eslint'],
  extends: [
    'react-app',
    'plugin:react/recommended',
    'plugin:prettier/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: { project: [path.join(__dirname, './tsconfig.json')] },
  reportUnusedDisableDirectives: true,
  globals: {
    globalThis: false,
    vi: true,
  },
  rules: {
    'prettier/prettier': 'warn',

    // Note: base rule explicitly disabled in favor of the TS one
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],

    curly: ['warn', 'multi-line', 'consistent'],

    'no-restricted-globals': ['warn'].concat(
      require('confusing-browser-globals').filter(g => g !== 'self'),
    ),

    'react/jsx-filename-extension': [
      'warn',
      { extensions: ['.jsx', '.tsx'], allow: 'as-needed' },
    ],
    'react/jsx-no-useless-fragment': 'warn',
    'react/self-closing-comp': 'warn',
    'react/no-unstable-nested-components': [
      'warn',
      { allowAsProps: true, customValidators: ['formatter'] },
    ],

    'rulesdir/typography': 'warn',
    'rulesdir/prefer-if-statement': 'warn',

    // https://github.com/eslint/eslint/issues/16954
    // https://github.com/eslint/eslint/issues/16953
    'no-loop-func': 'off',

    // Do don't need this as we're using TypeScript
    'react/prop-types': 'off',

    // TODO: re-enable these rules
    'react-hooks/exhaustive-deps': 'off',
    'react/display-name': 'off',
    'react/react-in-jsx-scope': 'off',
    // 'react-hooks/exhaustive-deps': [
    //   'warn',
    //   {
    //     additionalHooks: 'useLiveQuery',
    //   },
    // ],

    'no-var': 'warn',
    'react/jsx-curly-brace-presence': 'warn',
    'object-shorthand': ['warn', 'properties'],

    'import/extensions': [
      'warn',
      'never',
      {
        json: 'always',
      },
    ],
    'import/no-useless-path-segments': 'warn',
    'import/no-duplicates': ['warn', { 'prefer-inline': true }],
    'import/no-unused-modules': ['warn', { unusedExports: true }],
    'import/order': [
      'warn',
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
      'warn',
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
    'no-restricted-imports': [
      'warn',
      { patterns: [...restrictedImportPatterns, ...restrictedImportColors] },
    ],

    '@typescript-eslint/ban-ts-comment': [
      'error',
      { 'ts-ignore': 'allow-with-description' },
    ],

    // Rules disable during TS migration
    '@typescript-eslint/no-var-requires': 'off',
    'prefer-const': 'warn',
    'prefer-spread': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    'import/no-default-export': 'warn',
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
        '@typescript-eslint/consistent-type-definitions': ['warn', 'type'],
        // enforce import type
        '@typescript-eslint/consistent-type-imports': [
          'warn',
          { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
        ],
        '@typescript-eslint/ban-types': [
          'warn',
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
      files: ['./packages/desktop-client/**/*'],
      excludedFiles: [
        './packages/desktop-client/src/hooks/useNavigate.{ts,tsx}',
      ],
      rules: {
        'no-restricted-imports': [
          'warn',
          {
            patterns: [
              {
                group: ['react-router-dom'],
                importNames: ['useNavigate'],
                message: 'Please use Actual’s useNavigate() hook instead.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['./packages/loot-core/src/**/*'],
      rules: {
        'no-restricted-imports': [
          'warn',
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
        'packages/loot-core/src/types/**/*',
        'packages/loot-core/src/client/state-types/**/*',
        '**/icons/**/*',
        '**/{mocks,__mocks__}/**/*',
        // can't correctly resolve usages
        '**/*.{testing,electron,browser,web,api}.ts',
      ],
      rules: { 'import/no-unused-modules': 'off' },
    },
    {
      files: [
        './packages/desktop-client/src/style/index.*',
        './packages/desktop-client/src/style/palette.*',
      ],
      rules: {
        'no-restricted-imports': ['off', { patterns: restrictedImportColors }],
      },
    },
    {
      files: [
        './packages/api/migrations/*',
        './packages/loot-core/migrations/*',
      ],
      rules: {
        'import/no-default-export': 'off',
      },
    },
  ],
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
      },
    },
  },
};
