/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type ApplyTrailingSlashParams } from '@docusaurus/utils-common';
import type { RouteConfig } from '@docusaurus/types';
/** Recursively applies trailing slash config to all nested routes. */
export declare function applyRouteTrailingSlash(route: RouteConfig, params: ApplyTrailingSlashParams): RouteConfig;
export declare function sortConfig(routeConfigs: RouteConfig[], baseUrl?: string): void;
