/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { DocusaurusConfig } from '@docusaurus/types';
import type { HelmetServerState } from 'react-helmet-async';
import type { PluginOptions } from './options';
export default function createSitemap(siteConfig: DocusaurusConfig, routesPaths: string[], head: {
    [location: string]: HelmetServerState;
}, options: PluginOptions): Promise<string | null>;
