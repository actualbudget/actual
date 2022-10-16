"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOptions = exports.DEFAULT_OPTIONS = void 0;
const utils_validation_1 = require("@docusaurus/utils-validation");
const utils_1 = require("@docusaurus/utils");
exports.DEFAULT_OPTIONS = {
    path: 'src/pages',
    routeBasePath: '/',
    include: ['**/*.{js,jsx,ts,tsx,md,mdx}'],
    exclude: utils_1.GlobExcludeDefault,
    mdxPageComponent: '@theme/MDXPage',
    remarkPlugins: [],
    rehypePlugins: [],
    beforeDefaultRehypePlugins: [],
    beforeDefaultRemarkPlugins: [],
    admonitions: true,
};
const PluginOptionSchema = utils_validation_1.Joi.object({
    path: utils_validation_1.Joi.string().default(exports.DEFAULT_OPTIONS.path),
    routeBasePath: utils_validation_1.Joi.string().default(exports.DEFAULT_OPTIONS.routeBasePath),
    include: utils_validation_1.Joi.array().items(utils_validation_1.Joi.string()).default(exports.DEFAULT_OPTIONS.include),
    exclude: utils_validation_1.Joi.array().items(utils_validation_1.Joi.string()).default(exports.DEFAULT_OPTIONS.exclude),
    mdxPageComponent: utils_validation_1.Joi.string().default(exports.DEFAULT_OPTIONS.mdxPageComponent),
    remarkPlugins: utils_validation_1.RemarkPluginsSchema.default(exports.DEFAULT_OPTIONS.remarkPlugins),
    rehypePlugins: utils_validation_1.RehypePluginsSchema.default(exports.DEFAULT_OPTIONS.rehypePlugins),
    beforeDefaultRehypePlugins: utils_validation_1.RehypePluginsSchema.default(exports.DEFAULT_OPTIONS.beforeDefaultRehypePlugins),
    beforeDefaultRemarkPlugins: utils_validation_1.RemarkPluginsSchema.default(exports.DEFAULT_OPTIONS.beforeDefaultRemarkPlugins),
    admonitions: utils_validation_1.AdmonitionsSchema.default(exports.DEFAULT_OPTIONS.admonitions),
});
function validateOptions({ validate, options, }) {
    const validatedOptions = validate(PluginOptionSchema, options);
    return validatedOptions;
}
exports.validateOptions = validateOptions;
