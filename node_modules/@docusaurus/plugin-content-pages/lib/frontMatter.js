"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePageFrontMatter = void 0;
const utils_validation_1 = require("@docusaurus/utils-validation");
const PageFrontMatterSchema = utils_validation_1.Joi.object({
    title: utils_validation_1.Joi.string(),
    description: utils_validation_1.Joi.string(),
    wrapperClassName: utils_validation_1.Joi.string(),
    hide_table_of_contents: utils_validation_1.Joi.boolean(),
    ...utils_validation_1.FrontMatterTOCHeadingLevels,
});
function validatePageFrontMatter(frontMatter) {
    return (0, utils_validation_1.validateFrontMatter)(frontMatter, PageFrontMatterSchema);
}
exports.validatePageFrontMatter = validatePageFrontMatter;
