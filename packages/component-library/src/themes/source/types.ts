import type { PaletteName } from './palette';

export const themeNames = ['light', 'dark', 'midnight'] as const;

export type ThemeName = (typeof themeNames)[number];

export type TokenValue = PaletteName | { ref: string } | { raw: string };

type TokenValues = { all: TokenValue } | Record<ThemeName, TokenValue>;

export type TokenDefinition = TokenValues & {
  fallback?: string;
  description?: string;
  deprecated?: { replacedBy: string };
};
