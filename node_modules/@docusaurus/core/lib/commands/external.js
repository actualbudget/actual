"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.externalCommand = void 0;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const server_1 = require("../server");
const init_1 = require("../server/plugins/init");
async function externalCommand(cli) {
    const siteDir = await fs_extra_1.default.realpath('.');
    const context = await (0, server_1.loadContext)({ siteDir });
    const plugins = await (0, init_1.initPlugins)(context);
    // Plugin Lifecycle - extendCli.
    plugins.forEach((plugin) => {
        plugin.extendCli?.(cli);
    });
}
exports.externalCommand = externalCommand;
