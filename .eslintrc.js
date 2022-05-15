module.exports = {
  root: true,
  env: {
    browser: true,
    amd: true,
    node: true
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier'],
  extends: ['eslint:recommended', "plugin:@typescript-eslint/recommended"],
  rules: {
    "@typescript-eslint/no-var-requires": "off"
  }
};
