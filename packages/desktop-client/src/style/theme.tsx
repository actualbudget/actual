import { useSelector } from 'react-redux';

import { selectGlobalPrefTheme } from 'loot-core/src/client/selectors';
import type { Theme } from 'loot-core/src/types/prefs';

import * as darkTheme from './themes/dark';
import * as lightTheme from './themes/light';

const themes = {
  light: lightTheme,
  dark: darkTheme,
};

export const themeNames = Object.keys(themes) as Theme[];

export function useTheme() {
  return useSelector(selectGlobalPrefTheme) || 'light';
}

export function ThemeStyle() {
  let theme = useTheme();
  let themeColors = themes[theme];
  let css = Object.keys(themeColors)
    .map(key => `  --color-${key}: ${themeColors[key]};`)
    .join('\n');
  return <style>{`:root {\n${css}}`}</style>;
}

export const theme = Object.fromEntries(
  Object.keys(lightTheme).map(key => [key, `var(--color-${key})`]),
) as Record<keyof typeof lightTheme, string>;
