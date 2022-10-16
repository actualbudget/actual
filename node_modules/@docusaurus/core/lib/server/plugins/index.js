"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPlugins = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const utils_1 = require("@docusaurus/utils");
const init_1 = require("./init");
const synthetic_1 = require("./synthetic");
const translations_1 = require("../translations/translations");
const routeConfig_1 = require("./routeConfig");
/**
 * Initializes the plugins, runs `loadContent`, `translateContent`,
 * `contentLoaded`, and `translateThemeConfig`. Because `contentLoaded` is
 * side-effect-ful (it generates temp files), so is this function. This function
 * would also mutate `context.siteConfig.themeConfig` to translate it.
 */
async function loadPlugins(context) {
    // 1. Plugin Lifecycle - Initialization/Constructor.
    const plugins = await (0, init_1.initPlugins)(context);
    plugins.push((0, synthetic_1.createBootstrapPlugin)(context), (0, synthetic_1.createMDXFallbackPlugin)(context));
    // 2. Plugin Lifecycle - loadContent.
    // Currently plugins run lifecycle methods in parallel and are not
    // order-dependent. We could change this in future if there are plugins which
    // need to run in certain order or depend on others for data.
    // This would also translate theme config and content upfront, given the
    // translation files that the plugin declares.
    const loadedPlugins = await Promise.all(plugins.map(async (plugin) => {
        const content = await plugin.loadContent?.();
        const rawTranslationFiles = (await plugin.getTranslationFiles?.({ content })) ?? [];
        const translationFiles = await Promise.all(rawTranslationFiles.map((translationFile) => (0, translations_1.localizePluginTranslationFile)({
            localizationDir: context.localizationDir,
            translationFile,
            plugin,
        })));
        const translatedContent = plugin.translateContent?.({ content, translationFiles }) ?? content;
        const translatedThemeConfigSlice = plugin.translateThemeConfig?.({
            themeConfig: context.siteConfig.themeConfig,
            translationFiles,
        });
        // Side-effect to merge theme config translations. A plugin should only
        // translate its own slice of theme config and should make no assumptions
        // about other plugins' keys, so this is safe to run in parallel.
        Object.assign(context.siteConfig.themeConfig, translatedThemeConfigSlice);
        return { ...plugin, content: translatedContent };
    }));
    const allContent = lodash_1.default.chain(loadedPlugins)
        .groupBy((item) => item.name)
        .mapValues((nameItems) => lodash_1.default.chain(nameItems)
        .groupBy((item) => item.options.id)
        .mapValues((idItems) => idItems[0].content)
        .value())
        .value();
    // 3. Plugin Lifecycle - contentLoaded.
    const pluginsRouteConfigs = [];
    const globalData = {};
    await Promise.all(loadedPlugins.map(async ({ content, ...plugin }) => {
        if (!plugin.contentLoaded) {
            return;
        }
        const pluginId = plugin.options.id;
        // Plugins data files are namespaced by pluginName/pluginId
        const dataDir = path_1.default.join(context.generatedFilesDir, plugin.name, pluginId);
        const pluginRouteContextModulePath = path_1.default.join(dataDir, `${(0, utils_1.docuHash)('pluginRouteContextModule')}.json`);
        const pluginRouteContext = {
            name: plugin.name,
            id: pluginId,
        };
        await (0, utils_1.generate)('/', pluginRouteContextModulePath, JSON.stringify(pluginRouteContext, null, 2));
        const actions = {
            addRoute(initialRouteConfig) {
                // Trailing slash behavior is handled generically for all plugins
                const finalRouteConfig = (0, routeConfig_1.applyRouteTrailingSlash)(initialRouteConfig, context.siteConfig);
                pluginsRouteConfigs.push({
                    ...finalRouteConfig,
                    context: {
                        ...(finalRouteConfig.context && { data: finalRouteConfig.context }),
                        plugin: pluginRouteContextModulePath,
                    },
                });
            },
            async createData(name, data) {
                const modulePath = path_1.default.join(dataDir, name);
                await (0, utils_1.generate)(dataDir, name, data);
                return modulePath;
            },
            setGlobalData(data) {
                var _a;
                globalData[_a = plugin.name] ?? (globalData[_a] = {});
                globalData[plugin.name][pluginId] = data;
            },
        };
        await plugin.contentLoaded({ content, actions, allContent });
    }));
    // Sort the route config. This ensures that route with nested
    // routes are always placed last.
    (0, routeConfig_1.sortConfig)(pluginsRouteConfigs, context.siteConfig.baseUrl);
    return { plugins: loadedPlugins, pluginsRouteConfigs, globalData };
}
exports.loadPlugins = loadPlugins;
