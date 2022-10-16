"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVersionTags = void 0;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const utils_1 = require("@docusaurus/utils");
function getVersionTags(docs) {
    const groups = (0, utils_1.groupTaggedItems)(docs, (doc) => doc.tags);
    return lodash_1.default.mapValues(groups, (group) => ({
        label: group.tag.label,
        docIds: group.items.map((item) => item.id),
        permalink: group.tag.permalink,
    }));
}
exports.getVersionTags = getVersionTags;
