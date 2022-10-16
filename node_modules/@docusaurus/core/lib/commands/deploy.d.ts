/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type LoadContextOptions } from '../server';
export declare type DeployCLIOptions = Pick<LoadContextOptions, 'config' | 'locale' | 'outDir'> & {
    skipBuild?: boolean;
};
export declare function deploy(siteDirParam?: string, cliOptions?: Partial<DeployCLIOptions>): Promise<void>;
