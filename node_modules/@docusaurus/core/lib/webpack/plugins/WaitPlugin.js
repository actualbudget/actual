"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const wait_on_1 = tslib_1.__importDefault(require("wait-on"));
class WaitPlugin {
    constructor(options) {
        this.filepath = options.filepath;
    }
    apply(compiler) {
        // Before finishing the compilation step
        compiler.hooks.make.tapAsync('WaitPlugin', (compilation, callback) => {
            // To prevent 'waitFile' error on waiting non-existing directory
            fs_extra_1.default.ensureDir(path_1.default.dirname(this.filepath), {}, () => {
                // Wait until file exist
                (0, wait_on_1.default)({
                    resources: [this.filepath],
                    interval: 300,
                })
                    .then(() => {
                    callback();
                })
                    .catch((error) => {
                    console.warn(`WaitPlugin error: ${error}`);
                });
            });
        });
    }
}
exports.default = WaitPlugin;
