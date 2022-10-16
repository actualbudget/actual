/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * Content plugins have a base path and a localized path to source content from.
 * We will look into the localized path in priority.
 */
export declare type ContentPaths = {
    /**
     * The absolute path to the base content directory, like `"<siteDir>/docs"`.
     */
    contentPath: string;
    /**
     * The absolute path to the localized content directory, like
     * `"<siteDir>/i18n/zh-Hans/plugin-content-docs"`.
     */
    contentPathLocalized: string;
};
/** Data structure representing each broken Markdown link to be reported. */
export declare type BrokenMarkdownLink<T extends ContentPaths> = {
    /** Absolute path to the file containing this link. */
    filePath: string;
    /**
     * This is generic because it may contain extra metadata like version name,
     * which the reporter can provide for context.
     */
    contentPaths: T;
    /**
     * The content of the link, like `"./brokenFile.md"`
     */
    link: string;
};
/**
 * Takes a Markdown file and replaces relative file references with their URL
 * counterparts, e.g. `[link](./intro.md)` => `[link](/docs/intro)`, preserving
 * everything else.
 *
 * This method uses best effort to find a matching file. The file reference can
 * be relative to the directory of the current file (most likely) or any of the
 * content paths (so `/tutorials/intro.md` can be resolved as
 * `<siteDir>/docs/tutorials/intro.md`). Links that contain the `http(s):` or
 * `@site/` prefix will always be ignored.
 */
export declare function replaceMarkdownLinks<T extends ContentPaths>({ siteDir, fileString, filePath, contentPaths, sourceToPermalink, }: {
    /** Absolute path to the site directory, used to resolve aliased paths. */
    siteDir: string;
    /** The Markdown file content to be processed. */
    fileString: string;
    /** Absolute path to the current file containing `fileString`. */
    filePath: string;
    /** The content paths which the file reference may live in. */
    contentPaths: T;
    /**
     * A map from source paths to their URLs. Source paths are `@site` aliased.
     */
    sourceToPermalink: {
        [aliasedPath: string]: string;
    };
}): {
    /**
     * The content with all Markdown file references replaced with their URLs.
     * Unresolved links are left as-is.
     */
    newContent: string;
    /** The list of broken links,  */
    brokenMarkdownLinks: BrokenMarkdownLink<T>[];
};
//# sourceMappingURL=markdownLinks.d.ts.map