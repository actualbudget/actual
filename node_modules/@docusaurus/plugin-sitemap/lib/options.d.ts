/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { EnumChangefreq } from 'sitemap';
import type { OptionValidationContext } from '@docusaurus/types';
export declare type PluginOptions = {
    /** @see https://www.sitemaps.org/protocol.html#xmlTagDefinitions */
    changefreq: EnumChangefreq;
    /** @see https://www.sitemaps.org/protocol.html#xmlTagDefinitions */
    priority: number;
    /**
     * A list of glob patterns; matching route paths will be filtered from the
     * sitemap. Note that you may need to include the base URL in here.
     */
    ignorePatterns: string[];
    /**
     * The path to the created sitemap file, relative to the output directory.
     * Useful if you have two plugin instances outputting two files.
     */
    filename: string;
};
export declare type Options = Partial<PluginOptions>;
export declare const DEFAULT_OPTIONS: PluginOptions;
export declare function validateOptions({ validate, options, }: OptionValidationContext<Options, PluginOptions>): PluginOptions;
