/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  rules: {
    // Enforce explicit return types on functions
    '@typescript-eslint/explicit-function-return-type': [
      'error',
      { allowExpressions: true, allowTypedFunctionExpressions: true },
    ],
    // Disallow floating promises (critical in async Playwright tests)
    '@typescript-eslint/no-floating-promises': 'error',
    // Enforce awaiting all promises
    '@typescript-eslint/await-thenable': 'error',
    // Disallow explicit 'any'
    '@typescript-eslint/no-explicit-any': 'error',
    // Prefer interfaces over type aliases for object shapes
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    // Enforce consistent import style
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
    ],
    // Disallow unused variables
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    // No magic numbers (use named constants or test data generators)
    'no-magic-numbers': 'off',
    // Consistent spacing
    'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
    // Enforce trailing commas
    'comma-dangle': ['error', 'always-multiline'],
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'test-results/',
    'playwright-report/',
    '.auth/',
    '*.js',
  ],
};
