/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type Compiler } from 'webpack';
/**
 * We modify webpack runtime to add an extra function called
 * "__webpack_require__.gca" that will allow us to get the corresponding chunk
 * asset for a webpack chunk. Pass it the chunkName or chunkId you want to load.
 * For example: if you have a chunk named "my-chunk-name" that will map to
 * "/publicPath/0a84b5e7.c8e35c7a.js" as its corresponding output path
 * __webpack_require__.gca("my-chunk-name") will return
 * "/publicPath/0a84b5e7.c8e35c7a.js"
 *
 * "gca" stands for "get chunk asset"
 */
export default class ChunkAssetPlugin {
    apply(compiler: Compiler): void;
}
