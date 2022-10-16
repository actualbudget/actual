/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/// <reference types="node" />
import { type Configuration, type RuleSetRule, type WebpackPluginInstance } from 'webpack';
import type { TransformOptions } from '@babel/core';
import type { Plugin } from '@docusaurus/types';
export declare function getStyleLoaders(isServer: boolean, cssOptionsArg?: {
    [key: string]: unknown;
}): RuleSetRule[];
export declare function getCustomBabelConfigFilePath(siteDir: string): Promise<string | undefined>;
export declare function getBabelOptions({ isServer, babelOptions, }?: {
    isServer?: boolean;
    babelOptions?: TransformOptions | string;
}): TransformOptions;
export declare const getCustomizableJSLoader: (jsLoader?: "babel" | ((isServer: boolean) => RuleSetRule)) => ({ isServer, babelOptions, }: {
    isServer: boolean;
    babelOptions?: string | TransformOptions | undefined;
}) => RuleSetRule;
/**
 * Helper function to modify webpack config
 * @param configureWebpack a webpack config or a function to modify config
 * @param config initial webpack config
 * @param isServer indicates if this is a server webpack configuration
 * @param jsLoader custom js loader config
 * @param content content loaded by the plugin
 * @returns final/ modified webpack config
 */
export declare function applyConfigureWebpack(configureWebpack: NonNullable<Plugin['configureWebpack']>, config: Configuration, isServer: boolean, jsLoader: 'babel' | ((isServer: boolean) => RuleSetRule) | undefined, content: unknown): Configuration;
export declare function applyConfigurePostCss(configurePostCss: NonNullable<Plugin['configurePostCss']>, config: Configuration): Configuration;
declare global {
    interface Error {
        /** @see https://webpack.js.org/api/node/#error-handling */
        details: unknown;
    }
}
export declare function compile(config: Configuration[]): Promise<void>;
export declare function getHttpsConfig(): Promise<boolean | {
    cert: Buffer;
    key: Buffer;
}>;
export declare function getMinimizer(useSimpleCssMinifier?: boolean): WebpackPluginInstance[];
