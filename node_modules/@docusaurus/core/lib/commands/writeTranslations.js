"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeTranslations = void 0;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const server_1 = require("../server");
const init_1 = require("../server/plugins/init");
const translations_1 = require("../server/translations/translations");
const translationsExtractor_1 = require("../server/translations/translationsExtractor");
const utils_1 = require("../webpack/utils");
function resolveThemeCommonLibDir() {
    try {
        return path_1.default.dirname(require.resolve('@docusaurus/theme-common'));
    }
    catch {
        return undefined;
    }
}
/**
 * This is a hack, so that @docusaurus/theme-common translations are extracted!
 * A theme doesn't have a way to express that one of its dependency (like
 * @docusaurus/theme-common) also has translations to extract.
 * Instead of introducing a new lifecycle (like `getThemeTranslationPaths()`?)
 * We just make an exception and assume that user is using an official theme
 */
async function getExtraSourceCodeFilePaths() {
    const themeCommonLibDir = resolveThemeCommonLibDir();
    if (!themeCommonLibDir) {
        return []; // User may not use a Docusaurus official theme? Quite unlikely...
    }
    return (0, translationsExtractor_1.globSourceCodeFilePaths)([themeCommonLibDir]);
}
async function writePluginTranslationFiles({ localizationDir, plugin, options, }) {
    if (plugin.getTranslationFiles) {
        const content = await plugin.loadContent?.();
        const translationFiles = await plugin.getTranslationFiles({
            content,
        });
        await Promise.all(translationFiles.map(async (translationFile) => {
            await (0, translations_1.writePluginTranslations)({
                localizationDir,
                plugin,
                translationFile,
                options,
            });
        }));
    }
}
async function writeTranslations(siteDirParam = '.', options = {}) {
    const siteDir = await fs_extra_1.default.realpath(siteDirParam);
    const context = await (0, server_1.loadContext)({
        siteDir,
        config: options.config,
        locale: options.locale,
    });
    const { localizationDir } = context;
    const plugins = await (0, init_1.initPlugins)(context);
    const locale = options.locale ?? context.i18n.defaultLocale;
    if (!context.i18n.locales.includes(locale)) {
        throw new Error(`Can't write-translation for locale "${locale}" that is not in the locale configuration file.
Available locales are: ${context.i18n.locales.join(',')}.`);
    }
    const babelOptions = (0, utils_1.getBabelOptions)({
        isServer: true,
        babelOptions: await (0, utils_1.getCustomBabelConfigFilePath)(siteDir),
    });
    const extractedCodeTranslations = await (0, translationsExtractor_1.extractSiteSourceCodeTranslations)(siteDir, plugins, babelOptions, await getExtraSourceCodeFilePaths());
    const defaultCodeMessages = await (0, translations_1.getPluginsDefaultCodeTranslationMessages)(plugins);
    const codeTranslations = (0, translations_1.applyDefaultCodeTranslations)({
        extractedCodeTranslations,
        defaultCodeMessages,
    });
    await (0, translations_1.writeCodeTranslations)({ localizationDir }, codeTranslations, options);
    await Promise.all(plugins.map(async (plugin) => {
        await writePluginTranslationFiles({ localizationDir, plugin, options });
    }));
}
exports.writeTranslations = writeTranslations;
