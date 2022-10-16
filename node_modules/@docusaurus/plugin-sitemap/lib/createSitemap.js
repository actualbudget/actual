"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const sitemap_1 = require("sitemap");
const utils_common_1 = require("@docusaurus/utils-common");
const utils_1 = require("@docusaurus/utils");
function isNoIndexMetaRoute({ head, route, }) {
    const isNoIndexMetaTag = ({ name, content, }) => {
        if (!name || !content) {
            return false;
        }
        return (
        // meta name is not case-sensitive
        name.toLowerCase() === 'robots' &&
            // Robots directives are not case-sensitive
            content.toLowerCase().includes('noindex'));
    };
    // https://github.com/staylor/react-helmet-async/pull/167
    const meta = head[route]?.meta.toComponent();
    return meta?.some((tag) => isNoIndexMetaTag({ name: tag.props.name, content: tag.props.content }));
}
async function createSitemap(siteConfig, routesPaths, head, options) {
    const { url: hostname } = siteConfig;
    if (!hostname) {
        throw new Error('URL in docusaurus.config.js cannot be empty/undefined.');
    }
    const { changefreq, priority, ignorePatterns } = options;
    const ignoreMatcher = (0, utils_1.createMatcher)(ignorePatterns);
    function isRouteExcluded(route) {
        return (route.endsWith('404.html') ||
            ignoreMatcher(route) ||
            isNoIndexMetaRoute({ head, route }));
    }
    const includedRoutes = routesPaths.filter((route) => !isRouteExcluded(route));
    if (includedRoutes.length === 0) {
        return null;
    }
    const sitemapStream = new sitemap_1.SitemapStream({ hostname });
    includedRoutes.forEach((routePath) => sitemapStream.write({
        url: (0, utils_common_1.applyTrailingSlash)(routePath, {
            trailingSlash: siteConfig.trailingSlash,
            baseUrl: siteConfig.baseUrl,
        }),
        changefreq,
        priority,
    }));
    sitemapStream.end();
    const generatedSitemap = (await (0, sitemap_1.streamToPromise)(sitemapStream)).toString();
    return generatedSitemap;
}
exports.default = createSitemap;
