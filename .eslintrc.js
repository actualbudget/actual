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
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: { project: [path.join(__dirname, './tsconfig.json')] },
  reportUnusedDisableDirectives: true,
  rules: {
    'prettier/prettier': 'warn',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        args: 'none',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],

    curly: ['warn', 'multi-line', 'consistent'],

    'no-restricted-globals': ['warn'].concat(
      require('confusing-browser-globals').filter(g => g !== 'self'),
    ),

    'react/jsx-no-useless-fragment': 'warn',
    'react/self-closing-comp': 'warn',

    'rulesdir/typography': 'warn',
    'rulesdir/prefer-if-statement': 'warn',

    // https://github.com/eslint/eslint/issues/16954
    // https://github.com/eslint/eslint/issues/16953
    'no-loop-func': 'off',

    // Do don't need this as we're using TypeScript
    'react/prop-types': 'off',

    // TODO: re-enable these rules
    'react-hooks/exhaustive-deps': 'off',
    'react/no-children-prop': 'off',
    'react/display-name': 'off',
    'react/react-in-jsx-scope': 'off',
    // 'react-hooks/exhaustive-deps': [
    //   'warn',
    //   {
    //     additionalHooks: 'useLiveQuery',
    //   },
    // ],

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
      //This is temporary. We will remove these as dark theme gets ported
      files: [
        './packages/desktop-client/src/components/LoggedInUser.*',
        './packages/desktop-client/src/components/MobileWebMessage.*',
        './packages/desktop-client/src/components/NotesButton.*',
        './packages/desktop-client/src/components/Notifications.*',
        './packages/desktop-client/src/components/Page.*',
        './packages/desktop-client/src/components/Titlebar.*',
        './packages/desktop-client/src/components/UpdateNotification.*',
        './packages/desktop-client/src/components/accounts/Header.*',
        './packages/desktop-client/src/components/alerts.*',
        './packages/desktop-client/src/components/budget/BudgetCategories.*',
        './packages/desktop-client/src/components/budget/BudgetTotals.*',
        './packages/desktop-client/src/components/budget/ExpenseGroup.*',
        './packages/desktop-client/src/components/budget/IncomeGroup.*',
        './packages/desktop-client/src/components/budget/MobileBudget.*',
        './packages/desktop-client/src/components/budget/MobileBudgetTable.*',
        './packages/desktop-client/src/components/budget/MobileTable.*',
        './packages/desktop-client/src/components/budget/MonthCountSelector.*',
        './packages/desktop-client/src/components/budget/MonthPicker.*',
        './packages/desktop-client/src/components/budget/RenderMonths.*',
        './packages/desktop-client/src/components/budget/SidebarCategory.*',
        './packages/desktop-client/src/components/budget/SidebarGroup.*',
        './packages/desktop-client/src/components/budget/constants.*',
        './packages/desktop-client/src/components/budget/report/BudgetSummary.*',
        './packages/desktop-client/src/components/budget/report/components.*',
        './packages/desktop-client/src/components/budget/rollover/BudgetSummary.*',
        './packages/desktop-client/src/components/budget/rollover/rollover-components.*',
        './packages/desktop-client/src/components/budget/util.*',
        './packages/desktop-client/src/components/common.*',
        './packages/desktop-client/src/components/common/Card.*',
        './packages/desktop-client/src/components/common/Label.*',
        './packages/desktop-client/src/components/common/View.*',
        './packages/desktop-client/src/components/common/ExternalLink.*',
        './packages/desktop-client/src/components/modals/BudgetSummary.*',
        './packages/desktop-client/src/components/payees/index.*',
        './packages/desktop-client/src/components/reports/CashFlow.*',
        './packages/desktop-client/src/components/reports/Change.*',
        './packages/desktop-client/src/components/reports/DateRange.*',
        './packages/desktop-client/src/components/reports/Header.*',
        './packages/desktop-client/src/components/reports/NetWorth.*',
        './packages/desktop-client/src/components/reports/Overview.*',
        './packages/desktop-client/src/components/reports/Tooltip.*',
        './packages/desktop-client/src/components/reports/chart-theme.*',
        './packages/desktop-client/src/components/reports/graphs/CashFlowGraph.*',
        './packages/desktop-client/src/components/reports/graphs/NetWorthGraph.*',
        './packages/desktop-client/src/components/settings/Encryption.*',
        './packages/desktop-client/src/components/settings/Experimental.*',
        './packages/desktop-client/src/components/settings/FixSplits.*',
        './packages/desktop-client/src/components/settings/Format.*',
        './packages/desktop-client/src/components/settings/Global.*',
        './packages/desktop-client/src/components/settings/UI.*',
        './packages/desktop-client/src/components/settings/index.*',
        './packages/desktop-client/src/components/transactions/MobileTransaction.*',
        './packages/desktop-client/src/components/transactions/TransactionsTable.*',
        './packages/desktop-client/src/components/util/AmountInput.*',
        './packages/desktop-client/src/style/*',
      ],
      rules: {
        'no-restricted-imports': ['off', { patterns: restrictedImportColors }],
      },
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
