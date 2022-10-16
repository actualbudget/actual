/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { RouteConfig, ReportingSeverity } from '@docusaurus/types';
export declare function handleBrokenLinks({ allCollectedLinks, onBrokenLinks, routes, baseUrl, outDir, }: {
    allCollectedLinks: {
        [location: string]: string[];
    };
    onBrokenLinks: ReportingSeverity;
    routes: RouteConfig[];
    baseUrl: string;
    outDir: string;
}): Promise<void>;
