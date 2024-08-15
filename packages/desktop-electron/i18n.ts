import i18n from 'i18next';
import backend from "i18next-electron-fs-backend";

i18n
  .use(backend)
  .init({
    backend: {
      loadPath: "../desktop-client/locale/{{lng}}/{{ns}}.json",
      addPath: "../desktop-client/locale/{{lng}}/{{ns}}.missing.json",
      contextBridgeApiKey: "Actual",
    },

    // While we mark all strings for translations, one can test
    // it by setting the language in localStorage to their choice.
    // Set this to 'cimode' to see the exact keys without interpolation.
    lng: 'en', // FIXME localStorage undefined
    // lng: localStorage.getItem('language') || 'en',

    // allow keys to be phrases having `:`, `.`
    nsSeparator: false,
    keySeparator: false,
    // do not load a fallback
    fallbackLng: false,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
