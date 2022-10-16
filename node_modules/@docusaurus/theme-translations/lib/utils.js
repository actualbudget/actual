"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractThemeCodeMessages = exports.getThemes = void 0;
const tslib_1 = require("tslib");
// This file isn't used by index.ts. It's used by update.mjs and tests. It's
// only here so that (a) we get a partially typed infrastructure (although the
// update script has ts-check anyways) (b) the test coverage isn't destroyed by
// the untested update.mjs file (c) we can ergonomically import the util
// functions in the Jest test without using `await import`
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
// Unsafe import, should we create a package for the translationsExtractor ?;
const translationsExtractor_1 = require("@docusaurus/core/lib/server/translations/translationsExtractor");
async function getPackageCodePath(packageName) {
    const packagePath = path_1.default.join(__dirname, '../..', packageName);
    const packageJsonPath = path_1.default.join(packagePath, 'package.json');
    const { main } = (await fs_extra_1.default.readJSON(packageJsonPath));
    const packageSrcPath = path_1.default.join(packagePath, path_1.default.dirname(main));
    return packageSrcPath;
}
async function getThemes() {
    return [
        {
            name: 'theme-common',
            src: [
                await getPackageCodePath('docusaurus-theme-classic'),
                await getPackageCodePath('docusaurus-theme-common'),
            ],
        },
        {
            name: 'theme-search-algolia',
            src: [await getPackageCodePath('docusaurus-theme-search-algolia')],
        },
        {
            name: 'theme-live-codeblock',
            src: [await getPackageCodePath('docusaurus-theme-live-codeblock')],
        },
        {
            name: 'plugin-pwa',
            src: [await getPackageCodePath('docusaurus-plugin-pwa')],
        },
        {
            name: 'plugin-ideal-image',
            src: [await getPackageCodePath('docusaurus-plugin-ideal-image')],
        },
    ];
}
exports.getThemes = getThemes;
async function extractThemeCodeMessages(targetDirs) {
    // eslint-disable-next-line no-param-reassign
    targetDirs ?? (targetDirs = (await getThemes()).flatMap((theme) => theme.src));
    const filePaths = (await (0, translationsExtractor_1.globSourceCodeFilePaths)(targetDirs)).filter((filePath) => ['.js', '.jsx'].includes(path_1.default.extname(filePath)));
    const filesExtractedTranslations = await (0, translationsExtractor_1.extractAllSourceCodeFileTranslations)(filePaths, {
        presets: [require.resolve('@docusaurus/core/lib/babel/preset')],
    });
    filesExtractedTranslations.forEach((fileExtractedTranslations) => {
        if (fileExtractedTranslations.warnings.length > 0) {
            throw new Error(`
Please make sure all theme translations are static!
Some warnings were found!

${fileExtractedTranslations.warnings.join('\n\n')}
`);
        }
    });
    const translations = filesExtractedTranslations.reduce((acc, extractedTranslations) => ({
        ...acc,
        ...extractedTranslations.translations,
    }), {});
    return translations;
}
exports.extractThemeCodeMessages = extractThemeCodeMessages;
//# sourceMappingURL=utils.js.map