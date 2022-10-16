"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FrontMatterTOCHeadingLevels = exports.FrontMatterTagsSchema = exports.PathnameSchema = exports.URISchema = exports.AdmonitionsSchema = exports.RehypePluginsSchema = exports.RemarkPluginsSchema = exports.PluginIdSchema = exports.validateFrontMatter = exports.normalizeThemeConfig = exports.normalizePluginOptions = exports.printWarning = exports.JoiFrontMatter = exports.Joi = void 0;
// /!\ don't remove this export, as we recommend plugin authors to use it
var Joi_1 = require("./Joi");
Object.defineProperty(exports, "Joi", { enumerable: true, get: function () { return __importDefault(Joi_1).default; } });
var JoiFrontMatter_1 = require("./JoiFrontMatter");
Object.defineProperty(exports, "JoiFrontMatter", { enumerable: true, get: function () { return JoiFrontMatter_1.JoiFrontMatter; } });
var validationUtils_1 = require("./validationUtils");
Object.defineProperty(exports, "printWarning", { enumerable: true, get: function () { return validationUtils_1.printWarning; } });
Object.defineProperty(exports, "normalizePluginOptions", { enumerable: true, get: function () { return validationUtils_1.normalizePluginOptions; } });
Object.defineProperty(exports, "normalizeThemeConfig", { enumerable: true, get: function () { return validationUtils_1.normalizeThemeConfig; } });
Object.defineProperty(exports, "validateFrontMatter", { enumerable: true, get: function () { return validationUtils_1.validateFrontMatter; } });
var validationSchemas_1 = require("./validationSchemas");
Object.defineProperty(exports, "PluginIdSchema", { enumerable: true, get: function () { return validationSchemas_1.PluginIdSchema; } });
Object.defineProperty(exports, "RemarkPluginsSchema", { enumerable: true, get: function () { return validationSchemas_1.RemarkPluginsSchema; } });
Object.defineProperty(exports, "RehypePluginsSchema", { enumerable: true, get: function () { return validationSchemas_1.RehypePluginsSchema; } });
Object.defineProperty(exports, "AdmonitionsSchema", { enumerable: true, get: function () { return validationSchemas_1.AdmonitionsSchema; } });
Object.defineProperty(exports, "URISchema", { enumerable: true, get: function () { return validationSchemas_1.URISchema; } });
Object.defineProperty(exports, "PathnameSchema", { enumerable: true, get: function () { return validationSchemas_1.PathnameSchema; } });
Object.defineProperty(exports, "FrontMatterTagsSchema", { enumerable: true, get: function () { return validationSchemas_1.FrontMatterTagsSchema; } });
Object.defineProperty(exports, "FrontMatterTOCHeadingLevels", { enumerable: true, get: function () { return validationSchemas_1.FrontMatterTOCHeadingLevels; } });
//# sourceMappingURL=index.js.map