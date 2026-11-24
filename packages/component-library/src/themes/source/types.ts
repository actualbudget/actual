import type { DerivedAccentToken } from './derive';
import type { PaletteName } from './palette';

export const themeNames = ['light', 'dark', 'midnight'] as const;

export type ThemeName = (typeof themeNames)[number];

export type TokenValue =
  | PaletteName
  | { ref: string }
  | { raw: string }
  | { derive: DerivedAccentToken }
  | { accentTextOn: string; contrast?: number }
  | { contrastOn: string; over?: string };

type TokenValues = { all: TokenValue } | Record<ThemeName, TokenValue>;

export type TokenDefinition = TokenValues & {
  fallback?: string;
  description?: string;
  deprecated?: { replacedBy: string };
};
