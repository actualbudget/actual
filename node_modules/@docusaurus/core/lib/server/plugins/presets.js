"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPresets = void 0;
const tslib_1 = require("tslib");
const module_1 = require("module");
const import_fresh_1 = tslib_1.__importDefault(require("import-fresh"));
const moduleShorthand_1 = require("./moduleShorthand");
/**
 * Calls preset functions, aggregates each of their return values, and returns
 * the plugin and theme configs.
 */
async function loadPresets(context) {
    // We need to resolve plugins from the perspective of the site config, as if
    // we are using `require.resolve` on those module names.
    const presetRequire = (0, module_1.createRequire)(context.siteConfigPath);
    const { presets } = context.siteConfig;
    const plugins = [];
    const themes = [];
    presets.forEach((presetItem) => {
        let presetModuleImport;
        let presetOptions = {};
        if (!presetItem) {
            return;
        }
        if (typeof presetItem === 'string') {
            presetModuleImport = presetItem;
        }
        else {
            [presetModuleImport, presetOptions] = presetItem;
        }
        const presetName = (0, moduleShorthand_1.resolveModuleName)(presetModuleImport, presetRequire, 'preset');
        const presetModule = (0, import_fresh_1.default)(presetRequire.resolve(presetName));
        const preset = (presetModule.default ?? presetModule)(context, presetOptions);
        if (preset.plugins) {
            plugins.push(...preset.plugins);
        }
        if (preset.themes) {
            themes.push(...preset.themes);
        }
    });
    return { plugins, themes };
}
exports.loadPresets = loadPresets;
