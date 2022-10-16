/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { LoadContext, InitializedPlugin } from '@docusaurus/types';
/**
 * Runs the plugin constructors and returns their return values. It would load
 * plugin configs from `plugins`, `themes`, and `presets`.
 */
export declare function initPlugins(context: LoadContext): Promise<InitializedPlugin[]>;
