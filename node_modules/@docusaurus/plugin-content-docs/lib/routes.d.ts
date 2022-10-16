/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { PluginContentLoadedActions, RouteConfig } from '@docusaurus/types';
import type { FullVersion } from './types';
import type { DocMetadata } from '@docusaurus/plugin-content-docs';
export declare function createCategoryGeneratedIndexRoutes({ version, actions, docCategoryGeneratedIndexComponent, aliasedSource, }: {
    version: FullVersion;
    actions: PluginContentLoadedActions;
    docCategoryGeneratedIndexComponent: string;
    aliasedSource: (str: string) => string;
}): Promise<RouteConfig[]>;
export declare function createDocRoutes({ docs, actions, docItemComponent, }: {
    docs: DocMetadata[];
    actions: PluginContentLoadedActions;
    docItemComponent: string;
}): Promise<RouteConfig[]>;
export declare function createVersionRoutes({ version, actions, docItemComponent, docLayoutComponent, docCategoryGeneratedIndexComponent, pluginId, aliasedSource, }: {
    version: FullVersion;
    actions: PluginContentLoadedActions;
    docLayoutComponent: string;
    docItemComponent: string;
    docCategoryGeneratedIndexComponent: string;
    pluginId: string;
    aliasedSource: (str: string) => string;
}): Promise<void>;
