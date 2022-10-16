"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const unist_util_visit_1 = tslib_1.__importDefault(require("unist-util-visit"));
// This plugin is mostly to help integrating Docusaurus with translation systems
// that do not support well MDX embedded JSX syntax (like Crowdin).
// We wrap the JSX syntax in code blocks so that translation tools don't mess up
// with the markup, but the JSX inside such code blocks should still be
// evaluated as JSX
// See https://github.com/facebook/docusaurus/pull/4278
function plugin() {
    return (root) => {
        (0, unist_util_visit_1.default)(root, 'code', (node, index, parent) => {
            if (node.lang === 'mdx-code-block') {
                const newChildren = this.parse(node.value).children;
                // Replace the mdx code block by its content, parsed
                parent.children.splice(parent.children.indexOf(node), 1, ...newChildren);
            }
        });
    };
}
exports.default = plugin;
//# sourceMappingURL=index.js.map