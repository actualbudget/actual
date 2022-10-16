"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const utils_1 = require("@docusaurus/utils");
function pluginDebug({ siteConfig: { baseUrl }, generatedFilesDir, }) {
    const pluginDataDirRoot = path_1.default.join(generatedFilesDir, 'docusaurus-plugin-debug');
    const aliasedSource = (source) => `~debug/${(0, utils_1.posixPath)(path_1.default.relative(pluginDataDirRoot, source))}`;
    return {
        name: 'docusaurus-plugin-debug',
        getThemePath() {
            return '../lib/theme';
        },
        getTypeScriptThemePath() {
            return '../src/theme';
        },
        async contentLoaded({ actions: { createData, addRoute }, allContent }) {
            const allContentPath = await createData(
            // Note that this created data path must be in sync with
            // metadataPath provided to mdx-loader.
            `${(0, utils_1.docuHash)('docusaurus-debug-allContent')}.json`, JSON.stringify(allContent, null, 2));
            // Home is config (duplicate for now)
            addRoute({
                path: (0, utils_1.normalizeUrl)([baseUrl, '__docusaurus/debug']),
                component: '@theme/DebugConfig',
                exact: true,
            });
            addRoute({
                path: (0, utils_1.normalizeUrl)([baseUrl, '__docusaurus/debug/config']),
                component: '@theme/DebugConfig',
                exact: true,
            });
            addRoute({
                path: (0, utils_1.normalizeUrl)([baseUrl, '__docusaurus/debug/metadata']),
                component: '@theme/DebugSiteMetadata',
                exact: true,
            });
            addRoute({
                path: (0, utils_1.normalizeUrl)([baseUrl, '__docusaurus/debug/registry']),
                component: '@theme/DebugRegistry',
                exact: true,
            });
            addRoute({
                path: (0, utils_1.normalizeUrl)([baseUrl, '__docusaurus/debug/routes']),
                component: '@theme/DebugRoutes',
                exact: true,
            });
            addRoute({
                path: (0, utils_1.normalizeUrl)([baseUrl, '__docusaurus/debug/content']),
                component: '@theme/DebugContent',
                exact: true,
                modules: {
                    allContent: aliasedSource(allContentPath),
                },
            });
            addRoute({
                path: (0, utils_1.normalizeUrl)([baseUrl, '__docusaurus/debug/globalData']),
                component: '@theme/DebugGlobalData',
                exact: true,
            });
        },
        configureWebpack() {
            return {
                resolve: {
                    alias: {
                        '~debug': pluginDataDirRoot,
                    },
                },
            };
        },
    };
}
exports.default = pluginDebug;
