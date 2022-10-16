"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVersionRoutes = exports.createDocRoutes = exports.createCategoryGeneratedIndexRoutes = void 0;
const tslib_1 = require("tslib");
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const utils_1 = require("@docusaurus/utils");
const props_1 = require("./props");
async function createCategoryGeneratedIndexRoutes({ version, actions, docCategoryGeneratedIndexComponent, aliasedSource, }) {
    const slugs = (0, utils_1.createSlugger)();
    async function createCategoryGeneratedIndexRoute(categoryGeneratedIndex) {
        const { sidebar, ...prop } = categoryGeneratedIndex;
        const propFileName = slugs.slug(`${version.path}-${categoryGeneratedIndex.sidebar}-category-${categoryGeneratedIndex.title}`);
        const propData = await actions.createData(`${(0, utils_1.docuHash)(`category/${propFileName}`)}.json`, JSON.stringify(prop, null, 2));
        return {
            path: categoryGeneratedIndex.permalink,
            component: docCategoryGeneratedIndexComponent,
            exact: true,
            modules: {
                categoryGeneratedIndex: aliasedSource(propData),
            },
            // Same as doc, this sidebar route attribute permits to associate this
            // subpage to the given sidebar
            ...(sidebar && { sidebar }),
        };
    }
    return Promise.all(version.categoryGeneratedIndices.map(createCategoryGeneratedIndexRoute));
}
exports.createCategoryGeneratedIndexRoutes = createCategoryGeneratedIndexRoutes;
async function createDocRoutes({ docs, actions, docItemComponent, }) {
    return Promise.all(docs.map(async (metadataItem) => {
        await actions.createData(
        // Note that this created data path must be in sync with
        // metadataPath provided to mdx-loader.
        `${(0, utils_1.docuHash)(metadataItem.source)}.json`, JSON.stringify(metadataItem, null, 2));
        const docRoute = {
            path: metadataItem.permalink,
            component: docItemComponent,
            exact: true,
            modules: {
                content: metadataItem.source,
            },
            // Because the parent (DocPage) comp need to access it easily
            // This permits to render the sidebar once without unmount/remount when
            // navigating (and preserve sidebar state)
            ...(metadataItem.sidebar && {
                sidebar: metadataItem.sidebar,
            }),
        };
        return docRoute;
    }));
}
exports.createDocRoutes = createDocRoutes;
async function createVersionRoutes({ version, actions, docItemComponent, docLayoutComponent, docCategoryGeneratedIndexComponent, pluginId, aliasedSource, }) {
    async function doCreateVersionRoutes() {
        const versionMetadata = (0, props_1.toVersionMetadataProp)(pluginId, version);
        const versionMetadataPropPath = await actions.createData(`${(0, utils_1.docuHash)(`version-${version.versionName}-metadata-prop`)}.json`, JSON.stringify(versionMetadata, null, 2));
        async function createVersionSubRoutes() {
            const [docRoutes, sidebarsRoutes] = await Promise.all([
                createDocRoutes({ docs: version.docs, actions, docItemComponent }),
                createCategoryGeneratedIndexRoutes({
                    version,
                    actions,
                    docCategoryGeneratedIndexComponent,
                    aliasedSource,
                }),
            ]);
            const routes = [...docRoutes, ...sidebarsRoutes];
            return routes.sort((a, b) => a.path.localeCompare(b.path));
        }
        actions.addRoute({
            path: version.path,
            // Allow matching /docs/* since this is the wrapping route
            exact: false,
            component: docLayoutComponent,
            routes: await createVersionSubRoutes(),
            modules: {
                versionMetadata: aliasedSource(versionMetadataPropPath),
            },
            priority: version.routePriority,
        });
    }
    try {
        return await doCreateVersionRoutes();
    }
    catch (err) {
        logger_1.default.error `Can't create version routes for version name=${version.versionName}`;
        throw err;
    }
}
exports.createVersionRoutes = createVersionRoutes;
