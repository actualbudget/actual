"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupTaggedItems = exports.normalizeFrontMatterTags = void 0;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const urlUtils_1 = require("./urlUtils");
function normalizeFrontMatterTag(tagsPath, frontMatterTag) {
    function toTagObject(tagString) {
        return {
            label: tagString,
            permalink: lodash_1.default.kebabCase(tagString),
        };
    }
    // TODO maybe make ensure the permalink is valid url path?
    function normalizeTagPermalink(permalink) {
        // Note: we always apply tagsPath on purpose. For versioned docs, v1/doc.md
        // and v2/doc.md tags with custom permalinks don't lead to the same created
        // page. tagsPath is different for each doc version
        return (0, urlUtils_1.normalizeUrl)([tagsPath, permalink]);
    }
    const tag = typeof frontMatterTag === 'string'
        ? toTagObject(frontMatterTag)
        : frontMatterTag;
    return {
        label: tag.label,
        permalink: normalizeTagPermalink(tag.permalink),
    };
}
/**
 * Takes tag objects as they are defined in front matter, and normalizes each
 * into a standard tag object. The permalink is created by appending the
 * sluggified label to `tagsPath`. Front matter tags already containing
 * permalinks would still have `tagsPath` prepended.
 *
 * The result will always be unique by permalinks. The behavior with colliding
 * permalinks is undetermined.
 */
function normalizeFrontMatterTags(
/** Base path to append the tag permalinks to. */
tagsPath, 
/** Can be `undefined`, so that we can directly pipe in `frontMatter.tags`. */
frontMatterTags = []) {
    const tags = frontMatterTags.map((tag) => normalizeFrontMatterTag(tagsPath, tag));
    return lodash_1.default.uniqBy(tags, (tag) => tag.permalink);
}
exports.normalizeFrontMatterTags = normalizeFrontMatterTags;
/**
 * Permits to group docs/blog posts by tag (provided by front matter).
 *
 * @returns a map from tag permalink to the items and other relevant tag data.
 * The record is indexed by permalink, because routes must be unique in the end.
 * Labels may vary on 2 MD files but they are normalized. Docs with
 * label='some label' and label='some-label' should end up in the same page.
 */
function groupTaggedItems(items, 
/**
 * A callback telling me how to get the tags list of the current item. Usually
 * simply getting it from some metadata of the current item.
 */
getItemTags) {
    const result = {};
    items.forEach((item) => {
        getItemTags(item).forEach((tag) => {
            var _a;
            // Init missing tag groups
            // TODO: it's not really clear what should be the behavior if 2 tags have
            // the same permalink but the label is different for each
            // For now, the first tag found wins
            result[_a = tag.permalink] ?? (result[_a] = {
                tag,
                items: [],
            });
            // Add item to group
            result[tag.permalink].items.push(item);
        });
    });
    // If user add twice the same tag to a md doc (weird but possible),
    // we don't want the item to appear twice in the list...
    Object.values(result).forEach((group) => {
        group.items = lodash_1.default.uniq(group.items);
    });
    return result;
}
exports.groupTaggedItems = groupTaggedItems;
//# sourceMappingURL=tags.js.map