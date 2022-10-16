"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDocFrontMatter = void 0;
const utils_validation_1 = require("@docusaurus/utils-validation");
const FrontMatterLastUpdateErrorMessage = '{{#label}} does not look like a valid front matter FileChange object. Please use a FileChange object (with an author and/or date).';
// NOTE: we don't add any default value on purpose here
// We don't want default values to magically appear in doc metadata and props
// While the user did not provide those values explicitly
// We use default values in code instead
const DocFrontMatterSchema = utils_validation_1.JoiFrontMatter.object({
    id: utils_validation_1.JoiFrontMatter.string(),
    // See https://github.com/facebook/docusaurus/issues/4591#issuecomment-822372398
    title: utils_validation_1.JoiFrontMatter.string().allow(''),
    hide_title: utils_validation_1.JoiFrontMatter.boolean(),
    hide_table_of_contents: utils_validation_1.JoiFrontMatter.boolean(),
    keywords: utils_validation_1.JoiFrontMatter.array().items(utils_validation_1.JoiFrontMatter.string().required()),
    image: utils_validation_1.URISchema,
    // See https://github.com/facebook/docusaurus/issues/4591#issuecomment-822372398
    description: utils_validation_1.JoiFrontMatter.string().allow(''),
    slug: utils_validation_1.JoiFrontMatter.string(),
    sidebar_label: utils_validation_1.JoiFrontMatter.string(),
    sidebar_position: utils_validation_1.JoiFrontMatter.number(),
    sidebar_class_name: utils_validation_1.JoiFrontMatter.string(),
    sidebar_custom_props: utils_validation_1.JoiFrontMatter.object().unknown(),
    displayed_sidebar: utils_validation_1.JoiFrontMatter.string().allow(null),
    tags: utils_validation_1.FrontMatterTagsSchema,
    pagination_label: utils_validation_1.JoiFrontMatter.string(),
    custom_edit_url: utils_validation_1.URISchema.allow('', null),
    parse_number_prefixes: utils_validation_1.JoiFrontMatter.boolean(),
    pagination_next: utils_validation_1.JoiFrontMatter.string().allow(null),
    pagination_prev: utils_validation_1.JoiFrontMatter.string().allow(null),
    draft: utils_validation_1.JoiFrontMatter.boolean(),
    ...utils_validation_1.FrontMatterTOCHeadingLevels,
    last_update: utils_validation_1.JoiFrontMatter.object({
        author: utils_validation_1.JoiFrontMatter.string(),
        date: utils_validation_1.JoiFrontMatter.date().raw(),
    })
        .or('author', 'date')
        .messages({
        'object.missing': FrontMatterLastUpdateErrorMessage,
        'object.base': FrontMatterLastUpdateErrorMessage,
    }),
}).unknown();
function validateDocFrontMatter(frontMatter) {
    return (0, utils_validation_1.validateFrontMatter)(frontMatter, DocFrontMatterSchema);
}
exports.validateDocFrontMatter = validateDocFrontMatter;
