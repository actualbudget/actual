"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceMarkdownLinks = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const dataFileUtils_1 = require("./dataFileUtils");
const pathUtils_1 = require("./pathUtils");
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
function replaceMarkdownLinks({ siteDir, fileString, filePath, contentPaths, sourceToPermalink, }) {
    const brokenMarkdownLinks = [];
    // Replace internal markdown linking (except in fenced blocks).
    let fencedBlock = false;
    let lastCodeFence = '';
    const lines = fileString.split('\n').map((line) => {
        if (line.trim().startsWith('```')) {
            const codeFence = line.trim().match(/^`+/)[0];
            if (!fencedBlock) {
                fencedBlock = true;
                lastCodeFence = codeFence;
                // If we are in a ````-fenced block, all ``` would be plain text instead
                // of fences
            }
            else if (codeFence.length >= lastCodeFence.length) {
                fencedBlock = false;
            }
        }
        if (fencedBlock) {
            return line;
        }
        let modifiedLine = line;
        // Replace inline-style links or reference-style links e.g:
        // This is [Document 1](doc1.md)
        // [doc1]: doc1.md
        const mdRegex = /(?:\]\(|\]:\s*)(?!https?:\/\/|@site\/)(?<filename>[^'")\]\s>]+\.mdx?)/g;
        let mdMatch = mdRegex.exec(modifiedLine);
        while (mdMatch !== null) {
            // Replace it to correct html link.
            const mdLink = mdMatch.groups.filename;
            const sourcesToTry = [];
            // ./file.md and ../file.md are always relative to the current file
            if (!mdLink.startsWith('./') && !mdLink.startsWith('../')) {
                sourcesToTry.push(...(0, dataFileUtils_1.getContentPathList)(contentPaths), siteDir);
            }
            // /file.md is always relative to the content path
            if (!mdLink.startsWith('/')) {
                sourcesToTry.push(path_1.default.dirname(filePath));
            }
            const aliasedSourceMatch = sourcesToTry
                .map((p) => path_1.default.join(p, decodeURIComponent(mdLink)))
                .map((source) => (0, pathUtils_1.aliasedSitePath)(source, siteDir))
                .find((source) => sourceToPermalink[source]);
            const permalink = aliasedSourceMatch
                ? sourceToPermalink[aliasedSourceMatch]
                : undefined;
            if (permalink) {
                // MDX won't be happy if the permalink contains a space, we need to
                // convert it to %20
                const encodedPermalink = permalink
                    .split('/')
                    .map((part) => part.replace(/\s/g, '%20'))
                    .join('/');
                modifiedLine = modifiedLine.replace(mdMatch[0], mdMatch[0].replace(mdLink, encodedPermalink));
                // Adjust the lastIndex to avoid passing over the next link if the
                // newly replaced URL is shorter.
                mdRegex.lastIndex += encodedPermalink.length - mdLink.length;
            }
            else {
                const brokenMarkdownLink = {
                    contentPaths,
                    filePath,
                    link: mdLink,
                };
                brokenMarkdownLinks.push(brokenMarkdownLink);
            }
            mdMatch = mdRegex.exec(modifiedLine);
        }
        return modifiedLine;
    });
    const newContent = lines.join('\n');
    return { newContent, brokenMarkdownLinks };
}
exports.replaceMarkdownLinks = replaceMarkdownLinks;
//# sourceMappingURL=markdownLinks.js.map