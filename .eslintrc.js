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
    'prettier/prettier': 'warn',

    // Note: base rule explicitly disabled in favor of the TS one
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        varsIgnorePattern: '^(_|React)',
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
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
      },
    },
  },
};
