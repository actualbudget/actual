"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.translateLoadedContent = exports.getLoadedContentTranslationFiles = void 0;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const utils_1 = require("@docusaurus/utils");
const constants_1 = require("./constants");
const utils_2 = require("./sidebars/utils");
function getVersionFileName(versionName) {
    if (versionName === constants_1.CURRENT_VERSION_NAME) {
        return versionName;
    }
    // I don't like this "version-" prefix,
    // but it's for consistency with site/versioned_docs
    return `version-${versionName}`;
}
// TODO legacy, the sidebar name is like "version-2.0.0-alpha.66/docs"
// input: "version-2.0.0-alpha.66/docs"
// output: "docs"
function getNormalizedSidebarName({ versionName, sidebarName, }) {
    if (versionName === constants_1.CURRENT_VERSION_NAME || !sidebarName.includes('/')) {
        return sidebarName;
    }
    const [, ...rest] = sidebarName.split('/');
    return rest.join('/');
}
function getSidebarTranslationFileContent(sidebar, sidebarName) {
    const categories = (0, utils_2.collectSidebarCategories)(sidebar);
    const categoryContent = Object.fromEntries(categories.flatMap((category) => {
        const entries = [];
        entries.push([
            `sidebar.${sidebarName}.category.${category.label}`,
            {
                message: category.label,
                description: `The label for category ${category.label} in sidebar ${sidebarName}`,
            },
        ]);
        if (category.link?.type === 'generated-index') {
            if (category.link.title) {
                entries.push([
                    `sidebar.${sidebarName}.category.${category.label}.link.generated-index.title`,
                    {
                        message: category.link.title,
                        description: `The generated-index page title for category ${category.label} in sidebar ${sidebarName}`,
                    },
                ]);
            }
            if (category.link.description) {
                entries.push([
                    `sidebar.${sidebarName}.category.${category.label}.link.generated-index.description`,
                    {
                        message: category.link.description,
                        description: `The generated-index page description for category ${category.label} in sidebar ${sidebarName}`,
                    },
                ]);
            }
        }
        return entries;
    }));
    const links = (0, utils_2.collectSidebarLinks)(sidebar);
    const linksContent = Object.fromEntries(links.map((link) => [
        `sidebar.${sidebarName}.link.${link.label}`,
        {
            message: link.label,
            description: `The label for link ${link.label} in sidebar ${sidebarName}, linking to ${link.href}`,
        },
    ]));
    const docs = (0, utils_2.collectSidebarDocItems)(sidebar)
        .concat((0, utils_2.collectSidebarRefs)(sidebar))
        .filter((item) => item.translatable);
    const docLinksContent = Object.fromEntries(docs.map((doc) => [
        `sidebar.${sidebarName}.doc.${doc.label}`,
        {
            message: doc.label,
            description: `The label for the doc item ${doc.label} in sidebar ${sidebarName}, linking to the doc ${doc.id}`,
        },
    ]));
    return (0, utils_1.mergeTranslations)([categoryContent, linksContent, docLinksContent]);
}
function translateSidebar({ sidebar, sidebarName, sidebarsTranslations, }) {
    function transformSidebarCategoryLink(category) {
        if (!category.link) {
            return undefined;
        }
        if (category.link.type === 'generated-index') {
            const title = sidebarsTranslations[`sidebar.${sidebarName}.category.${category.label}.link.generated-index.title`]?.message ?? category.link.title;
            const description = sidebarsTranslations[`sidebar.${sidebarName}.category.${category.label}.link.generated-index.description`]?.message ?? category.link.description;
            return {
                ...category.link,
                title,
                description,
            };
        }
        return category.link;
    }
    return (0, utils_2.transformSidebarItems)(sidebar, (item) => {
        if (item.type === 'category') {
            const link = transformSidebarCategoryLink(item);
            return {
                ...item,
                label: sidebarsTranslations[`sidebar.${sidebarName}.category.${item.label}`]
                    ?.message ?? item.label,
                ...(link && { link }),
            };
        }
        if (item.type === 'link') {
            return {
                ...item,
                label: sidebarsTranslations[`sidebar.${sidebarName}.link.${item.label}`]
                    ?.message ?? item.label,
            };
        }
        if ((item.type === 'doc' || item.type === 'ref') && item.translatable) {
            return {
                ...item,
                label: sidebarsTranslations[`sidebar.${sidebarName}.doc.${item.label}`]
                    ?.message ?? item.label,
            };
        }
        return item;
    });
}
function getSidebarsTranslations(version) {
    return (0, utils_1.mergeTranslations)(Object.entries(version.sidebars).map(([sidebarName, sidebar]) => {
        const normalizedSidebarName = getNormalizedSidebarName({
            sidebarName,
            versionName: version.versionName,
        });
        return getSidebarTranslationFileContent(sidebar, normalizedSidebarName);
    }));
}
function translateSidebars(version, sidebarsTranslations) {
    return lodash_1.default.mapValues(version.sidebars, (sidebar, sidebarName) => translateSidebar({
        sidebar,
        sidebarName: getNormalizedSidebarName({
            sidebarName,
            versionName: version.versionName,
        }),
        sidebarsTranslations,
    }));
}
function getVersionTranslationFiles(version) {
    const versionTranslations = {
        'version.label': {
            message: version.label,
            description: `The label for version ${version.versionName}`,
        },
    };
    const sidebarsTranslations = getSidebarsTranslations(version);
    return [
        {
            path: getVersionFileName(version.versionName),
            content: (0, utils_1.mergeTranslations)([versionTranslations, sidebarsTranslations]),
        },
    ];
}
function translateVersion(version, translationFiles) {
    const versionTranslations = translationFiles[getVersionFileName(version.versionName)].content;
    return {
        ...version,
        label: versionTranslations['version.label']?.message ?? version.label,
        sidebars: translateSidebars(version, versionTranslations),
    };
}
function getVersionsTranslationFiles(versions) {
    return versions.flatMap(getVersionTranslationFiles);
}
function translateVersions(versions, translationFiles) {
    return versions.map((version) => translateVersion(version, translationFiles));
}
function getLoadedContentTranslationFiles(loadedContent) {
    return getVersionsTranslationFiles(loadedContent.loadedVersions);
}
exports.getLoadedContentTranslationFiles = getLoadedContentTranslationFiles;
function translateLoadedContent(loadedContent, translationFiles) {
    const translationFilesMap = lodash_1.default.keyBy(translationFiles, (f) => f.path);
    return {
        loadedVersions: translateVersions(loadedContent.loadedVersions, translationFilesMap),
    };
}
exports.translateLoadedContent = translateLoadedContent;
