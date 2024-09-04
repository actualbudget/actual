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
  root: true,
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    jest: true,
    node: true,
  },
  plugins: [
    'prettier',
    'import',
    'rulesdir',
    '@typescript-eslint',
    'jsx-a11y',
    'react-hooks',
  ],
  extends: [
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
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
    // http://eslint.org/docs/rules/
    'array-callback-return': 'warn',
    'default-case': ['warn', { commentPattern: '^no default$' }],
    'dot-location': ['warn', 'property'],
    eqeqeq: ['warn', 'smart'],
    'new-parens': 'warn',
    'no-array-constructor': 'warn',
    'no-caller': 'warn',
    'no-cond-assign': ['warn', 'except-parens'],
    'no-const-assign': 'warn',
    'no-control-regex': 'warn',
    'no-delete-var': 'warn',
    'no-dupe-args': 'warn',
    'no-dupe-class-members': 'warn',
    'no-dupe-keys': 'warn',
    'no-duplicate-case': 'warn',
    'no-empty-character-class': 'warn',
    'no-empty-pattern': 'warn',
    'no-eval': 'warn',
    'no-ex-assign': 'warn',
    'no-extend-native': 'warn',
    'no-extra-bind': 'warn',
    'no-extra-label': 'warn',
    'no-fallthrough': 'warn',
    'no-func-assign': 'warn',
    'no-implied-eval': 'warn',
    'no-invalid-regexp': 'warn',
    'no-iterator': 'warn',
    'no-label-var': 'warn',
    'no-labels': ['warn', { allowLoop: true, allowSwitch: false }],
    'no-lone-blocks': 'warn',
    'no-mixed-operators': [
      'warn',
      {
        groups: [
          ['&', '|', '^', '~', '<<', '>>', '>>>'],
          ['==', '!=', '===', '!==', '>', '>=', '<', '<='],
          ['&&', '||'],
          ['in', 'instanceof'],
        ],
        allowSamePrecedence: false,
      },
    ],
    'no-multi-str': 'warn',
    'no-global-assign': 'warn',
    'no-unsafe-negation': 'warn',
    'no-new-func': 'warn',
    'no-new-object': 'warn',
    'no-new-symbol': 'warn',
    'no-new-wrappers': 'warn',
    'no-obj-calls': 'warn',
    'no-octal': 'warn',
    'no-octal-escape': 'warn',
    'no-redeclare': 'warn',
    'no-regex-spaces': 'warn',
    'no-script-url': 'warn',
    'no-self-assign': 'warn',
    'no-self-compare': 'warn',
    'no-sequences': 'warn',
    'no-shadow-restricted-names': 'warn',
    'no-sparse-arrays': 'warn',
    'no-template-curly-in-string': 'warn',
    'no-this-before-super': 'warn',
    'no-throw-literal': 'warn',
    'no-undef': 'error',
    'no-unreachable': 'warn',
    'no-unused-expressions': [
      'error',
      {
        allowShortCircuit: true,
        allowTernary: true,
        allowTaggedTemplates: true,
      },
    ],
    'no-unused-labels': 'warn',
    'no-use-before-define': [
      'warn',
      {
        functions: false,
        classes: false,
        variables: false,
      },
    ],
    'no-useless-computed-key': 'warn',
    'no-useless-concat': 'warn',
    'no-useless-constructor': 'warn',
    'no-useless-escape': 'warn',
    'no-useless-rename': [
      'warn',
      {
        ignoreDestructuring: false,
        ignoreImport: false,
        ignoreExport: false,
      },
    ],
    'no-with': 'warn',
    'no-whitespace-before-property': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    'require-yield': 'warn',
    'rest-spread-spacing': ['warn', 'never'],
    strict: ['warn', 'never'],
    'unicode-bom': ['warn', 'never'],
    'use-isnan': 'warn',
    'valid-typeof': 'warn',
    'no-restricted-properties': [
      'error',
      {
        object: 'require',
        property: 'ensure',
        message:
          'Please use import() instead. More info: https://facebook.github.io/create-react-app/docs/code-splitting',
      },
      {
        object: 'System',
        property: 'import',
        message:
          'Please use import() instead. More info: https://facebook.github.io/create-react-app/docs/code-splitting',
      },
    ],
    'getter-return': 'warn',

    // https://github.com/benmosher/eslint-plugin-import/tree/master/docs/rules
    'import/first': 'error',
    'import/no-amd': 'error',
    'import/no-anonymous-default-export': 'warn',
    'import/no-webpack-loader-syntax': 'error',

    // https://github.com/yannickcr/eslint-plugin-react/tree/master/docs/rules
    'react/forbid-foreign-prop-types': ['warn', { allowInPropTypes: true }],
    'react/jsx-no-comment-textnodes': 'warn',
    'react/jsx-no-duplicate-props': 'warn',
    'react/jsx-no-target-blank': 'warn',
    'react/jsx-no-undef': 'error',
    'react/jsx-pascal-case': [
      'warn',
      {
        allowAllCaps: true,
        ignore: [],
      },
    ],
    'react/no-danger-with-children': 'warn',
    // Disabled because of undesirable warnings
    // See https://github.com/facebook/create-react-app/issues/5204 for
    // blockers until its re-enabled
    // 'react/no-deprecated': 'warn',
    'react/no-direct-mutation-state': 'warn',
    'react/no-is-mounted': 'warn',
    'react/no-typos': 'error',
    'react/require-render-return': 'error',
    'react/style-prop-object': 'warn',

    // https://github.com/evcohen/eslint-plugin-jsx-a11y/tree/master/docs/rules
    'jsx-a11y/alt-text': 'warn',
    'jsx-a11y/anchor-has-content': 'warn',
    'jsx-a11y/anchor-is-valid': [
      'warn',
      {
        aspects: ['noHref', 'invalidHref'],
      },
    ],
    'jsx-a11y/aria-activedescendant-has-tabindex': 'warn',
    'jsx-a11y/aria-props': 'warn',
    'jsx-a11y/aria-proptypes': 'warn',
    'jsx-a11y/aria-role': ['warn', { ignoreNonDOM: true }],
    'jsx-a11y/aria-unsupported-elements': 'warn',
    'jsx-a11y/heading-has-content': 'warn',
    'jsx-a11y/iframe-has-title': 'warn',
    'jsx-a11y/img-redundant-alt': 'warn',
    'jsx-a11y/no-access-key': 'warn',
    'jsx-a11y/no-distracting-elements': 'warn',
    'jsx-a11y/no-redundant-roles': 'warn',
    'jsx-a11y/role-has-required-aria-props': 'warn',
    'jsx-a11y/role-supports-aria-props': 'warn',
    'jsx-a11y/scope': 'warn',

    // https://github.com/facebook/react/tree/main/packages/eslint-plugin-react-hooks
    'react-hooks/rules-of-hooks': 'error',

    'prettier/prettier': 'warn',

    // Note: base rule explicitly disabled in favor of the TS one
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        varsIgnorePattern: '^(_|React)',
        ignoreRestSiblings: true,
        caughtErrors: 'none',
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
    'react/react-in-jsx-scope': 'off',

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
        // forbid <a> in favor of <Link>
        selector: 'JSXOpeningElement[name.name="a"]',
        message: 'Using <a> is discouraged, please use <Link> instead.',
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
    '@typescript-eslint/no-require-imports': 'off',
    'import/no-default-export': 'warn',
  },
  overrides: [
    {
      files: ['**/*.ts?(x)'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },

        // typescript-eslint specific options
        warnOnUnsupportedTypeScriptVersion: true,
      },
      plugins: ['@typescript-eslint'],
      // If adding a typescript-eslint version of an existing ESLint rule,
      // make sure to disable the ESLint rule here.
      rules: {
        // TypeScript's `noFallthroughCasesInSwitch` option is more robust (#6906)
        'default-case': 'off',
        // 'tsc' already handles this (https://github.com/typescript-eslint/typescript-eslint/issues/291)
        'no-dupe-class-members': 'off',
        // 'tsc' already handles this (https://github.com/typescript-eslint/typescript-eslint/issues/477)
        'no-undef': 'off',

        // Add TypeScript specific rules (and turn off ESLint equivalents)
        '@typescript-eslint/consistent-type-assertions': 'warn',
        'no-array-constructor': 'off',
        '@typescript-eslint/no-array-constructor': 'warn',
        'no-redeclare': 'off',
        '@typescript-eslint/no-redeclare': 'warn',
        'no-use-before-define': 'off',
        '@typescript-eslint/no-use-before-define': [
          'warn',
          {
            functions: false,
            classes: false,
            variables: false,
            typedefs: false,
          },
        ],
        'no-unused-expressions': 'off',
        '@typescript-eslint/no-unused-expressions': [
          'error',
          {
            allowShortCircuit: true,
            allowTernary: true,
            allowTaggedTemplates: true,
          },
        ],
        'no-useless-constructor': 'off',
        '@typescript-eslint/no-useless-constructor': 'warn',
      },
    },
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
        '@typescript-eslint/no-restricted-types': [
          'warn',
          {
            types: {
              // forbid FC as superflous
              FunctionComponent: { message: ruleFCMsg },
              FC: { message: ruleFCMsg },
            },
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
    {
      // TODO: fix the issues in these files
      files: [
        './packages/desktop-client/src/components/accounts/Account.jsx',
        './packages/desktop-client/src/components/accounts/MobileAccount.jsx',
        './packages/desktop-client/src/components/accounts/MobileAccounts.jsx',
        './packages/desktop-client/src/components/App.tsx',
        './packages/desktop-client/src/components/budget/BudgetCategories.jsx',
        './packages/desktop-client/src/components/budget/BudgetSummaries.tsx',
        './packages/desktop-client/src/components/budget/DynamicBudgetTable.tsx',
        './packages/desktop-client/src/components/budget/index.tsx',
        './packages/desktop-client/src/components/budget/MobileBudget.tsx',
        './packages/desktop-client/src/components/budget/rollover/HoldMenu.tsx',
        './packages/desktop-client/src/components/budget/rollover/TransferMenu.tsx',
        './packages/desktop-client/src/components/common/Menu.tsx',
        './packages/desktop-client/src/components/FinancesApp.tsx',
        './packages/desktop-client/src/components/GlobalKeys.ts',
        './packages/desktop-client/src/components/LoggedInUser.tsx',
        './packages/desktop-client/src/components/manager/ManagementApp.jsx',
        './packages/desktop-client/src/components/manager/subscribe/common.tsx',
        './packages/desktop-client/src/components/ManageRules.tsx',
        './packages/desktop-client/src/components/mobile/MobileAmountInput.jsx',
        './packages/desktop-client/src/components/mobile/MobileNavTabs.tsx',
        './packages/desktop-client/src/components/Modals.tsx',
        './packages/desktop-client/src/components/modals/EditRule.jsx',
        './packages/desktop-client/src/components/modals/ImportTransactions.jsx',
        './packages/desktop-client/src/components/modals/MergeUnusedPayees.jsx',
        './packages/desktop-client/src/components/Notifications.tsx',
        './packages/desktop-client/src/components/payees/ManagePayees.jsx',
        './packages/desktop-client/src/components/payees/ManagePayeesWithData.jsx',
        './packages/desktop-client/src/components/payees/PayeeTable.tsx',
        './packages/desktop-client/src/components/reports/graphs/tableGraph/ReportTable.tsx',
        './packages/desktop-client/src/components/reports/graphs/tableGraph/ReportTableTotals.tsx',
        './packages/desktop-client/src/components/reports/reports/CashFlowCard.jsx',
        './packages/desktop-client/src/components/reports/reports/CustomReport.jsx',
        './packages/desktop-client/src/components/reports/reports/NetWorthCard.jsx',
        './packages/desktop-client/src/components/reports/SaveReportName.tsx',
        './packages/desktop-client/src/components/reports/useReport.ts',
        './packages/desktop-client/src/components/schedules/ScheduleDetails.jsx',
        './packages/desktop-client/src/components/schedules/SchedulesTable.tsx',
        './packages/desktop-client/src/components/select/DateSelect.tsx',
        './packages/desktop-client/src/components/sidebar/Tools.tsx',
        './packages/desktop-client/src/components/sort.tsx',
        './packages/desktop-client/src/components/spreadsheet/useSheetValue.ts',
        './packages/desktop-client/src/components/table.tsx',
        './packages/desktop-client/src/components/Titlebar.tsx',
        './packages/desktop-client/src/components/transactions/MobileTransaction.jsx',
        './packages/desktop-client/src/components/transactions/SelectedTransactions.jsx',
        './packages/desktop-client/src/components/transactions/SimpleTransactionsTable.jsx',
        './packages/desktop-client/src/components/transactions/TransactionList.jsx',
        './packages/desktop-client/src/components/transactions/TransactionsTable.jsx',
        './packages/desktop-client/src/components/transactions/TransactionsTable.test.jsx',
        './packages/desktop-client/src/hooks/useAccounts.ts',
        './packages/desktop-client/src/hooks/useCategories.ts',
        './packages/desktop-client/src/hooks/usePayees.ts',
        './packages/desktop-client/src/hooks/useProperFocus.tsx',
        './packages/desktop-client/src/hooks/useSelected.tsx',
        './packages/loot-core/src/client/query-hooks.tsx',
      ],
      rules: {
        'react-hooks/exhaustive-deps': 'off',
      },
    },
    {
      files: [
        '.eslintrc.js',
        '*.test.js',
        '*.test.ts',
        '*.test.jsx',
        '*.test.tsx',
      ],
      rules: {
        'rulesdir/typography': 'off',
      },
    },
  ],
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
      },
    },
  },
};
