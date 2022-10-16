/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/// <reference types="@docusaurus/module-type-aliases" />
/// <reference types="react" />
import { type InterpolateValues } from '@docusaurus/Interpolate';
import type { TranslateParam, TranslateProps } from '@docusaurus/Translate';
export declare function translate<Str extends string>({ message, id }: TranslateParam<Str>, values?: InterpolateValues<Str, string | number>): string;
export default function Translate<Str extends string>({ children, id, values, }: TranslateProps<Str>): JSX.Element;
