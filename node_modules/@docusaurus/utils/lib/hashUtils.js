"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.docuHash = exports.simpleHash = exports.md5Hash = void 0;
const tslib_1 = require("tslib");
const crypto_1 = require("crypto");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const pathUtils_1 = require("./pathUtils");
/** Thin wrapper around `crypto.createHash("md5")`. */
function md5Hash(str) {
    return (0, crypto_1.createHash)('md5').update(str).digest('hex');
}
exports.md5Hash = md5Hash;
/** Creates an MD5 hash and truncates it to the given length. */
function simpleHash(str, length) {
    return md5Hash(str).substring(0, length);
}
exports.simpleHash = simpleHash;
// Based on https://github.com/gatsbyjs/gatsby/pull/21518/files
/**
 * Given an input string, convert to kebab-case and append a hash, avoiding name
 * collision. Also removes part of the string if its larger than the allowed
 * filename per OS, avoiding `ERRNAMETOOLONG` error.
 */
function docuHash(str) {
    if (str === '/') {
        return 'index';
    }
    const shortHash = simpleHash(str, 3);
    const parsedPath = `${lodash_1.default.kebabCase(str)}-${shortHash}`;
    if ((0, pathUtils_1.isNameTooLong)(parsedPath)) {
        return `${(0, pathUtils_1.shortName)(lodash_1.default.kebabCase(str))}-${shortHash}`;
    }
    return parsedPath;
}
exports.docuHash = docuHash;
//# sourceMappingURL=hashUtils.js.map