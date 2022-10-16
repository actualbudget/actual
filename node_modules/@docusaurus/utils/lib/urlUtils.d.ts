/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * Much like `path.join`, but much better. Takes an array of URL segments, and
 * joins them into a reasonable URL.
 *
 * - `["file:", "/home", "/user/", "website"]` => `file:///home/user/website`
 * - `["file://", "home", "/user/", "website"]` => `file://home/user/website` (relative!)
 * - Remove trailing slash before parameters or hash.
 * - Replace `?` in query parameters with `&`.
 * - Dedupe forward slashes in the entire path, avoiding protocol slashes.
 *
 * @throws {TypeError} If any of the URL segment is not a string, this throws.
 */
export declare function normalizeUrl(rawUrls: string[]): string;
/**
 * Takes a file's path, relative to its content folder, and computes its edit
 * URL. If `editUrl` is `undefined`, this returns `undefined`, as is the case
 * when the user doesn't want an edit URL in her config.
 */
export declare function getEditUrl(fileRelativePath: string, editUrl?: string): string | undefined;
/**
 * Converts file path to a reasonable URL path, e.g. `'index.md'` -> `'/'`,
 * `'foo/bar.js'` -> `'/foo/bar'`
 */
export declare function fileToPath(file: string): string;
/**
 * Similar to `encodeURI`, but uses `encodeURIComponent` and assumes there's no
 * query.
 *
 * `encodeURI("/question?/answer")` => `"/question?/answer#section"`;
 * `encodePath("/question?/answer#section")` => `"/question%3F/answer%23foo"`
 */
export declare function encodePath(userPath: string): string;
/**
 * Whether `str` is a valid pathname. It must be absolute, and not contain
 * special characters.
 */
export declare function isValidPathname(str: string): boolean;
/**
 * Resolve pathnames and fail-fast if resolution fails. Uses standard URL
 * semantics (provided by `resolve-pathname` which is used internally by React
 * router)
 */
export declare function resolvePathname(to: string, from?: string): string;
/** Appends a leading slash to `str`, if one doesn't exist. */
export declare function addLeadingSlash(str: string): string;
/** Appends a trailing slash to `str`, if one doesn't exist. */
export declare function addTrailingSlash(str: string): string;
/** Removes the trailing slash from `str`. */
export declare function removeTrailingSlash(str: string): string;
/** Constructs an SSH URL that can be used to push to GitHub. */
export declare function buildSshUrl(githubHost: string, organizationName: string, projectName: string, githubPort?: string): string;
/** Constructs an HTTP URL that can be used to push to GitHub. */
export declare function buildHttpsUrl(gitCredentials: string, githubHost: string, organizationName: string, projectName: string, githubPort?: string): string;
/**
 * Whether the current URL is an SSH protocol. In addition to looking for
 * `ssh:`, it will also allow protocol-less URLs like
 * `git@github.com:facebook/docusaurus.git`.
 */
export declare function hasSSHProtocol(sourceRepoUrl: string): boolean;
//# sourceMappingURL=urlUtils.d.ts.map