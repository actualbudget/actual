module.exports = {
  input: ['src/**/*.{js,jsx,ts,tsx}', '../loot-core/src/**/*.{js,jsx,ts,tsx}'],
  output: 'locale/$LOCALE.json',
  locales: ['untranslated'],
  sort: true,
  keySeparator: false,
  namespaceSeparator: false,
  defaultValue: (locale, ns, key, value) => {
    if (locale === 'untranslated') {
      return value || key;
    }
    return '';
  },
};
