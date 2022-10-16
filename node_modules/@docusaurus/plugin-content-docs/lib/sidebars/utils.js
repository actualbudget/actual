"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toNavigationLink = exports.toDocNavigationLink = exports.createSidebarsUtils = exports.collectSidebarsNavigations = exports.collectSidebarsDocIds = exports.collectSidebarNavigation = exports.collectSidebarDocIds = exports.collectSidebarRefs = exports.collectSidebarLinks = exports.collectSidebarCategories = exports.collectSidebarDocItems = exports.transformSidebarItems = exports.isCategoriesShorthand = void 0;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const utils_1 = require("@docusaurus/utils");
function isCategoriesShorthand(item) {
    return typeof item === 'object' && !item.type;
}
exports.isCategoriesShorthand = isCategoriesShorthand;
function transformSidebarItems(sidebar, updateFn) {
    function transformRecursive(item) {
        if (item.type === 'category') {
            return updateFn({
                ...item,
                items: item.items.map(transformRecursive),
            });
        }
        return updateFn(item);
    }
    return sidebar.map(transformRecursive);
}
exports.transformSidebarItems = transformSidebarItems;
/**
 * Flatten sidebar items into a single flat array (containing categories/docs on
 * the same level). Order matters (useful for next/prev nav), top categories
 * appear before their child elements
 */
