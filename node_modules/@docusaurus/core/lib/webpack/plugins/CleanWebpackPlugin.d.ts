/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { Compiler, Stats } from 'webpack';
export declare type Options = {
    /**
     * Write Logs to Console
     * (Always enabled when dry is true)
     *
     * default: false
     */
    verbose?: boolean;
    /**
     * Automatically remove all unused webpack assets on rebuild
     *
     * default: true
     */
    cleanStaleWebpackAssets?: boolean;
    /**
     * Do not allow removal of current webpack assets
     *
     * default: true
     */
    protectWebpackAssets?: boolean;
    /**
     * Removes files once prior to Webpack compilation
     *   Not included in rebuilds (watch mode)
     *
     * Use !negative patterns to exclude files
     *
     * default: ['**\/*']
     */
    cleanOnceBeforeBuildPatterns?: string[];
};
export default class CleanWebpackPlugin {
    private readonly verbose;
    private readonly cleanStaleWebpackAssets;
    private readonly protectWebpackAssets;
    private readonly cleanOnceBeforeBuildPatterns;
    private currentAssets;
    private initialClean;
    private outputPath;
    constructor(options?: Options);
    apply(compiler: Compiler): void;
    /**
     * Initially remove files from output directory prior to build.
     *
     * Only happens once.
     *
     * Warning: It is recommended to initially clean your build directory outside
     * of webpack to minimize unexpected behavior.
     */
    handleInitial(): void;
    handleDone(stats: Stats): void;
    removeFiles(patterns: string[]): void;
}
