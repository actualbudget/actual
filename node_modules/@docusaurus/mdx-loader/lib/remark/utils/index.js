"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toValue = exports.stringifyContent = void 0;
const tslib_1 = require("tslib");
const escape_html_1 = tslib_1.__importDefault(require("escape-html"));
const mdast_util_to_string_1 = tslib_1.__importDefault(require("mdast-util-to-string"));
function stringifyContent(node) {
    return node.children.map(toValue).join('');
}
exports.stringifyContent = stringifyContent;
function toValue(node) {
    switch (node.type) {
        case 'text':
            return (0, escape_html_1.default)(node.value);
        case 'heading':
            return stringifyContent(node);
        case 'inlineCode':
            return `<code>${(0, escape_html_1.default)(node.value)}</code>`;
        case 'emphasis':
            return `<em>${stringifyContent(node)}</em>`;
        case 'strong':
            return `<strong>${stringifyContent(node)}</strong>`;
        case 'delete':
            return `<del>${stringifyContent(node)}</del>`;
        case 'link':
            return stringifyContent(node);
        default:
            return (0, mdast_util_to_string_1.default)(node);
    }
}
exports.toValue = toValue;
//# sourceMappingURL=index.js.map