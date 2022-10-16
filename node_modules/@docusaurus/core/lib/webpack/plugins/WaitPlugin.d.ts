/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { Compiler } from 'webpack';
declare type WaitPluginOptions = {
    filepath: string;
};
export default class WaitPlugin {
    filepath: string;
    constructor(options: WaitPluginOptions);
    apply(compiler: Compiler): void;
}
export {};
