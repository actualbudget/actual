/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import Joi from './Joi';
export declare const PluginIdSchema: Joi.StringSchema;
export declare const RemarkPluginsSchema: Joi.ArraySchema;
export declare const RehypePluginsSchema: Joi.ArraySchema;
export declare const AdmonitionsSchema: Joi.AlternativesSchema;
export declare const URISchema: Joi.AlternativesSchema;
export declare const PathnameSchema: Joi.StringSchema;
export declare const FrontMatterTagsSchema: Joi.ArraySchema;
export declare const FrontMatterTOCHeadingLevels: {
    toc_min_heading_level: Joi.NumberSchema;
    toc_max_heading_level: Joi.NumberSchema;
};
//# sourceMappingURL=validationSchemas.d.ts.map