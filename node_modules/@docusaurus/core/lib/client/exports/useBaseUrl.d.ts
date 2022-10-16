/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/// <reference types="@docusaurus/module-type-aliases" />
import type { BaseUrlOptions, BaseUrlUtils } from '@docusaurus/useBaseUrl';
export declare function useBaseUrlUtils(): BaseUrlUtils;
export default function useBaseUrl(url: string, options?: BaseUrlOptions): string;
