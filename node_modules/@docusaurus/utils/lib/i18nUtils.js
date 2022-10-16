"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.localizePath = exports.getPluginI18nPath = exports.updateTranslationFileMessages = exports.mergeTranslations = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const constants_1 = require("./constants");
const urlUtils_1 = require("./urlUtils");
/**
 * Takes a list of translation file contents, and shallow-merges them into one.
 */
function mergeTranslations(contents) {
    return contents.reduce((acc, content) => ({ ...acc, ...content }), {});
}
exports.mergeTranslations = mergeTranslations;
/**
 * Useful to update all the messages of a translation file. Used in tests to
 * simulate translations.
 */
function updateTranslationFileMessages(translationFile, updateMessage) {
    return {
        ...translationFile,
        content: lodash_1.default.mapValues(translationFile.content, (translation) => ({
            ...translation,
            message: updateMessage(translation.message),
        })),
    };
}
exports.updateTranslationFileMessages = updateTranslationFileMessages;
/**
 * Takes everything needed and constructs a plugin i18n path. Plugins should
 * expect everything it needs for translations to be found under this path.
 */
function getPluginI18nPath({ localizationDir, pluginName, pluginId = constants_1.DEFAULT_PLUGIN_ID, subPaths = [], }) {
    return path_1.default.join(localizationDir, 
    // Make it convenient to use for single-instance
    // ie: return "docs", not "docs-default" nor "docs/default"
    `${pluginName}${pluginId === constants_1.DEFAULT_PLUGIN_ID ? '' : `-${pluginId}`}`, ...subPaths);
}
exports.getPluginI18nPath = getPluginI18nPath;
/**
 * Takes a path and returns a localized a version (which is basically `path +
 * i18n.currentLocale`).
 *
 * This is used to resolve the `outDir` and `baseUrl` of each locale; it is NOT
 * used to determine plugin localization file locations.
 */
function localizePath({ pathType, path: originalPath, i18n, options = {}, }) {
    const shouldLocalizePath = options.localizePath ?? i18n.currentLocale !== i18n.defaultLocale;
    if (!shouldLocalizePath) {
        return originalPath;
    }
    // FS paths need special care, for Windows support. Note: we don't use the
    // locale config's `path` here, because this function is used for resolving
    // outDir, which must be the same as baseUrl. When we have the baseUrl config,
    // we need to sync the two.
    if (pathType === 'fs') {
        return path_1.default.join(originalPath, i18n.currentLocale);
    }
    // Url paths; add a trailing slash so it's a valid base URL
    return (0, urlUtils_1.normalizeUrl)([originalPath, i18n.currentLocale, '/']);
}
exports.localizePath = localizePath;
//# sourceMappingURL=i18nUtils.js.map