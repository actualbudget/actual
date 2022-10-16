"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const webpackbar_1 = tslib_1.__importDefault(require("webpackbar"));
const formatWebpackMessages_1 = tslib_1.__importDefault(require("react-dev-utils/formatWebpackMessages"));
function showError(arr) {
    console.log(`\n\n${arr.join('\n')}`);
}
class LogPlugin extends webpackbar_1.default {
    apply(compiler) {
        super.apply(compiler);
        // TODO can't this be done in compile(configs) alongside the warnings???
        compiler.hooks.done.tap('DocusaurusLogPlugin', (stats) => {
            if (stats.hasErrors()) {
                const errorsWarnings = stats.toJson('errors-warnings');
                // TODO do we really want to keep this legacy logic?
                // let's wait and see how the react-dev-utils support Webpack5
                // we probably want to print the error stacktraces here
                const messages = (0, formatWebpackMessages_1.default)(errorsWarnings);
                if (messages.errors.length) {
                    showError(messages.errors);
                }
            }
        });
    }
}
exports.default = LogPlugin;
