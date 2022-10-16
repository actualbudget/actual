"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* Based on remark-slug (https://github.com/remarkjs/remark-slug) and gatsby-remark-autolink-headers (https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-remark-autolink-headers) */
const utils_1 = require("@docusaurus/utils");
const unist_util_visit_1 = tslib_1.__importDefault(require("unist-util-visit"));
const mdast_util_to_string_1 = tslib_1.__importDefault(require("mdast-util-to-string"));
function plugin() {
    return (root) => {
        const slugs = (0, utils_1.createSlugger)();
        (0, unist_util_visit_1.default)(root, 'heading', (headingNode) => {
            const data = headingNode.data ?? (headingNode.data = {});
            const properties = (data.hProperties || (data.hProperties = {}));
            let { id } = properties;
            if (id) {
                id = slugs.slug(id, { maintainCase: true });
            }
            else {
                const headingTextNodes = headingNode.children.filter(({ type }) => !['html', 'jsx'].includes(type));
                const heading = (0, mdast_util_to_string_1.default)(headingTextNodes.length > 0 ? headingTextNodes : headingNode);
                // Support explicit heading IDs
                const parsedHeading = (0, utils_1.parseMarkdownHeadingId)(heading);
                id = parsedHeading.id ?? slugs.slug(heading);
                if (parsedHeading.id) {
                    // When there's an id, it is always in the last child node
                    // Sometimes heading is in multiple "parts" (** syntax creates a child
                    // node):
                    // ## part1 *part2* part3 {#id}
                    const lastNode = headingNode.children[headingNode.children.length - 1];
                    if (headingNode.children.length > 1) {
                        const lastNodeText = (0, utils_1.parseMarkdownHeadingId)(lastNode.value).text;
                        // When last part contains test+id, remove the id
                        if (lastNodeText) {
                            lastNode.value = lastNodeText;
                        }
                        // When last part contains only the id: completely remove that node
                        else {
                            headingNode.children.pop();
                        }
                    }
                    else {
                        lastNode.value = parsedHeading.text;
                    }
                }
            }
            data.id = id;
            properties.id = id;
        });
    };
}
exports.default = plugin;
//# sourceMappingURL=index.js.map