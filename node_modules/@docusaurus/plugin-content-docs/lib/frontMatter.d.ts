/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { DocFrontMatter } from '@docusaurus/plugin-content-docs';
export declare function validateDocFrontMatter(frontMatter: {
    [key: string]: unknown;
}): DocFrontMatter;
