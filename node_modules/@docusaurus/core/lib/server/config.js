"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSiteConfig = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const import_fresh_1 = tslib_1.__importDefault(require("import-fresh"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const utils_1 = require("@docusaurus/utils");
const configValidation_1 = require("./configValidation");
async function findConfig(siteDir) {
    // We could support .mjs, .ts, etc. in the future
    const candidates = ['.js', '.cjs'].map((ext) => utils_1.DEFAULT_CONFIG_FILE_NAME + ext);
    const configPath = await (0, utils_1.findAsyncSequential)(candidates.map((file) => path_1.default.join(siteDir, file)), fs_extra_1.default.pathExists);
    if (!configPath) {
        logger_1.default.error('No config file found.');
        logger_1.default.info `Expected one of:${candidates}
You can provide a custom config path with the code=${'--config'} option.`;
        throw new Error();
    }
    return configPath;
}
async function loadSiteConfig({ siteDir, customConfigFilePath, }) {
    const siteConfigPath = customConfigFilePath
        ? path_1.default.resolve(siteDir, customConfigFilePath)
        : await findConfig(siteDir);
    if (!(await fs_extra_1.default.pathExists(siteConfigPath))) {
        throw new Error(`Config file at "${siteConfigPath}" not found.`);
    }
    const importedConfig = (0, import_fresh_1.default)(siteConfigPath);
    const loadedConfig = typeof importedConfig === 'function'
        ? await importedConfig()
        : await importedConfig;
    const siteConfig = (0, configValidation_1.validateConfig)(loadedConfig, path_1.default.relative(siteDir, siteConfigPath));
    return { siteConfig, siteConfigPath };
}
exports.loadSiteConfig = loadSiteConfig;
