module.exports = {
  meta: {
    name: 'eslint-plugin-actual',
  },
  rules: {
    'no-untranslated-strings': require('./rules/no-untranslated-strings'),
    'prefer-trans-over-t': require('./rules/prefer-trans-over-t'),
    typography: require('./rules/typography'),
    'prefer-if-statement': require('./rules/prefer-if-statement'),
    'prefer-logger-over-console': require('./rules/prefer-logger-over-console'),
  },
};
