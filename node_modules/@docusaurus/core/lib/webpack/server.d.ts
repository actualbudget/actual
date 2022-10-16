/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type Locals } from '@slorber/static-site-generator-webpack-plugin';
import type { Props } from '@docusaurus/types';
import type { Configuration } from 'webpack';
export default function createServerConfig({ props, onLinksCollected, onHeadTagsCollected, }: Pick<Locals, 'onLinksCollected' | 'onHeadTagsCollected'> & {
    props: Props;
}): Promise<Configuration>;
