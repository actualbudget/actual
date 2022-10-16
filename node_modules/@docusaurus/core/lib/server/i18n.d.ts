/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { I18n, DocusaurusConfig, I18nLocaleConfig } from '@docusaurus/types';
import type { LoadContextOptions } from './index';
export declare function getDefaultLocaleConfig(locale: string): I18nLocaleConfig;
export declare function loadI18n(config: DocusaurusConfig, options: Pick<LoadContextOptions, 'locale'>): Promise<I18n>;
