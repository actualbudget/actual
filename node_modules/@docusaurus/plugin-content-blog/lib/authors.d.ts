/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { BlogContentPaths } from './types';
import type { Author, BlogPostFrontMatter } from '@docusaurus/plugin-content-blog';
export declare type AuthorsMap = {
    [authorKey: string]: Author;
};
export declare function validateAuthorsMap(content: unknown): AuthorsMap;
export declare function getAuthorsMap(params: {
    authorsMapPath: string;
    contentPaths: BlogContentPaths;
}): Promise<AuthorsMap | undefined>;
declare type AuthorsParam = {
    frontMatter: BlogPostFrontMatter;
    authorsMap: AuthorsMap | undefined;
};
export declare function getBlogPostAuthors(params: AuthorsParam): Author[];
export {};
