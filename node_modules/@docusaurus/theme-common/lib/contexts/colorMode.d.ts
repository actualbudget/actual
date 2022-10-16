/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type ReactNode } from 'react';
declare type ContextValue = {
    /** Current color mode. */
    readonly colorMode: ColorMode;
    /** Set new color mode. */
    readonly setColorMode: (colorMode: ColorMode) => void;
    readonly isDarkTheme: boolean;
    readonly setLightTheme: () => void;
    readonly setDarkTheme: () => void;
};
declare const ColorModes: {
    readonly light: "light";
    readonly dark: "dark";
};
export declare type ColorMode = typeof ColorModes[keyof typeof ColorModes];
export declare function ColorModeProvider({ children, }: {
    children: ReactNode;
}): JSX.Element;
export declare function useColorMode(): ContextValue;
export {};
//# sourceMappingURL=colorMode.d.ts.map