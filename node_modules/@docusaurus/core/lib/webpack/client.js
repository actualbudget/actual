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
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const webpack_merge_1 = tslib_1.__importDefault(require("webpack-merge"));
const base_1 = require("./base");
const ChunkAssetPlugin_1 = tslib_1.__importDefault(require("./plugins/ChunkAssetPlugin"));
const LogPlugin_1 = tslib_1.__importDefault(require("./plugins/LogPlugin"));
async function createClientConfig(props, minify = true) {
    const isBuilding = process.argv[2] === 'build';
    const config = await (0, base_1.createBaseConfig)(props, false, minify);
    const clientConfig = (0, webpack_merge_1.default)(config, {
        // Useless, disabled on purpose (errors on existing sites with no
        // browserslist config)
        // target: 'browserslist',
        entry: path_1.default.resolve(__dirname, '../client/clientEntry.js'),
        optimization: {
            // Keep the runtime chunk separated to enable long term caching
            // https://twitter.com/wSokra/status/969679223278505985
            runtimeChunk: true,
        },
        plugins: [
            new ChunkAssetPlugin_1.default(),
            // Show compilation progress bar and build time.
            new LogPlugin_1.default({
                name: 'Client',
            }),
        ],
    });
    // When building, include the plugin to force terminate building if errors
    // happened in the client bundle.
    if (isBuilding) {
        clientConfig.plugins?.push({
            apply: (compiler) => {
                compiler.hooks.done.tap('client:done', (stats) => {
                    if (stats.hasErrors()) {
                        logger_1.default.error('Client bundle compiled with errors therefore further build is impossible.');
                        process.exit(1);
                    }
                });
            },
        });
    }
    return clientConfig;
}
exports.default = createClientConfig;
