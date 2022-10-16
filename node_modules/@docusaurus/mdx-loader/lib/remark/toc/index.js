"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const parser_1 = require("@babel/parser");
const traverse_1 = tslib_1.__importDefault(require("@babel/traverse"));
const stringify_object_1 = tslib_1.__importDefault(require("stringify-object"));
const mdast_util_to_string_1 = tslib_1.__importDefault(require("mdast-util-to-string"));
const unist_util_visit_1 = tslib_1.__importDefault(require("unist-util-visit"));
const utils_1 = require("../utils");
const parseOptions = {
    plugins: ['jsx'],
    sourceType: 'module',
};
const name = 'toc';
const isImport = (child) => child.type === 'import';
const hasImports = (index) => index > -1;
const isExport = (child) => child.type === 'export';
const isTarget = (child) => {
    let found = false;
    const ast = (0, parser_1.parse)(child.value, parseOptions);
    (0, traverse_1.default)(ast, {
        VariableDeclarator: (path) => {
            if (path.node.id.name === name) {
                found = true;
            }
        },
    });
    return found;
};
const getOrCreateExistingTargetIndex = (children) => {
    let importsIndex = -1;
    let targetIndex = -1;
    children.forEach((child, index) => {
        if (isImport(child)) {
            importsIndex = index;
        }
        else if (isExport(child) && isTarget(child)) {
            targetIndex = index;
        }
    });
    if (targetIndex === -1) {
        const target = {
            default: false,
            type: 'export',
            value: `export const ${name} = [];`,
        };
        targetIndex = hasImports(importsIndex) ? importsIndex + 1 : 0;
        children.splice(targetIndex, 0, target);
    }
    return targetIndex;
};
function plugin() {
    return (root) => {
        const headings = [];
        (0, unist_util_visit_1.default)(root, 'heading', (child, index, parent) => {
            const value = (0, mdast_util_to_string_1.default)(child);
            // depth: 1 headings are titles and not included in the TOC
            if (parent !== root || !value || child.depth < 2) {
                return;
            }
            headings.push({
                value: (0, utils_1.toValue)(child),
                id: child.data.id,
                level: child.depth,
            });
        });
        const { children } = root;
        const targetIndex = getOrCreateExistingTargetIndex(children);
        if (headings.length) {
            children[targetIndex].value = `export const ${name} = ${(0, stringify_object_1.default)(headings)};`;
        }
    };
}
exports.default = plugin;
//# sourceMappingURL=index.js.map