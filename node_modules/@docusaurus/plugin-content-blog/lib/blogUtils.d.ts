/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { LoadContext } from '@docusaurus/types';
import type { PluginOptions, BlogPost, BlogTags, BlogPaginated } from '@docusaurus/plugin-content-blog';
import type { BlogContentPaths, BlogMarkdownLoaderOptions } from './types';
export declare function truncate(fileString: string, truncateMarker: RegExp): string;
export declare function getSourceToPermalink(blogPosts: BlogPost[]): {
    [aliasedPath: string]: string;
};
export declare function paginateBlogPosts({ blogPosts, basePageUrl, blogTitle, blogDescription, postsPerPageOption, }: {
    blogPosts: BlogPost[];
    basePageUrl: string;
    blogTitle: string;
    blogDescription: string;
    postsPerPageOption: number | 'ALL';
}): BlogPaginated[];
export declare function getBlogTags({ blogPosts, ...params }: {
    blogPosts: BlogPost[];
    blogTitle: string;
    blogDescription: string;
    postsPerPageOption: number | 'ALL';
}): BlogTags;
declare type ParsedBlogFileName = {
    date: Date | undefined;
    text: string;
    slug: string;
};
export declare function parseBlogFileName(blogSourceRelative: string): ParsedBlogFileName;
export declare function generateBlogPosts(contentPaths: BlogContentPaths, context: LoadContext, options: PluginOptions): Promise<BlogPost[]>;
export declare type LinkifyParams = {
    filePath: string;
    fileString: string;
} & Pick<BlogMarkdownLoaderOptions, 'sourceToPermalink' | 'siteDir' | 'contentPaths' | 'onBrokenMarkdownLink'>;
export declare function linkify({ filePath, contentPaths, fileString, siteDir, sourceToPermalink, onBrokenMarkdownLink, }: LinkifyParams): string;
export {};
