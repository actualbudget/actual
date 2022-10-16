"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAbsoluteFilePathMatcher = exports.createMatcher = exports.GlobExcludeDefault = exports.Globby = void 0;
const tslib_1 = require("tslib");
// Globby/Micromatch are the 2 libs we use in Docusaurus consistently
const path_1 = tslib_1.__importDefault(require("path"));
const micromatch_1 = tslib_1.__importDefault(require("micromatch")); // Note: Micromatch is used by Globby
/** A re-export of the globby instance. */
var globby_1 = require("globby");
Object.defineProperty(exports, "Globby", { enumerable: true, get: function () { return tslib_1.__importDefault(globby_1).default; } });
/**
 * The default glob patterns we ignore when sourcing content.
 * - Ignore files and folders starting with `_` recursively
 * - Ignore tests
 */
exports.GlobExcludeDefault = [
    '**/_*.{js,jsx,ts,tsx,md,mdx}',
    '**/_*/**',
    '**/*.test.{js,jsx,ts,tsx}',
    '**/__tests__/**',
];
/**
 * A very thin wrapper around `Micromatch.makeRe`.
 *
 * @see {@link createAbsoluteFilePathMatcher}
 * @param patterns A list of glob patterns. If the list is empty, it defaults to
 * matching none.
 * @returns A matcher handle that tells if a file path is matched by any of the
 * patterns.
 */
function createMatcher(patterns) {
    if (patterns.length === 0) {
        // `/(?:)/.test("foo")` is `true`
        return () => false;
    }
    const regexp = new RegExp(patterns.map((pattern) => micromatch_1.default.makeRe(pattern).source).join('|'));
    return (str) => regexp.test(str);
}
exports.createMatcher = createMatcher;
/**
 * We use match patterns like `"** /_* /**"` (ignore the spaces), where `"_*"`
 * should only be matched within a subfolder. This function would:
 * - Match `/user/sebastien/website/docs/_partials/xyz.md`
 * - Ignore `/user/_sebastien/website/docs/partials/xyz.md`
 *
 * @param patterns A list of glob patterns.
 * @param rootFolders A list of root folders to resolve the glob from.
 * @returns A matcher handle that tells if a file path is matched by any of the
 * patterns, resolved from the first root folder that contains the path.
 * @throws Throws when the returned matcher receives a path that doesn't belong
 * to any of the `rootFolders`.
 */
function createAbsoluteFilePathMatcher(patterns, rootFolders) {
    const matcher = createMatcher(patterns);
    function getRelativeFilePath(absoluteFilePath) {
        const rootFolder = rootFolders.find((folderPath) => absoluteFilePath.startsWith(folderPath));
        if (!rootFolder) {
            throw new Error(`createAbsoluteFilePathMatcher unexpected error, absoluteFilePath=${absoluteFilePath} was not contained in any of the root folders: ${rootFolders.join(', ')}`);
        }
        return path_1.default.relative(rootFolder, absoluteFilePath);
    }
    return (absoluteFilePath) => matcher(getRelativeFilePath(absoluteFilePath));
}
exports.createAbsoluteFilePathMatcher = createAbsoluteFilePathMatcher;
//# sourceMappingURL=globUtils.js.map