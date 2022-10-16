/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type LoadContextOptions } from '../server';
import { type WriteTranslationsOptions } from '../server/translations/translations';
export declare type WriteTranslationsCLIOptions = Pick<LoadContextOptions, 'config' | 'locale'> & WriteTranslationsOptions;
export declare function writeTranslations(siteDirParam?: string, options?: Partial<WriteTranslationsCLIOptions>): Promise<void>;
