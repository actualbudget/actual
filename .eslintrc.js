module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'react-app'
  ],
  rules: {
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    'import/no-anonymous-default-export': 'off',
    'no-async-promise-executor': 'off',
    'no-case-declarations': 'off',
    'no-constant-condition': 'off',
    'no-empty': 'off',
    'no-import-assign': 'off',
    'no-inner-declarations': 'off',
    'no-loop-func': 'off',
    'no-prototype-builtins': 'off',
    'no-restricted-globals': 'off',
    'no-unused-vars': 'off',
    'no-useless-catch': 'off',
    'prefer-const': 'off',
    'react-hooks/rules-of-hooks': 'off',
    'react-hooks/exhaustive-deps': 'off'
  }
};
