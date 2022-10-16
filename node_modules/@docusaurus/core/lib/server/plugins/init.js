"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.initPlugins = void 0;
const tslib_1 = require("tslib");
const module_1 = require("module");
const path_1 = tslib_1.__importDefault(require("path"));
const utils_1 = require("@docusaurus/utils");
const utils_validation_1 = require("@docusaurus/utils-validation");
const siteMetadata_1 = require("../siteMetadata");
const pluginIds_1 = require("./pluginIds");
const configs_1 = require("./configs");
function getOptionValidationFunction(normalizedPluginConfig) {
    if (normalizedPluginConfig.pluginModule) {
        // Support both CommonJS and ES modules
        return (normalizedPluginConfig.pluginModule.module.default?.validateOptions ??
            normalizedPluginConfig.pluginModule.module.validateOptions);
    }
    return normalizedPluginConfig.plugin.validateOptions;
}
function getThemeValidationFunction(normalizedPluginConfig) {
    if (normalizedPluginConfig.pluginModule) {
        // Support both CommonJS and ES modules
        return (normalizedPluginConfig.pluginModule.module.default?.validateThemeConfig ??
            normalizedPluginConfig.pluginModule.module.validateThemeConfig);
    }
    return normalizedPluginConfig.plugin.validateThemeConfig;
}
/**
 * Runs the plugin constructors and returns their return values. It would load
 * plugin configs from `plugins`, `themes`, and `presets`.
 */
async function initPlugins(context) {
    // We need to resolve plugins from the perspective of the site config, as if
    // we are using `require.resolve` on those module names.
    const pluginRequire = (0, module_1.createRequire)(context.siteConfigPath);
    const pluginConfigs = await (0, configs_1.loadPluginConfigs)(context);
    async function doGetPluginVersion(normalizedPluginConfig) {
        if (normalizedPluginConfig.pluginModule?.path) {
            const pluginPath = pluginRequire.resolve(normalizedPluginConfig.pluginModule.path);
            return (0, siteMetadata_1.getPluginVersion)(pluginPath, context.siteDir);
        }
        return { type: 'local' };
    }
    function doValidateThemeConfig(normalizedPluginConfig) {
        const validateThemeConfig = getThemeValidationFunction(normalizedPluginConfig);
        if (validateThemeConfig) {
            return validateThemeConfig({
                validate: utils_validation_1.normalizeThemeConfig,
                themeConfig: context.siteConfig.themeConfig,
            });
        }
        return context.siteConfig.themeConfig;
    }
    function doValidatePluginOptions(normalizedPluginConfig) {
        const validateOptions = getOptionValidationFunction(normalizedPluginConfig);
        if (validateOptions) {
            return validateOptions({
                validate: utils_validation_1.normalizePluginOptions,
                options: normalizedPluginConfig.options,
            });
        }
        // Important to ensure all plugins have an id
        // as we don't go through the Joi schema that adds it
        return {
            ...normalizedPluginConfig.options,
            id: normalizedPluginConfig.options.id ?? utils_1.DEFAULT_PLUGIN_ID,
        };
    }
    async function initializePlugin(normalizedPluginConfig) {
        const pluginVersion = await doGetPluginVersion(normalizedPluginConfig);
        const pluginOptions = doValidatePluginOptions(normalizedPluginConfig);
        // Side-effect: merge the normalized theme config in the original one
        context.siteConfig.themeConfig = {
            ...context.siteConfig.themeConfig,
            ...doValidateThemeConfig(normalizedPluginConfig),
        };
        const pluginInstance = await normalizedPluginConfig.plugin(context, pluginOptions);
        return {
            ...pluginInstance,
            options: pluginOptions,
            version: pluginVersion,
            path: path_1.default.dirname(normalizedPluginConfig.entryPath),
        };
    }
    const plugins = await Promise.all(pluginConfigs.map(initializePlugin));
    (0, pluginIds_1.ensureUniquePluginInstanceIds)(plugins);
    return plugins;
}
exports.initPlugins = initPlugins;
