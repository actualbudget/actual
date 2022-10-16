/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type HostPortOptions } from '../server/getHostPort';
import type { LoadContextOptions } from '../server';
export declare type ServeCLIOptions = HostPortOptions & Pick<LoadContextOptions, 'config'> & {
    dir?: string;
    build?: boolean;
    open?: boolean;
};
export declare function serve(siteDirParam?: string, cliOptions?: Partial<ServeCLIOptions>): Promise<void>;
