import { useSelector } from 'react-redux';

import { isNonProductionEnvironment } from 'loot-core/src/shared/environment';
import type { Theme } from 'loot-core/src/types/prefs';

import * as darkTheme from './themes/dark';
import * as developmentTheme from './themes/development';
import * as lightTheme from './themes/light';

const themes = {
  light: lightTheme,
  dark: darkTheme,
  ...(isNonProductionEnvironment() && { development: developmentTheme }),
};

export const themeNames = Object.keys(themes) as Theme[];

export function useTheme() {
  return useSelector(state => state.prefs.global?.theme) || 'light';
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
