"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAsyncSequential = exports.mapAsyncSequential = exports.removePrefix = exports.removeSuffix = void 0;
/** Removes a given string suffix from `str`. */
function removeSuffix(str, suffix) {
    if (suffix === '') {
        // str.slice(0, 0) is ""
        return str;
    }
    return str.endsWith(suffix) ? str.slice(0, -suffix.length) : str;
}
exports.removeSuffix = removeSuffix;
/** Removes a given string prefix from `str`. */
function removePrefix(str, prefix) {
    return str.startsWith(prefix) ? str.slice(prefix.length) : str;
}
exports.removePrefix = removePrefix;
/**
 * `Array#map` for async operations where order matters.
 * @param array The array to traverse.
 * @param action An async action to be performed on every array item. Will be
 * awaited before working on the next.
 * @returns The list of results returned from every `action(item)`
 */
async function mapAsyncSequential(array, action) {
    const results = [];
    for (const t of array) {
        const result = await action(t);
        results.push(result);
    }
    return results;
}
exports.mapAsyncSequential = mapAsyncSequential;
/**
 * `Array#find` for async operations where order matters.
 * @param array The array to traverse.
 * @param predicate An async predicate to be called on every array item. Should
 * return a boolean indicating whether the currently element should be returned.
 * @returns The function immediately returns the first item on which `predicate`
 * returns `true`, or `undefined` if none matches the predicate.
 */
async function findAsyncSequential(array, predicate) {
    for (const t of array) {
        if (await predicate(t)) {
            return t;
        }
    }
    return undefined;
}
exports.findAsyncSequential = findAsyncSequential;
//# sourceMappingURL=jsUtils.js.map