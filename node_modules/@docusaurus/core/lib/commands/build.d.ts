/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type LoadContextOptions } from '../server';
export declare type BuildCLIOptions = Pick<LoadContextOptions, 'config' | 'locale' | 'outDir'> & {
    bundleAnalyzer?: boolean;
    minify?: boolean;
};
export declare function build(siteDirParam?: string, cliOptions?: Partial<BuildCLIOptions>, forceTerminate?: boolean): Promise<string>;
