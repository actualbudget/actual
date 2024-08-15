import i18n from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';

const loadLanguage = (language: string) => {
  return import(`../desktop-client/locale/${language}.json`);
};

i18n.use(resourcesToBackend(loadLanguage)).init({
  // While we mark all strings for translations, one can test
  // it by setting the language in localStorage to their choice.
  // Set this to 'cimode' to see the exact keys without interpolation.
  lng: localStorage.getItem('language') || 'en',

  // allow keys to be phrases having `:`, `.`
  nsSeparator: false,
  keySeparator: false,
  // do not load a fallback
  fallbackLng: false,
  interpolation: {
    escapeValue: false,
  },
});
