"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateThemeConfig = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const eta_1 = require("eta");
const utils_1 = require("@docusaurus/utils");
const theme_translations_1 = require("@docusaurus/theme-translations");
const opensearch_1 = tslib_1.__importDefault(require("./templates/opensearch"));
const getCompiledOpenSearchTemplate = lodash_1.default.memoize(() => (0, eta_1.compile)(opensearch_1.default.trim()));
function renderOpenSearchTemplate(data) {
    const compiled = getCompiledOpenSearchTemplate();
    return compiled(data, eta_1.defaultConfig);
}
const OPEN_SEARCH_FILENAME = 'opensearch.xml';
function themeSearchAlgolia(context) {
    const { baseUrl, siteConfig: { title, url, favicon, themeConfig }, i18n: { currentLocale }, } = context;
    const { algolia: { searchPagePath }, } = themeConfig;
    return {
        name: 'docusaurus-theme-search-algolia',
        getThemePath() {
            return '../lib/theme';
        },
        getTypeScriptThemePath() {
            return '../src/theme';
        },
        getDefaultCodeTranslationMessages() {
            return (0, theme_translations_1.readDefaultCodeTranslationMessages)({
                locale: currentLocale,
                name: 'theme-search-algolia',
            });
        },
        contentLoaded({ actions: { addRoute } }) {
            if (searchPagePath) {
                addRoute({
                    path: (0, utils_1.normalizeUrl)([baseUrl, searchPagePath]),
                    component: '@theme/SearchPage',
                    exact: true,
                });
            }
        },
        async postBuild({ outDir }) {
            if (searchPagePath) {
                const siteUrl = (0, utils_1.normalizeUrl)([url, baseUrl]);
                try {
                    await fs_extra_1.default.writeFile(path_1.default.join(outDir, OPEN_SEARCH_FILENAME), renderOpenSearchTemplate({
                        title,
                        siteUrl,
                        searchUrl: (0, utils_1.normalizeUrl)([siteUrl, searchPagePath]),
                        faviconUrl: favicon ? (0, utils_1.normalizeUrl)([siteUrl, favicon]) : null,
                    }));
                }
                catch (err) {
                    logger_1.default.error('Generating OpenSearch file failed.');
                    throw err;
                }
            }
        },
        injectHtmlTags() {
            if (!searchPagePath) {
                return {};
            }
            return {
                headTags: [
                    {
                        tagName: 'link',
                        attributes: {
                            rel: 'search',
                            type: 'application/opensearchdescription+xml',
                            title,
                            href: (0, utils_1.normalizeUrl)([baseUrl, OPEN_SEARCH_FILENAME]),
                        },
                    },
                ],
            };
        },
    };
}
exports.default = themeSearchAlgolia;
var validateThemeConfig_1 = require("./validateThemeConfig");
Object.defineProperty(exports, "validateThemeConfig", { enumerable: true, get: function () { return validateThemeConfig_1.validateThemeConfig; } });
