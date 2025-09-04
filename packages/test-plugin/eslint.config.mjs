import globals from 'globals';

import pluginImport from 'eslint-plugin-import';
import pluginJSXA11y from 'eslint-plugin-jsx-a11y';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginTypescript from 'typescript-eslint';
import pluginTypescriptPaths from 'eslint-plugin-typescript-paths';
import pluginActual from '../../packages/eslint-plugin-actual/lib/index.js';

import tsParser from '@typescript-eslint/parser';

const confusingBrowserGlobals = [
  // https://github.com/facebook/create-react-app/tree/main/packages/confusing-browser-globals
  'addEventListener',
  'blur',
  'close',
  'closed',
  'confirm',
  'defaultStatus',
  'defaultstatus',
  'event',
  'external',
  'find',
  'focus',
  'frameElement',
  'frames',
  'history',
  'innerHeight',
  'innerWidth',
  'length',
  'location',
  'locationbar',
  'menubar',
  'moveBy',
  'moveTo',
  'name',
  'onblur',
  'onerror',
  'onfocus',
  'onload',
  'onresize',
  'onunload',
  'open',
  'opener',
  'opera',
  'outerHeight',
  'outerWidth',
  'pageXOffset',
  'pageYOffset',
  'parent',
  'print',
  'removeEventListener',
  'resizeBy',
  'resizeTo',
  'screen',
  'screenLeft',
  'screenTop',
  'screenX',
  'screenY',
  'scroll',
  'scrollbars',
  'scrollBy',
  'scrollTo',
  'scrollX',
  'scrollY',
  'status',
  'statusbar',
  'stop',
  'toolbar',
  'top',
];

export default pluginTypescript.config(
  {
    ignores: [
      'packages/test-plugin/build/',
      'packages/test-plugin/dist/',
      'packages/test-plugin/node_modules/',
      'packages/test-plugin/.__mf__temp/',
      '**/dist/',
      '**/build/',
      'dist/',
      'build/',
      '**/.__mf__temp/',
      'eslint.config.mjs',
    ],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.commonjs,
        ...globals.node,
        globalThis: false,
        vi: true,
      },
    },
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
  },
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat['jsx-runtime'],
  pluginTypescript.configs.recommended,
  pluginImport.flatConfigs.recommended,
  {
    plugins: {
      actual: pluginActual,
      'react-hooks': pluginReactHooks,
      'jsx-a11y': pluginJSXA11y,
      'typescript-paths': pluginTypescriptPaths,
    },
    rules: {
      'actual/no-untranslated-strings': 'error',
      'actual/prefer-trans-over-t': 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],

    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2018,
      sourceType: 'module',

      parserOptions: {
        projectService: true,
        ecmaFeatures: {
          jsx: true,
        },

        // typescript-eslint specific options
        warnOnUnsupportedTypeScriptVersion: true,
      },
    },

    // If adding a typescript-eslint version of an existing ESLint rule,
    // make sure to disable the ESLint rule here.
    rules: {
      // TypeScript's `noFallthroughCasesInSwitch` option is more robust (#6906)
      'default-case': 'off',
      // 'tsc' already handles this (https://github.com/typescript-eslint/typescript-eslint/issues/291)
      'no-dupe-class-members': 'off',
      // 'tsc' already handles this (https://github.com/typescript-eslint/typescript-eslint/issues/477)
      'no-undef': 'off',

      // TypeScript already handles these (https://typescript-eslint.io/troubleshooting/typed-linting/performance/#eslint-plugin-import)
      'import/named': 'off',
      'import/namespace': 'off',
      'import/default': 'off',
      'import/no-named-as-default-member': 'off',
      'import/no-unresolved': 'off',

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
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      // enforce import type
      '@typescript-eslint/consistent-type-definitions': ['warn', 'type'],
    },
  },
  {
    // Specific rules for TSX files
    files: ['src/**/*.tsx'],
    rules: {
      // Allow React import in TSX files (common pattern even with new JSX transform)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^React$',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Allow unused error variables in catch blocks
      'no-unused-vars': 'off',
    },
  },
  {
    // Allow default export for the main plugin entry
    files: ['src/index.tsx'],
    rules: {
      'import/no-default-export': 'off',
    },
  },
);
