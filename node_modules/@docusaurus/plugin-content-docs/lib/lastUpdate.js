"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileLastUpdate = void 0;
const tslib_1 = require("tslib");
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const utils_1 = require("@docusaurus/utils");
let showedGitRequirementError = false;
let showedFileNotTrackedError = false;
async function getFileLastUpdate(filePath) {
    if (!filePath) {
        return null;
    }
    // Wrap in try/catch in case the shell commands fail
    // (e.g. project doesn't use Git, etc).
    try {
        const result = (0, utils_1.getFileCommitDate)(filePath, {
            age: 'newest',
            includeAuthor: true,
        });
        return { timestamp: result.timestamp, author: result.author };
    }
    catch (err) {
        if (err instanceof utils_1.GitNotFoundError) {
            if (!showedGitRequirementError) {
                logger_1.default.warn('Sorry, the docs plugin last update options require Git.');
                showedGitRequirementError = true;
            }
        }
        else if (err instanceof utils_1.FileNotTrackedError) {
            if (!showedFileNotTrackedError) {
                logger_1.default.warn('Cannot infer the update date for some files, as they are not tracked by git.');
                showedFileNotTrackedError = true;
            }
        }
        else {
            logger_1.default.warn(err);
        }
        return null;
    }
}
exports.getFileLastUpdate = getFileLastUpdate;
