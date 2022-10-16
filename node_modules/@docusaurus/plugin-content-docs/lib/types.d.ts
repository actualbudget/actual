/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { BrokenMarkdownLink, Tag } from '@docusaurus/utils';
import type { VersionMetadata, LoadedVersion, CategoryGeneratedIndexMetadata } from '@docusaurus/plugin-content-docs';
import type { SidebarsUtils } from './sidebars/utils';
export declare type DocFile = {
    contentPath: string;
    filePath: string;
    source: string;
    content: string;
};
export declare type SourceToPermalink = {
    [source: string]: string;
};
export declare type VersionTag = Tag & {
    /** All doc ids having this tag. */
    docIds: string[];
};
export declare type VersionTags = {
    [permalink: string]: VersionTag;
};
export declare type FullVersion = LoadedVersion & {
    sidebarsUtils: SidebarsUtils;
    categoryGeneratedIndices: CategoryGeneratedIndexMetadata[];
};
export declare type DocBrokenMarkdownLink = BrokenMarkdownLink<VersionMetadata>;
export declare type DocsMarkdownOption = {
    versionsMetadata: VersionMetadata[];
    siteDir: string;
    sourceToPermalink: SourceToPermalink;
    onBrokenMarkdownLink: (brokenMarkdownLink: DocBrokenMarkdownLink) => void;
};
