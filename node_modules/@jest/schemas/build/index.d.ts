/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {Static} from '@sinclair/typebox';
import {TBoolean} from '@sinclair/typebox';
import {TNull} from '@sinclair/typebox';
import {TNumber} from '@sinclair/typebox';
import {TObject} from '@sinclair/typebox';
import {TPartial} from '@sinclair/typebox';
import {TReadonly} from '@sinclair/typebox';
import {TString} from '@sinclair/typebox';

declare const RawSnapshotFormat: TPartial<
  TObject<{
    callToJSON: TReadonly<TBoolean>;
    compareKeys: TReadonly<TNull>;
    escapeRegex: TReadonly<TBoolean>;
    escapeString: TReadonly<TBoolean>;
    highlight: TReadonly<TBoolean>;
    indent: TReadonly<TNumber>;
    maxDepth: TReadonly<TNumber>;
    maxWidth: TReadonly<TNumber>;
    min: TReadonly<TBoolean>;
    printBasicPrototype: TReadonly<TBoolean>;
    printFunctionName: TReadonly<TBoolean>;
    theme: TReadonly<
      TPartial<
        TObject<{
          comment: TReadonly<TString>;
          content: TReadonly<TString>;
          prop: TReadonly<TString>;
          tag: TReadonly<TString>;
          value: TReadonly<TString>;
        }>
      >
    >;
  }>
>;

export declare const SnapshotFormat: TPartial<
  TObject<{
    callToJSON: TReadonly<TBoolean>;
    compareKeys: TReadonly<TNull>;
    escapeRegex: TReadonly<TBoolean>;
    escapeString: TReadonly<TBoolean>;
    highlight: TReadonly<TBoolean>;
    indent: TReadonly<TNumber>;
    maxDepth: TReadonly<TNumber>;
    maxWidth: TReadonly<TNumber>;
    min: TReadonly<TBoolean>;
    printBasicPrototype: TReadonly<TBoolean>;
    printFunctionName: TReadonly<TBoolean>;
    theme: TReadonly<
      TPartial<
        TObject<{
          comment: TReadonly<TString>;
          content: TReadonly<TString>;
          prop: TReadonly<TString>;
          tag: TReadonly<TString>;
          value: TReadonly<TString>;
        }>
      >
    >;
  }>
>;

export declare type SnapshotFormat = Static<typeof RawSnapshotFormat>;

export {};
