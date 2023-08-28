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
    'react/self-closing-comp': 'error',

    'rulesdir/typography': 'error',
    'rulesdir/prefer-if-statement': 'error',

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
    'no-restricted-imports': [
      'error',
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
        './packages/desktop-client/public/index.html',
        './packages/desktop-client/src/components/BankSyncStatus.*',
        './packages/desktop-client/src/components/LoggedInUser.*',
        './packages/desktop-client/src/components/MobileWebMessage.*',
        './packages/desktop-client/src/components/NotesButton.*',
        './packages/desktop-client/src/components/Notifications.*',
        './packages/desktop-client/src/components/Page.*',
        './packages/desktop-client/src/components/SidebarWithData.*',
        './packages/desktop-client/src/components/Titlebar.*',
        './packages/desktop-client/src/components/UpdateNotification.*',
        './packages/desktop-client/src/components/accounts/Header.*',
        './packages/desktop-client/src/components/alerts.*',
        './packages/desktop-client/src/components/budget/MobileBudget.*',
        './packages/desktop-client/src/components/budget/MobileBudgetTable.*',
        './packages/desktop-client/src/components/budget/MobileTable.*',
        './packages/desktop-client/src/components/budget/MonthCountSelector.*',
        './packages/desktop-client/src/components/budget/MonthPicker.*',
        './packages/desktop-client/src/components/budget/constants.*',
        './packages/desktop-client/src/components/budget/misc.*',
        './packages/desktop-client/src/components/budget/rollover/BudgetSummary.*',
        './packages/desktop-client/src/components/budget/rollover/rollover-components.*',
        './packages/desktop-client/src/components/budget/util.*',
        './packages/desktop-client/src/components/common/ExternalLink.*',
        './packages/desktop-client/src/components/manager/BudgetList.*',
        './packages/desktop-client/src/components/manager/ConfigServer.*',
        './packages/desktop-client/src/components/manager/DeleteFile.*',
        './packages/desktop-client/src/components/manager/Import.*',
        './packages/desktop-client/src/components/manager/ImportActual.*',
        './packages/desktop-client/src/components/manager/ImportYNAB4.*',
        './packages/desktop-client/src/components/manager/ImportYNAB5.*',
        './packages/desktop-client/src/components/manager/WelcomeScreen.*',
        './packages/desktop-client/src/components/manager/subscribe/Bootstrap.*',
        './packages/desktop-client/src/components/manager/subscribe/ChangePassword.*',
        './packages/desktop-client/src/components/manager/subscribe/Error.*',
        './packages/desktop-client/src/components/manager/subscribe/Login.*',
        './packages/desktop-client/src/components/manager/subscribe/common.*',
        './packages/desktop-client/src/components/modals/BudgetSummary.*',
        './packages/desktop-client/src/components/modals/ConfirmCategoryDelete.*',
        './packages/desktop-client/src/components/modals/CreateEncryptionKey.*',
        './packages/desktop-client/src/components/modals/EditField.*',
        './packages/desktop-client/src/components/modals/FixEncryptionKey.*',
        './packages/desktop-client/src/components/modals/GoCardlessExternalMsg.*',
        './packages/desktop-client/src/components/modals/ImportTransactions.*',
        './packages/desktop-client/src/components/modals/LoadBackup.*',
        './packages/desktop-client/src/components/modals/MergeUnusedPayees.*',
        './packages/desktop-client/src/components/modals/PlaidExternalMsg.*',
        './packages/desktop-client/src/components/payees/index.*',
        './packages/desktop-client/src/components/schedules/DiscoverSchedules.*',
        './packages/desktop-client/src/components/schedules/EditSchedule.*',
        './packages/desktop-client/src/components/schedules/LinkSchedule.*',
        './packages/desktop-client/src/components/schedules/PostsOfflineNotification.*',
        './packages/desktop-client/src/components/schedules/SchedulesTable.*',
        './packages/desktop-client/src/components/schedules/StatusBadge.*',
        './packages/desktop-client/src/components/schedules/index.*',
        './packages/desktop-client/src/components/select/DateSelect.*',
        './packages/desktop-client/src/components/select/RecurringSchedulePicker.*',
        './packages/desktop-client/src/components/sidebar.*',
        './packages/desktop-client/src/components/transactions/MobileTransaction.*',
        './packages/desktop-client/src/components/transactions/TransactionsTable.*',
        './packages/desktop-client/src/components/util/AmountInput.*',
        './packages/desktop-client/src/components/util/DisplayId.*',
        './packages/desktop-client/src/components/util/LoadComponent.*',
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
