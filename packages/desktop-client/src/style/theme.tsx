// @ts-strict-ignore
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

import { isNonProductionEnvironment } from 'loot-core/src/shared/environment';
import type { DarkTheme, Theme } from 'loot-core/src/types/prefs';

import { useGlobalPref } from '../hooks/useGlobalPref';

import * as darkTheme from './themes/dark';
import * as developmentTheme from './themes/development';
import * as lightTheme from './themes/light';
import * as midnightTheme from './themes/midnight';

const themes = {
  light: { name: 'Light', colors: lightTheme },
  dark: { name: 'Dark', colors: darkTheme },
  midnight: { name: 'Midnight', colors: midnightTheme },
  auto: { name: 'System default', colors: darkTheme },
  ...(isNonProductionEnvironment() && {
    development: { name: 'Development', colors: developmentTheme },
  }),
};

export const themeOptions = Object.entries(themes).map(
  ([key, { name }]) => [key, name] as [Theme, string],
);

export const darkThemeOptions = Object.entries({
  dark: themes.dark,
  midnight: themes.midnight,
}).map(([key, { name }]) => [key, name] as [DarkTheme, string]);

export function useTheme() {
  const [theme = 'auto', setThemePref] = useGlobalPref('theme');
  return [theme, setThemePref] as const;
}

export function usePreferredDarkTheme() {
  const [darkTheme = 'dark', setDarkTheme] =
    useGlobalPref('preferredDarkTheme');
  return [darkTheme, setDarkTheme] as const;
}

export function ThemeStyle() {
  const [theme] = useTheme();
  const [darkThemePreference] = usePreferredDarkTheme();
  const [themeColors, setThemeColors] = useState<
    | typeof lightTheme
    | typeof darkTheme
    | typeof midnightTheme
    | typeof developmentTheme
    | undefined
  >(undefined);

  const setAutoThemeColors = useCallback(
    (isDarkMode: boolean) => {
      if (isDarkMode) {
        setThemeColors(themes[darkThemePreference].colors);
      } else {
        setThemeColors(themes['light'].colors);
      }
    },
    [darkThemePreference],
  );

  useLayoutEffect(() => {
    if (theme === 'auto') {
      const isDarkMode = window.matchMedia(
        '(prefers-color-scheme: dark)',
      ).matches;
      setAutoThemeColors(isDarkMode);
    } else {
      setThemeColors(themes[theme].colors);
    }
  }, [theme, darkThemePreference, setAutoThemeColors]);

  useEffect(() => {
    if (theme === 'auto') {
      const darkThemeMediaQuery = window.matchMedia(
        '(prefers-color-scheme: dark)',
      );

      const changeListener = (event: MediaQueryListEvent) => {
        setAutoThemeColors(event.matches);
      };

      darkThemeMediaQuery.addEventListener('change', changeListener);
      return () => {
        darkThemeMediaQuery.removeEventListener('change', changeListener);
      };
    }
  }, [setAutoThemeColors, theme]);

  if (!themeColors) return null;

  const css = Object.keys(themeColors)
    .map(key => `  --color-${key}: ${themeColors[key]};`)
    .join('\n');
  return <style>{`:root {\n${css}}`}</style>;
}

export const theme = Object.fromEntries(
  Object.keys(lightTheme).map(key => [key, `var(--color-${key})`]),
) as Record<keyof typeof lightTheme, string>;
