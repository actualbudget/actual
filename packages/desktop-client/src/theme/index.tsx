import type { Theme } from 'loot-core/src/client/state-types/prefs';
import { isNonProductionEnvironment } from 'loot-core/src/shared/environment';

import * as darkTheme from './dark';
import * as developmentTheme from './development';
import * as lightTheme from './light';

const themes = {
  light: lightTheme,
  dark: darkTheme,
  ...(isNonProductionEnvironment() && { development: developmentTheme }),
};

export const themeNames = Object.keys(themes) as Theme[];

export function ThemeStyle({ theme }: { theme: Theme }) {
  let themeColors = themes[theme];
  let css = Object.keys(themeColors)
    .map(key => {
      return `--${key}: ${themeColors[key]};`;
    })
    .join('\n');
  return <style>{`:root { ${css} }`}</style>;
}

// eslint-disable-next-line import/no-unused-modules
export const colors = Object.fromEntries(
  Object.keys(lightTheme).map(key => [key, `var(--${key})`]),
) as Record<keyof typeof lightTheme, string>;
