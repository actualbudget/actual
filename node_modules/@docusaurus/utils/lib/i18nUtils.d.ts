/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { TranslationFileContent, TranslationFile, I18n } from '@docusaurus/types';
/**
 * Takes a list of translation file contents, and shallow-merges them into one.
 */
export declare function mergeTranslations(contents: TranslationFileContent[]): TranslationFileContent;
/**
 * Useful to update all the messages of a translation file. Used in tests to
 * simulate translations.
 */
export declare function updateTranslationFileMessages(translationFile: TranslationFile, updateMessage: (message: string) => string): TranslationFile;
/**
 * Takes everything needed and constructs a plugin i18n path. Plugins should
 * expect everything it needs for translations to be found under this path.
 */
export declare function getPluginI18nPath({ localizationDir, pluginName, pluginId, subPaths, }: {
    localizationDir: string;
    pluginName: string;
    pluginId?: string | undefined;
    subPaths?: string[];
}): string;
/**
 * Takes a path and returns a localized a version (which is basically `path +
 * i18n.currentLocale`).
 *
 * This is used to resolve the `outDir` and `baseUrl` of each locale; it is NOT
 * used to determine plugin localization file locations.
 */
export declare function localizePath({ pathType, path: originalPath, i18n, options, }: {
    /**
     * FS paths will treat Windows specially; URL paths will always have a
     * trailing slash to make it a valid base URL.
     */
    pathType: 'fs' | 'url';
    /** The path, URL or file path, to be localized. */
    path: string;
    /** The current i18n context. */
    i18n: I18n;
    options?: {
        /**
         * By default, we don't localize the path of defaultLocale. This option
         * would override that behavior. Setting `false` is useful for `yarn build
         * -l zh-Hans` to always emit into the root build directory.
         */
        localizePath?: boolean;
    };
}): string;
//# sourceMappingURL=i18nUtils.d.ts.map