function flattenSidebarItems(items) {
    function flattenRecursive(item) {
        return item.type === 'category'
            ? [item, ...item.items.flatMap(flattenRecursive)]
            : [item];
    }
    return items.flatMap(flattenRecursive);
}
function collectSidebarItemsOfType(type, sidebar) {
    return flattenSidebarItems(sidebar).filter((item) => item.type === type);
}
function collectSidebarDocItems(sidebar) {
    return collectSidebarItemsOfType('doc', sidebar);
}
exports.collectSidebarDocItems = collectSidebarDocItems;
function collectSidebarCategories(sidebar) {
    return collectSidebarItemsOfType('category', sidebar);
}
exports.collectSidebarCategories = collectSidebarCategories;
function collectSidebarLinks(sidebar) {
    return collectSidebarItemsOfType('link', sidebar);
}
exports.collectSidebarLinks = collectSidebarLinks;
function collectSidebarRefs(sidebar) {
    return collectSidebarItemsOfType('ref', sidebar);
}
exports.collectSidebarRefs = collectSidebarRefs;
// /!\ docId order matters for navigation!
function collectSidebarDocIds(sidebar) {
    return flattenSidebarItems(sidebar).flatMap((item) => {
        if (item.type === 'category') {
            return item.link?.type === 'doc' ? [item.link.id] : [];
        }
        if (item.type === 'doc') {
            return [item.id];
        }
        return [];
    });
}
exports.collectSidebarDocIds = collectSidebarDocIds;
function collectSidebarNavigation(sidebar) {
    return flattenSidebarItems(sidebar).flatMap((item) => {
        if (item.type === 'category' && item.link) {
            return [item];
        }
        if (item.type === 'doc') {
            return [item];
        }
        return [];
    });
}
exports.collectSidebarNavigation = collectSidebarNavigation;
function collectSidebarsDocIds(sidebars) {
    return lodash_1.default.mapValues(sidebars, collectSidebarDocIds);
}
exports.collectSidebarsDocIds = collectSidebarsDocIds;
function collectSidebarsNavigations(sidebars) {
    return lodash_1.default.mapValues(sidebars, collectSidebarNavigation);
}
exports.collectSidebarsNavigations = collectSidebarsNavigations;
function createSidebarsUtils(sidebars) {
    const sidebarNameToDocIds = collectSidebarsDocIds(sidebars);
    const sidebarNameToNavigationItems = collectSidebarsNavigations(sidebars);
    // Reverse mapping
    const docIdToSidebarName = Object.fromEntries(Object.entries(sidebarNameToDocIds).flatMap(([sidebarName, docIds]) => docIds.map((docId) => [docId, sidebarName])));
    function getFirstDocIdOfFirstSidebar() {
        return Object.values(sidebarNameToDocIds)[0]?.[0];
    }
    function getSidebarNameByDocId(docId) {
        return docIdToSidebarName[docId];
    }
    function emptySidebarNavigation() {
        return {
            sidebarName: undefined,
            previous: undefined,
            next: undefined,
        };
    }
    function getDocNavigation(unversionedId, versionedId, displayedSidebar) {
        // TODO legacy id retro-compatibility!
        let docId = unversionedId;
        let sidebarName = displayedSidebar === undefined
            ? getSidebarNameByDocId(docId)
            : displayedSidebar;
        if (sidebarName === undefined) {
            docId = versionedId;
            sidebarName = getSidebarNameByDocId(docId);
        }
        if (!sidebarName) {
            return emptySidebarNavigation();
        }
        const navigationItems = sidebarNameToNavigationItems[sidebarName];
        if (!navigationItems) {
            throw new Error(`Doc with ID ${docId} wants to display sidebar ${sidebarName} but a sidebar with this name doesn't exist`);
        }
        const currentItemIndex = navigationItems.findIndex((item) => {
            if (item.type === 'doc') {
                return item.id === docId;
            }
            if (item.type === 'category' && item.link.type === 'doc') {
                return item.link.id === docId;
            }
            return false;
        });
        if (currentItemIndex === -1) {
            return { sidebarName, next: undefined, previous: undefined };
        }
        return {
            sidebarName,
            previous: navigationItems[currentItemIndex - 1],
            next: navigationItems[currentItemIndex + 1],
        };
    }
    function getCategoryGeneratedIndexList() {
        return Object.values(sidebarNameToNavigationItems)
            .flat()
            .flatMap((item) => {
            if (item.type === 'category' && item.link.type === 'generated-index') {
                return [item];
            }
            return [];
        });
    }
    /**
     * We identity the category generated index by its permalink (should be
     * unique). More reliable than using object identity
     */
    function getCategoryGeneratedIndexNavigation(categoryGeneratedIndexPermalink) {
        function isCurrentCategoryGeneratedIndexItem(item) {
            return (item.type === 'category' &&
                item.link.type === 'generated-index' &&
                item.link.permalink === categoryGeneratedIndexPermalink);
        }
        const sidebarName = Object.entries(sidebarNameToNavigationItems).find(([, navigationItems]) => navigationItems.find(isCurrentCategoryGeneratedIndexItem))[0];
        const navigationItems = sidebarNameToNavigationItems[sidebarName];
        const currentItemIndex = navigationItems.findIndex(isCurrentCategoryGeneratedIndexItem);
        return {
            sidebarName,
            previous: navigationItems[currentItemIndex - 1],
            next: navigationItems[currentItemIndex + 1],
        };
    }
    function checkSidebarsDocIds(validDocIds, sidebarFilePath) {
        const allSidebarDocIds = Object.values(sidebarNameToDocIds).flat();
        const invalidSidebarDocIds = lodash_1.default.difference(allSidebarDocIds, validDocIds);
        if (invalidSidebarDocIds.length > 0) {
            throw new Error(`Invalid sidebar file at "${(0, utils_1.toMessageRelativeFilePath)(sidebarFilePath)}".
These sidebar document ids do not exist:
- ${invalidSidebarDocIds.sort().join('\n- ')}

Available document ids are:
- ${lodash_1.default.uniq(validDocIds).sort().join('\n- ')}`);
        }
    }
    function getFirstLink(sidebar) {
        for (const item of sidebar) {
            if (item.type === 'doc') {
                return {
                    type: 'doc',
                    id: item.id,
                    label: item.label ?? item.id,
                };
            }
            else if (item.type === 'category') {
                if (item.link?.type === 'doc') {
                    return {
                        type: 'doc',
                        id: item.link.id,
                        label: item.label,
                    };
                }
                else if (item.link?.type === 'generated-index') {
                    return {
                        type: 'generated-index',
                        permalink: item.link.permalink,
                        label: item.label,
                    };
                }
                const firstSubItem = getFirstLink(item.items);
                if (firstSubItem) {
                    return firstSubItem;
                }
            }
        }
        return undefined;
    }
    return {
        sidebars,
        getFirstDocIdOfFirstSidebar,
        getSidebarNameByDocId,
        getDocNavigation,
        getCategoryGeneratedIndexList,
        getCategoryGeneratedIndexNavigation,
        checkSidebarsDocIds,
        getFirstLink: (id) => getFirstLink(sidebars[id]),
    };
}
exports.createSidebarsUtils = createSidebarsUtils;
function toDocNavigationLink(doc) {
    const { title, permalink, frontMatter: { pagination_label: paginationLabel, sidebar_label: sidebarLabel, }, } = doc;
    return { title: paginationLabel ?? sidebarLabel ?? title, permalink };
}
exports.toDocNavigationLink = toDocNavigationLink;
function toNavigationLink(navigationItem, docsById) {
    function getDocById(docId) {
        const doc = docsById[docId];
        if (!doc) {
            throw new Error(`Can't create navigation link: no doc found with id=${docId}`);
        }
        return doc;
    }
    if (!navigationItem) {
        return undefined;
    }
    if (navigationItem.type === 'category') {
        return navigationItem.link.type === 'doc'
            ? toDocNavigationLink(getDocById(navigationItem.link.id))
            : {
                title: navigationItem.label,
                permalink: navigationItem.link.permalink,
            };
    }
    return toDocNavigationLink(getDocById(navigationItem.id));
}
exports.toNavigationLink = toNavigationLink;
