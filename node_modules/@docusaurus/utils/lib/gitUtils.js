"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileCommitDate = exports.FileNotTrackedError = exports.GitNotFoundError = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const shelljs_1 = tslib_1.__importDefault(require("shelljs"));
/** Custom error thrown when git is not found in `PATH`. */
class GitNotFoundError extends Error {
}
exports.GitNotFoundError = GitNotFoundError;
/** Custom error thrown when the current file is not tracked by git. */
class FileNotTrackedError extends Error {
}
exports.FileNotTrackedError = FileNotTrackedError;
function getFileCommitDate(file, { age = 'oldest', includeAuthor = false, }) {
    if (!shelljs_1.default.which('git')) {
        throw new GitNotFoundError(`Failed to retrieve git history for "${file}" because git is not installed.`);
    }
    if (!shelljs_1.default.test('-f', file)) {
        throw new Error(`Failed to retrieve git history for "${file}" because the file does not exist.`);
    }
    const args = [
        `--format=%ct${includeAuthor ? ',%an' : ''}`,
        '--max-count=1',
        age === 'oldest' ? '--follow --diff-filter=A' : undefined,
    ]
        .filter(Boolean)
        .join(' ');
    const result = shelljs_1.default.exec(`git log ${args} -- "${path_1.default.basename(file)}"`, {
        // Setting cwd is important, see: https://github.com/facebook/docusaurus/pull/5048
        cwd: path_1.default.dirname(file),
        silent: true,
    });
    if (result.code !== 0) {
        throw new Error(`Failed to retrieve the git history for file "${file}" with exit code ${result.code}: ${result.stderr}`);
    }
    let regex = /^(?<timestamp>\d+)$/;
    if (includeAuthor) {
        regex = /^(?<timestamp>\d+),(?<author>.+)$/;
    }
    const output = result.stdout.trim();
    if (!output) {
        throw new FileNotTrackedError(`Failed to retrieve the git history for file "${file}" because the file is not tracked by git.`);
    }
    const match = output.match(regex);
    if (!match) {
        throw new Error(`Failed to retrieve the git history for file "${file}" with unexpected output: ${output}`);
    }
    const timestamp = Number(match.groups.timestamp);
    const date = new Date(timestamp * 1000);
    if (includeAuthor) {
        return { date, timestamp, author: match.groups.author };
    }
    return { date, timestamp };
}
exports.getFileCommitDate = getFileCommitDate;
//# sourceMappingURL=gitUtils.js.map