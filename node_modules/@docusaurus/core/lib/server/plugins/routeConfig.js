"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortConfig = exports.applyRouteTrailingSlash = void 0;
const utils_common_1 = require("@docusaurus/utils-common");
/** Recursively applies trailing slash config to all nested routes. */
function applyRouteTrailingSlash(route, params) {
    return {
        ...route,
        path: (0, utils_common_1.applyTrailingSlash)(route.path, params),
        ...(route.routes && {
            routes: route.routes.map((subroute) => applyRouteTrailingSlash(subroute, params)),
        }),
    };
}
exports.applyRouteTrailingSlash = applyRouteTrailingSlash;
function sortConfig(routeConfigs, baseUrl = '/') {
    // Sort the route config. This ensures that route with nested
    // routes is always placed last.
    routeConfigs.sort((a, b) => {
        // Root route should get placed last.
        if (a.path === baseUrl && b.path !== baseUrl) {
            return 1;
        }
        if (a.path !== baseUrl && b.path === baseUrl) {
            return -1;
        }
        if (a.routes && !b.routes) {
            return 1;
        }
        if (!a.routes && b.routes) {
            return -1;
        }
        // Higher priority get placed first.
        if (a.priority || b.priority) {
            const priorityA = a.priority ?? 0;
            const priorityB = b.priority ?? 0;
            const score = priorityB - priorityA;
            if (score !== 0) {
                return score;
            }
        }
        return a.path.localeCompare(b.path);
    });
    routeConfigs.forEach((routeConfig) => {
        routeConfig.routes?.sort((a, b) => a.path.localeCompare(b.path));
    });
}
exports.sortConfig = sortConfig;
