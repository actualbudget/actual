import { initReactI18next } from 'react-i18next';

import i18n from 'i18next';

import enUKCore from 'loot-core/src/locales/en-GB.json';
import esESCore from 'loot-core/src/locales/es-ES.json';
import enUKDesign from 'loot-design/src/locales/en-GB.json';
import esESDesign from 'loot-design/src/locales/es-ES.json';

import enUK from './en-GB.json';
import esES from './es-ES.json';

const resources = {
  en: {
    web: enUK,
    design: enUKDesign,
    core: enUKCore
  },
  es: {
    web: esES,
    design: esESDesign,
    core: esESCore
  }
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    defaultNS: 'web',
    lng: 'es', // language to use, more information here: https://www.i18next.com/overview/configuration-options#languages-namespaces-resources
    // you can use the i18n.changeLanguage function to change the language manually: https://www.i18next.com/overview/api#changelanguage
    // if you're using a language detector, do not define the lng option

    // We enforce that a locales have all keys so we treat empty string as missing value.
    returnEmptyString: false,
    fallbackLng: 'en',

    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
