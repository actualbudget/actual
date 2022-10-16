"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const linkify_1 = require("./linkify");
function markdownLoader(source) {
    const fileString = source;
    const callback = this.async();
    const options = this.getOptions();
    return callback(null, (0, linkify_1.linkify)(fileString, this.resourcePath, options));
}
exports.default = markdownLoader;
