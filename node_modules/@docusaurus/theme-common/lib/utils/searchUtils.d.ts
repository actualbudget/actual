/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export declare const DEFAULT_SEARCH_TAG = "default";
/** The search tag to append as each doc's metadata. */
export declare function docVersionSearchTag(pluginId: string, versionName: string): string;
/**
 * Gets the relevant context information for contextual search.
 *
 * The value is generic and not coupled to Algolia/DocSearch, since we may want
 * to support multiple search engines, or allowing users to use their own search
 * engine solution.
 */
export declare function useContextualSearchFilters(): {
    locale: string;
    tags: string[];
};
//# sourceMappingURL=searchUtils.d.ts.map