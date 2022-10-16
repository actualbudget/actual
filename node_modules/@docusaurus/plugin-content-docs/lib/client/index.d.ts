/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { UseDataOptions } from '@docusaurus/types';
export declare type ActivePlugin = {
    pluginId: string;
    pluginData: GlobalPluginData;
};
export declare type ActiveDocContext = {
    activeVersion?: GlobalVersion;
    activeDoc?: GlobalDoc;
    alternateDocVersions: {
        [versionName: string]: GlobalDoc;
    };
};
export declare type GlobalDoc = {
    /**
     * For generated index pages, this is the `slug`, **not** `permalink`
     * (without base URL). Because slugs have leading slashes but IDs don't,
     * there won't be clashes.
     */
    id: string;
    path: string;
    sidebar: string | undefined;
};
export declare type GlobalVersion = {
    name: string;
    label: string;
    isLast: boolean;
    path: string;
    /** The doc with `slug: /`, or first doc in first sidebar */
    mainDocId: string;
    docs: GlobalDoc[];
    /** Unversioned IDs. In development, this list is empty. */
    draftIds: string[];
    sidebars?: {
        [sidebarId: string]: GlobalSidebar;
    };
};
export declare type GlobalSidebar = {
    link?: {
        label: string;
        path: string;
    };
};
export declare type GlobalPluginData = {
    path: string;
    versions: GlobalVersion[];
    breadcrumbs: boolean;
};
export declare type DocVersionSuggestions = {
    /** Suggest the latest version */
    latestVersionSuggestion: GlobalVersion;
    /** Suggest the same doc, in latest version (if one exists) */
    latestDocSuggestion?: GlobalDoc;
};
export declare const useAllDocsData: () => {
    [pluginId: string]: GlobalPluginData;
};
export declare const useDocsData: (pluginId: string | undefined) => GlobalPluginData;
export declare function useActivePlugin(options?: UseDataOptions): ActivePlugin | undefined;
export declare function useActivePluginAndVersion(options?: UseDataOptions): {
    activePlugin: ActivePlugin;
    activeVersion: GlobalVersion | undefined;
} | undefined;
/** Versions are returned ordered (most recent first). */
export declare function useVersions(pluginId: string | undefined): GlobalVersion[];
export declare function useLatestVersion(pluginId: string | undefined): GlobalVersion;
/**
 * Returns `undefined` on doc-unrelated pages, because there's no version
 * currently considered as active.
 */
export declare function useActiveVersion(pluginId: string | undefined): GlobalVersion | undefined;
export declare function useActiveDocContext(pluginId: string | undefined): ActiveDocContext;
/**
 * Useful to say "hey, you are not on the latest docs version, please switch"
 */
export declare function useDocVersionSuggestions(pluginId: string | undefined): DocVersionSuggestions;
