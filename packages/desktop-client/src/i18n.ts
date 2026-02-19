import { initReactI18next } from 'react-i18next';

import i18n from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';

import * as Platform from 'loot-core/shared/platform';

import { languages } from './languages';

export const availableLanguages = Platform.isPlaywright
  ? []
  : Object.keys(languages).map(path => path.split('/')[2].split('.')[0]);

const isLanguageAvailable = (language: string) =>
  Object.hasOwn(languages, `/locale/${language}.json`);

const loadLanguage = (language: string) => {
  if (!isLanguageAvailable(language)) {
    throw new Error(`Unknown locale ${language}`);
  }
  return languages[`/locale/${language}.json`]();
};

void i18n
  .use(initReactI18next)
  .use(resourcesToBackend(loadLanguage))
  .init({
    lng: 'en',

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

const resolveLanguage = (language: string) => {
  // English is always available since we use natural-language keys.
  if (language === 'en') return 'en';

  if (isLanguageAvailable(language)) return language;

  const lowercaseLanguage = language.toLowerCase();
  if (lowercaseLanguage !== language) {
    console.info(
      `Unknown locale ${language}, falling back to ${lowercaseLanguage}`,
    );
    return resolveLanguage(lowercaseLanguage);
  }

  if (language.includes('-')) {
    const fallback = language.split('-')[0];
    console.info(`Unknown locale ${language}, falling back to ${fallback}`);
    return resolveLanguage(fallback);
  }

  return undefined;
};

export const setI18NextLanguage = (language: string | null) => {
  const defaultLanguages = Array.isArray(navigator.languages)
    ? navigator.languages
    : [navigator.language || 'en'];
  const languagesToTry = language ? [language] : defaultLanguages;

  let resolved: string | undefined;

  for (const lang of languagesToTry) {
    resolved = resolveLanguage(lang);
    if (resolved) break;
  }

  if (!resolved) {
    // Fall back to English
    console.info(
      language
        ? `Unknown locale ${language}, falling back to en`
        : `Unknown locales [${languagesToTry.join(', ')}] falling back to en`,
    );
    resolved = 'en';
  }

  if (resolved === i18n.language) {
    return; // language is already set
  }

  void i18n.changeLanguage(resolved);
};
