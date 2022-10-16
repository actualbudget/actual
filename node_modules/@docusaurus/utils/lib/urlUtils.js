"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasSSHProtocol = exports.buildHttpsUrl = exports.buildSshUrl = exports.removeTrailingSlash = exports.addTrailingSlash = exports.addLeadingSlash = exports.resolvePathname = exports.isValidPathname = exports.encodePath = exports.fileToPath = exports.getEditUrl = exports.normalizeUrl = void 0;
const tslib_1 = require("tslib");
const resolve_pathname_1 = tslib_1.__importDefault(require("resolve-pathname"));
const jsUtils_1 = require("./jsUtils");
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
function normalizeUrl(rawUrls) {
    const urls = [...rawUrls];
    const resultArray = [];
    let hasStartingSlash = false;
    let hasEndingSlash = false;
    const isNonEmptyArray = (arr) => arr.length > 0;
    if (!isNonEmptyArray(urls)) {
        return '';
    }
    // If the first part is a plain protocol, we combine it with the next part.
    if (urls[0].match(/^[^/:]+:\/*$/) && urls.length > 1) {
        const first = urls.shift();
        if (first.startsWith('file:') && urls[0].startsWith('/')) {
            // Force a double slash here, else we lose the information that the next
            // segment is an absolute path
            urls[0] = `${first}//${urls[0]}`;
        }
        else {
            urls[0] = first + urls[0];
        }
    }
    // There must be two or three slashes in the file protocol,
    // two slashes in anything else.
    const replacement = urls[0].match(/^file:\/\/\//) ? '$1:///' : '$1://';
    urls[0] = urls[0].replace(/^(?<protocol>[^/:]+):\/*/, replacement);
    for (let i = 0; i < urls.length; i += 1) {
        let component = urls[i];
        if (typeof component !== 'string') {
            throw new TypeError(`Url must be a string. Received ${typeof component}`);
        }
        if (component === '') {
            if (i === urls.length - 1 && hasEndingSlash) {
                resultArray.push('/');
            }
            continue;
        }
        if (component !== '/') {
            if (i > 0) {
                // Removing the starting slashes for each component but the first.
                component = component.replace(/^\/+/, 
                // Special case where the first element of rawUrls is empty
                // ["", "/hello"] => /hello
                component.startsWith('/') && !hasStartingSlash ? '/' : '');
            }
            hasEndingSlash = component.endsWith('/');
            // Removing the ending slashes for each component but the last. For the
            // last component we will combine multiple slashes to a single one.
            component = component.replace(/\/+$/, i < urls.length - 1 ? '' : '/');
        }
        hasStartingSlash = true;
        resultArray.push(component);
    }
    let str = resultArray.join('/');
    // Each input component is now separated by a single slash except the possible
    // first plain protocol part.
    // Remove trailing slash before parameters or hash.
    str = str.replace(/\/(?<search>\?|&|#[^!])/g, '$1');
    // Replace ? in parameters with &.
    const parts = str.split('?');
    str = parts.shift() + (parts.length > 0 ? '?' : '') + parts.join('&');
    // Dedupe forward slashes in the entire path, avoiding protocol slashes.
    str = str.replace(/(?<textBefore>[^:/]\/)\/+/g, '$1');
    // Dedupe forward slashes at the beginning of the path.
    str = str.replace(/^\/+/g, '/');
    return str;
}
exports.normalizeUrl = normalizeUrl;
/**
 * Takes a file's path, relative to its content folder, and computes its edit
 * URL. If `editUrl` is `undefined`, this returns `undefined`, as is the case
 * when the user doesn't want an edit URL in her config.
 */
function getEditUrl(fileRelativePath, editUrl) {
    return editUrl
        ? // Don't use posixPath for this: we need to force a forward slash path
            normalizeUrl([editUrl, fileRelativePath.replace(/\\/g, '/')])
        : undefined;
}
exports.getEditUrl = getEditUrl;
/**
 * Converts file path to a reasonable URL path, e.g. `'index.md'` -> `'/'`,
 * `'foo/bar.js'` -> `'/foo/bar'`
 */
function fileToPath(file) {
    const indexRE = /(?<dirname>^|.*\/)index\.(?:mdx?|jsx?|tsx?)$/i;
    const extRE = /\.(?:mdx?|jsx?|tsx?)$/;
    if (indexRE.test(file)) {
        return file.replace(indexRE, '/$1');
    }
    return `/${file.replace(extRE, '').replace(/\\/g, '/')}`;
}
exports.fileToPath = fileToPath;
/**
 * Similar to `encodeURI`, but uses `encodeURIComponent` and assumes there's no
 * query.
 *
 * `encodeURI("/question?/answer")` => `"/question?/answer#section"`;
 * `encodePath("/question?/answer#section")` => `"/question%3F/answer%23foo"`
 */
function encodePath(userPath) {
    return userPath
        .split('/')
        .map((item) => encodeURIComponent(item))
        .join('/');
}
exports.encodePath = encodePath;
/**
 * Whether `str` is a valid pathname. It must be absolute, and not contain
 * special characters.
 */
function isValidPathname(str) {
    if (!str.startsWith('/')) {
        return false;
    }
    try {
        const parsedPathname = new URL(str, 'https://domain.com').pathname;
        return parsedPathname === str || parsedPathname === encodeURI(str);
    }
    catch {
        return false;
    }
}
exports.isValidPathname = isValidPathname;
/**
 * Resolve pathnames and fail-fast if resolution fails. Uses standard URL
 * semantics (provided by `resolve-pathname` which is used internally by React
 * router)
 */
function resolvePathname(to, from) {
    return (0, resolve_pathname_1.default)(to, from);
}
exports.resolvePathname = resolvePathname;
/** Appends a leading slash to `str`, if one doesn't exist. */
function addLeadingSlash(str) {
    return str.startsWith('/') ? str : `/${str}`;
}
exports.addLeadingSlash = addLeadingSlash;
// TODO deduplicate: also present in @docusaurus/utils-common
/** Appends a trailing slash to `str`, if one doesn't exist. */
function addTrailingSlash(str) {
    return str.endsWith('/') ? str : `${str}/`;
}
exports.addTrailingSlash = addTrailingSlash;
/** Removes the trailing slash from `str`. */
function removeTrailingSlash(str) {
    return (0, jsUtils_1.removeSuffix)(str, '/');
}
exports.removeTrailingSlash = removeTrailingSlash;
/** Constructs an SSH URL that can be used to push to GitHub. */
function buildSshUrl(githubHost, organizationName, projectName, githubPort) {
    if (githubPort) {
        return `ssh://git@${githubHost}:${githubPort}/${organizationName}/${projectName}.git`;
    }
    return `git@${githubHost}:${organizationName}/${projectName}.git`;
}
exports.buildSshUrl = buildSshUrl;
/** Constructs an HTTP URL that can be used to push to GitHub. */
function buildHttpsUrl(gitCredentials, githubHost, organizationName, projectName, githubPort) {
    if (githubPort) {
        return `https://${gitCredentials}@${githubHost}:${githubPort}/${organizationName}/${projectName}.git`;
    }
    return `https://${gitCredentials}@${githubHost}/${organizationName}/${projectName}.git`;
}
exports.buildHttpsUrl = buildHttpsUrl;
/**
 * Whether the current URL is an SSH protocol. In addition to looking for
 * `ssh:`, it will also allow protocol-less URLs like
 * `git@github.com:facebook/docusaurus.git`.
 */
function hasSSHProtocol(sourceRepoUrl) {
    try {
        if (new URL(sourceRepoUrl).protocol === 'ssh:') {
            return true;
        }
        return false;
    }
    catch {
        // Fails when there isn't a protocol
        return /^(?:[\w-]+@)?[\w.-]+:[\w./-]+/.test(sourceRepoUrl);
    }
}
exports.hasSSHProtocol = hasSSHProtocol;
//# sourceMappingURL=urlUtils.js.map