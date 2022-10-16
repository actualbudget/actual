/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type ReactNode } from 'react';
declare type LinksCollector = {
    collectLink: (link: string) => void;
};
declare type StatefulLinksCollector = LinksCollector & {
    getCollectedLinks: () => string[];
};
export declare const createStatefulLinksCollector: () => StatefulLinksCollector;
export declare const useLinksCollector: () => LinksCollector;
export declare function LinksCollectorProvider({ children, linksCollector, }: {
    children: ReactNode;
    linksCollector: LinksCollector;
}): JSX.Element;
export {};
