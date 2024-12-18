// @ts-strict-ignore
import { useEffect, useState } from 'react';

import { isNonProductionEnvironment } from 'loot-core/src/shared/environment';
import type { DarkTheme, Theme } from 'loot-core/src/types/prefs';

import { type ThemeDefinition } from '../../../plugins-shared/src';
import { useActualPlugins } from '../components/ActualPluginsProvider';
import { useGlobalPref } from '../hooks/useGlobalPref';

import * as darkTheme from './themes/dark';
import * as developmentTheme from './themes/development';
import * as lightTheme from './themes/light';
import * as midnightTheme from './themes/midnight';

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
  const [customTheme, setCustomTheme] = useGlobalPref('customTheme');
  return [theme, setThemePref, customTheme, setCustomTheme] as const;
}

export function usePreferredDarkTheme() {
  const [darkTheme = 'dark', setDarkTheme] =
    useGlobalPref('preferredDarkTheme');
  return [darkTheme, setDarkTheme] as const;
}

export function ThemeStyle() {
  const [theme, , customTheme] = useTheme();
  const [themesExtended, setThemesExtended] = useState(themes);

  const [darkThemePreference] = usePreferredDarkTheme();
  const [themeColors, setThemeColors] = useState<ThemeDefinition | undefined>(
    undefined,
  );

  const { plugins: loadedPlugins } = useActualPlugins();

  useEffect(() => {
    const customThemes =
      loadedPlugins?.reduce((acc, plugin) => {
        if (plugin.availableThemes?.length) {
          plugin.availableThemes().forEach(theme => {
            acc[theme] = {
              name: theme,
              colors: plugin.getThemeSchema(theme),
            };
          });
        }
        return acc;
      }, {}) ?? {};

    setThemesExtended({ ...themes, ...customThemes });
  }, [loadedPlugins]);

  useEffect(() => {
    if (customTheme) {
      setThemeColors(JSON.parse(customTheme).colors);
      return;
    }

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
  }, [theme, darkThemePreference, themesExtended, customTheme]);

  if (!themeColors) return null;

  const css = Object.keys(themeColors)
    .map(key => `  --color-${key}: ${themeColors[key]};`)
    .join('\n');
  return <style>{`:root {\n${css}}`}</style>;
}

export const theme = Object.fromEntries(
  Object.keys(lightTheme).map(key => [key, `var(--color-${key})`]),
) as Record<keyof typeof lightTheme, string>;
