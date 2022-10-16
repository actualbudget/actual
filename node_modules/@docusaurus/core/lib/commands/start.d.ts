/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type LoadContextOptions } from '../server';
import { type HostPortOptions } from '../server/getHostPort';
export declare type StartCLIOptions = HostPortOptions & Pick<LoadContextOptions, 'locale' | 'config'> & {
    hotOnly?: boolean;
    open?: boolean;
    poll?: boolean | number;
    minify?: boolean;
};
export declare function start(siteDirParam?: string, cliOptions?: Partial<StartCLIOptions>): Promise<void>;
