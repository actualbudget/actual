import { initReactI18next } from 'react-i18next';

import i18n from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';

const loadLanguage = (language: string) => {
  return import(`./locale/${language}.json`);
};

i18n
  .use(initReactI18next)
  .use(resourcesToBackend(loadLanguage))
  .init({
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
    react: {
      transSupportBasicHtmlNodes: false,
    },
  });

const interleaveArrays = (...arrays) =>
  Array.from(
    {
      length: Math.max(...arrays.map(array => array.length)),
    },
    (_, i) => arrays.map(array => array[i]),
  ).flat();

export const i18nObjectList = (value, lng, opt = {}) => {
  const formatter = new Intl.ListFormat(lng, {
    style: 'long',
    type: 'conjunction',
    ...opt,
  });

  const placeholders = Array.from({ length: value.length }, (_, i) => `<${i}>`);
  const formatted = formatter.format(placeholders);
  const parts = formatted.split(/<\d+>/g);
  return interleaveArrays(parts, value);
};
