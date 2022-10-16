"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadI18n = exports.getDefaultLocaleConfig = void 0;
const tslib_1 = require("tslib");
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const rtl_detect_1 = require("rtl-detect");
function getDefaultLocaleLabel(locale) {
    const languageName = new Intl.DisplayNames(locale, { type: 'language' }).of(locale);
    return (languageName.charAt(0).toLocaleUpperCase(locale) + languageName.substring(1));
}
function getDefaultLocaleConfig(locale) {
    return {
        label: getDefaultLocaleLabel(locale),
        direction: (0, rtl_detect_1.getLangDir)(locale),
        htmlLang: locale,
        // If the locale name includes -u-ca-xxx the calendar will be defined
        calendar: new Intl.Locale(locale).calendar ?? 'gregory',
        path: locale,
    };
}
exports.getDefaultLocaleConfig = getDefaultLocaleConfig;
async function loadI18n(config, options) {
    const { i18n: i18nConfig } = config;
    const currentLocale = options.locale ?? i18nConfig.defaultLocale;
    if (!i18nConfig.locales.includes(currentLocale)) {
        logger_1.default.warn `The locale name=${currentLocale} was not found in your site configuration: Available locales are: ${i18nConfig.locales}
Note: Docusaurus only support running one locale at a time.`;
    }
    const locales = i18nConfig.locales.includes(currentLocale)
        ? i18nConfig.locales
        : i18nConfig.locales.concat(currentLocale);
    function getLocaleConfig(locale) {
        return {
            ...getDefaultLocaleConfig(locale),
            ...i18nConfig.localeConfigs[locale],
        };
    }
    const localeConfigs = Object.fromEntries(locales.map((locale) => [locale, getLocaleConfig(locale)]));
    return {
        defaultLocale: i18nConfig.defaultLocale,
        locales,
        path: i18nConfig.path,
        currentLocale,
        localeConfigs,
    };
}
exports.loadI18n = loadI18n;
