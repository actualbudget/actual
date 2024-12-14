// @ts-strict-ignore
import { useEffect, useState } from 'react';

import { isNonProductionEnvironment } from 'loot-core/src/shared/environment';
import type { DarkTheme, Theme } from 'loot-core/src/types/prefs';

import { useGlobalPref } from '../hooks/useGlobalPref';

import { theme as darkTheme } from './themes/dark';
import { theme as developmentTheme } from './themes/development';
import { theme as lightTheme } from './themes/light';
import { theme as midnightTheme } from './themes/midnight';
import { ThemeDefinition } from 'plugins-shared';
import { loadedPlugins } from '../pluginLoader';

export const themes = {
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
  const [themesExtended, setThemesExtended] = useState(themes);

  const [darkThemePreference] = usePreferredDarkTheme();
  const [themeColors, setThemeColors] = useState<
    | ThemeDefinition
    | undefined
  >(undefined);

  useEffect(() => {
    const themesLight = loadedPlugins?.reduce((acc, plugin) => {
      if (plugin.availableThemes?.length) {
        plugin.availableThemes(false).forEach(theme => {
          acc[theme] = { name: theme, colors: plugin.getThemeSchema(theme, false)};
        });
      }
      return acc;
    }, {}) ?? {};

    const themesDark = loadedPlugins?.reduce((acc, plugin) => {
      if (plugin.availableThemes?.length) {
        plugin.availableThemes(true).forEach(theme => {
          acc[theme] = { name: theme, colors: plugin.getThemeSchema(theme, true)};
        });
      }
      return acc;
    }, {}) ?? {};

    setThemesExtended({...themes, ...themesLight, ...themesDark})
  }, [loadedPlugins]);

  useEffect(() => {
    if (theme === 'auto') {
      const darkTheme = themesExtended[darkThemePreference];

      function darkThemeMediaQueryListener(event: MediaQueryListEvent) {
        if (event.matches) {
          setThemeColors(darkTheme.colors);
        } else {
          setThemeColors(themesExtended['light'].colors);
        }
      }
      const darkThemeMediaQuery = window.matchMedia(
        '(prefers-color-scheme: dark)',
      );

      darkThemeMediaQuery.addEventListener(
        'change',
        darkThemeMediaQueryListener,
      );

      if (darkThemeMediaQuery.matches) {
        setThemeColors(darkTheme.colors);
      } else {
        setThemeColors(themesExtended['light'].colors);
      }

      return () => {
        darkThemeMediaQuery.removeEventListener(
          'change',
          darkThemeMediaQueryListener,
        );
      };
    } else {
      setThemeColors(themesExtended[theme].colors);
    }
  }, [theme, darkThemePreference, themesExtended]);

  if (!themeColors) return null;

  const css = Object.keys(themeColors)
    .map(key => `  --color-${key}: ${themeColors[key]};`)
    .join('\n');
  return <style>{`:root {\n${css}}`}</style>;
}

export const theme = Object.fromEntries(
  Object.keys(lightTheme).map(key => [key, `var(--color-${key})`]),
) as Record<keyof typeof lightTheme, string>;
