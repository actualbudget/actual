/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { Joi } from '@docusaurus/utils-validation';
import type { ThemeConfig, ThemeConfigValidationContext } from '@docusaurus/types';
export declare const DEFAULT_CONFIG: {
    contextualSearch: boolean;
    searchParameters: {};
    searchPagePath: string;
};
export declare const Schema: Joi.ObjectSchema<ThemeConfig>;
export declare function validateThemeConfig({ validate, themeConfig, }: ThemeConfigValidationContext<ThemeConfig>): ThemeConfig;
