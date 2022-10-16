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
const webpack_merge_1 = tslib_1.__importDefault(require("webpack-merge"));
const utils_1 = require("@docusaurus/utils");
// Forked for Docusaurus: https://github.com/slorber/static-site-generator-webpack-plugin
const static_site_generator_webpack_plugin_1 = tslib_1.__importDefault(require("@slorber/static-site-generator-webpack-plugin"));
const base_1 = require("./base");
const WaitPlugin_1 = tslib_1.__importDefault(require("./plugins/WaitPlugin"));
const LogPlugin_1 = tslib_1.__importDefault(require("./plugins/LogPlugin"));
const ssr_html_template_1 = tslib_1.__importDefault(require("./templates/ssr.html.template"));
async function createServerConfig({ props, onLinksCollected, onHeadTagsCollected, }) {
    const { baseUrl, routesPaths, generatedFilesDir, headTags, preBodyTags, postBodyTags, siteConfig: { noIndex, trailingSlash, ssrTemplate }, } = props;
    const config = await (0, base_1.createBaseConfig)(props, true);
    const routesLocation = {};
    // Array of paths to be rendered. Relative to output directory
    const ssgPaths = routesPaths.map((str) => {
        const ssgPath = baseUrl === '/' ? str : str.replace(new RegExp(`^${baseUrl}`), '/');
        routesLocation[ssgPath] = str;
        return ssgPath;
    });
    const serverConfig = (0, webpack_merge_1.default)(config, {
        target: `node${utils_1.NODE_MAJOR_VERSION}.${utils_1.NODE_MINOR_VERSION}`,
        entry: {
            main: path_1.default.resolve(__dirname, '../client/serverEntry.js'),
        },
        output: {
            filename: 'server.bundle.js',
            libraryTarget: 'commonjs2',
            // Workaround for Webpack 4 Bug (https://github.com/webpack/webpack/issues/6522)
            globalObject: 'this',
        },
        plugins: [
            // Wait until manifest from client bundle is generated
            new WaitPlugin_1.default({
                filepath: path_1.default.join(generatedFilesDir, 'client-manifest.json'),
            }),
            // Static site generator webpack plugin.
            new static_site_generator_webpack_plugin_1.default({
                entry: 'main',
                locals: {
                    baseUrl,
                    generatedFilesDir,
                    routesLocation,
                    headTags,
                    preBodyTags,
                    postBodyTags,
                    onLinksCollected,
                    onHeadTagsCollected,
                    ssrTemplate: ssrTemplate ?? ssr_html_template_1.default,
                    noIndex,
                    DOCUSAURUS_VERSION: utils_1.DOCUSAURUS_VERSION,
                },
                paths: ssgPaths,
                preferFoldersOutput: trailingSlash,
                // When using "new URL('file.js', import.meta.url)", Webpack will emit
                // __filename, and this plugin will throw. not sure the __filename value
                // has any importance for this plugin, just using an empty string to
                // avoid the error. See https://github.com/facebook/docusaurus/issues/4922
                globals: { __filename: '' },
                // Secret way to set SSR plugin concurrency option
                // Waiting for feedback before documenting this officially?
                concurrency: process.env.DOCUSAURUS_SSR_CONCURRENCY
                    ? parseInt(process.env.DOCUSAURUS_SSR_CONCURRENCY, 10)
                    : undefined,
            }),
            // Show compilation progress bar.
            new LogPlugin_1.default({
                name: 'Server',
                color: 'yellow',
            }),
        ],
    });
    return serverConfig;
}
exports.default = createServerConfig;
