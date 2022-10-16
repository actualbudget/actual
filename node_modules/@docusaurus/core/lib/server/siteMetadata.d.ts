/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { LoadedPlugin, PluginVersionInformation, SiteMetadata } from '@docusaurus/types';
export declare function getPluginVersion(pluginPath: string, siteDir: string): Promise<PluginVersionInformation>;
export declare function loadSiteMetadata({ plugins, siteDir, }: {
    plugins: LoadedPlugin[];
    siteDir: string;
}): Promise<SiteMetadata>;
