/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { LoadContext, Plugin } from '@docusaurus/types';
import type { PagesContentPaths } from './types';
import type { PluginOptions, LoadedContent } from '@docusaurus/plugin-content-pages';
export declare function getContentPathList(contentPaths: PagesContentPaths): string[];
export default function pluginContentPages(context: LoadContext, options: PluginOptions): Plugin<LoadedContent | null>;
export { validateOptions } from './options';
