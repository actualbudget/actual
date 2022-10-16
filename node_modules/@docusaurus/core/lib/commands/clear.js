"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.clear = void 0;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const utils_1 = require("@docusaurus/utils");
async function removePath(entry) {
    if (!(await fs_extra_1.default.pathExists(entry.path))) {
        return;
    }
    try {
        await fs_extra_1.default.remove(entry.path);
        logger_1.default.success `Removed the ${entry.description} at path=${entry.path}.`;
    }
    catch (err) {
        logger_1.default.error `Could not remove the ${entry.description} at path=${entry.path}.`;
        logger_1.default.error(err);
    }
}
async function clear(siteDirParam = '.') {
    const siteDir = await fs_extra_1.default.realpath(siteDirParam);
    const generatedFolder = {
        path: path_1.default.join(siteDir, utils_1.GENERATED_FILES_DIR_NAME),
        description: 'generated folder',
    };
    const buildFolder = {
        path: path_1.default.join(siteDir, utils_1.DEFAULT_BUILD_DIR_NAME),
        description: 'build output folder',
    };
    // In Yarn PnP, cache is stored in `.yarn/.cache` because n_m doesn't exist
    const cacheFolders = ['node_modules', '.yarn'].map((p) => ({
        path: path_1.default.join(siteDir, p, '.cache'),
        description: 'Webpack persistent cache folder',
    }));
    await Promise.all([generatedFolder, buildFolder, ...cacheFolders].map(removePath));
}
exports.clear = clear;
