"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cliDocsVersionCommand = void 0;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const utils_1 = require("@docusaurus/utils");
const files_1 = require("./versions/files");
const validation_1 = require("./versions/validation");
const sidebars_1 = require("./sidebars");
const constants_1 = require("./constants");
async function createVersionedSidebarFile({ siteDir, pluginId, sidebarPath, version, }) {
    // Load current sidebar and create a new versioned sidebars file (if needed).
    // Note: we don't need the sidebars file to be normalized: it's ok to let
    // plugin option changes to impact older, versioned sidebars
    // We don't validate here, assuming the user has already built the version
    const sidebars = await (0, sidebars_1.loadSidebarsFileUnsafe)(sidebarPath);
    // Do not create a useless versioned sidebars file if sidebars file is empty
    // or sidebars are disabled/false)
    const shouldCreateVersionedSidebarFile = Object.keys(sidebars).length > 0;
    if (shouldCreateVersionedSidebarFile) {
        await fs_extra_1.default.outputFile((0, files_1.getVersionSidebarsPath)(siteDir, pluginId, version), `${JSON.stringify(sidebars, null, 2)}\n`, 'utf8');
    }
}
// Tests depend on non-default export for mocking.
async function cliDocsVersionCommand(version, { id: pluginId, path: docsPath, sidebarPath }, { siteDir, i18n }) {
    // It wouldn't be very user-friendly to show a [default] log prefix,
    // so we use [docs] instead of [default]
    const pluginIdLogPrefix = pluginId === utils_1.DEFAULT_PLUGIN_ID ? '[docs]' : `[${pluginId}]`;
    try {
        (0, validation_1.validateVersionName)(version);
    }
    catch (err) {
        logger_1.default.info `${pluginIdLogPrefix}: Invalid version name provided. Try something like: 1.0.0`;
        throw err;
    }
    const versions = (await (0, files_1.readVersionsFile)(siteDir, pluginId)) ?? [];
    // Check if version already exists.
    if (versions.includes(version)) {
        throw new Error(`${pluginIdLogPrefix}: this version already exists! Use a version tag that does not already exist.`);
    }
    if (i18n.locales.length > 1) {
        logger_1.default.info `Versioned docs will be created for the following locales: name=${i18n.locales}`;
    }
    await Promise.all(i18n.locales.map(async (locale) => {
        const localizationDir = path_1.default.resolve(siteDir, i18n.path, i18n.localeConfigs[locale].path);
        // Copy docs files.
        const docsDir = locale === i18n.defaultLocale
            ? path_1.default.resolve(siteDir, docsPath)
            : (0, files_1.getDocsDirPathLocalized)({
                localizationDir,
                pluginId,
                versionName: constants_1.CURRENT_VERSION_NAME,
            });
        if (!(await fs_extra_1.default.pathExists(docsDir)) ||
            (await fs_extra_1.default.readdir(docsDir)).length === 0) {
            if (locale === i18n.defaultLocale) {
                throw new Error(logger_1.default.interpolate `${pluginIdLogPrefix}: no docs found in path=${docsDir}.`);
            }
            else {
                logger_1.default.warn `${pluginIdLogPrefix}: no docs found in path=${docsDir}. Skipping.`;
                return;
            }
        }
        const newVersionDir = locale === i18n.defaultLocale
            ? (0, files_1.getVersionDocsDirPath)(siteDir, pluginId, version)
            : (0, files_1.getDocsDirPathLocalized)({
                localizationDir,
                pluginId,
                versionName: version,
            });
        await fs_extra_1.default.copy(docsDir, newVersionDir);
    }));
    await createVersionedSidebarFile({
        siteDir,
        pluginId,
        version,
        sidebarPath,
    });
    // Update versions.json file.
    versions.unshift(version);
    await fs_extra_1.default.outputFile((0, files_1.getVersionsFilePath)(siteDir, pluginId), `${JSON.stringify(versions, null, 2)}\n`);
    logger_1.default.success `name=${pluginIdLogPrefix}: version name=${version} created!`;
}
exports.cliDocsVersionCommand = cliDocsVersionCommand;
