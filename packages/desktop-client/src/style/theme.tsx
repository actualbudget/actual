import { useEffect, useState } from 'react';

import { isNonProductionEnvironment } from 'loot-core/shared/environment';
import type { DarkTheme, Theme } from 'loot-core/types/prefs';

import {
  type AccentColor,
  generateAccentOverrides,
} from './accentColors';
import * as darkTheme from './themes/dark';
import * as developmentTheme from './themes/development';
import * as lightTheme from './themes/light';
import * as midnightTheme from './themes/midnight';
import * as nordicTheme from './themes/nordic';

import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';

const themes = {
  light: { name: 'Light', colors: lightTheme },
  dark: { name: 'Dark', colors: darkTheme },
  midnight: { name: 'Midnight', colors: midnightTheme },
  nordic: { name: 'Nordic Noir', colors: nordicTheme },
  auto: { name: 'System default', colors: darkTheme },
  ...(isNonProductionEnvironment() && {
    development: { name: 'Development', colors: developmentTheme },
  }),
} as const;

type ThemeKey = keyof typeof themes;

export const themeOptions = Object.entries(themes).map(
  ([key, { name }]) => [key, name] as [Theme, string],
);

export const darkThemeOptions = Object.entries({
  dark: themes.dark,
  midnight: themes.midnight,
  nordic: themes.nordic,
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

export function useAccentColor() {
  const [accentColor = 'purple', setAccentColor] =
    useGlobalPref('accentColor');
  return [accentColor as AccentColor, setAccentColor] as const;
}

export function ThemeStyle() {
  const [activeTheme] = useTheme();
  const [darkThemePreference] = usePreferredDarkTheme();
  const [accentColor] = useAccentColor();
  const [themeColors, setThemeColors] = useState<
    | typeof lightTheme
    | typeof darkTheme
    | typeof midnightTheme
    | typeof developmentTheme
    | typeof nordicTheme
    | undefined
  >(undefined);
  const [isDark, setIsDark] = useState(true);
  const [currentThemeName, setCurrentThemeName] = useState<string>('dark');

  useEffect(() => {
    if (activeTheme === 'auto') {
      const preferredDark = themes[darkThemePreference];

      function darkThemeMediaQueryListener(event: MediaQueryListEvent) {
        if (event.matches) {
          setThemeColors(preferredDark.colors);
          setIsDark(true);
          setCurrentThemeName(darkThemePreference);
        } else {
          setThemeColors(themes['light'].colors);
          setIsDark(false);
          setCurrentThemeName('light');
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
        setThemeColors(preferredDark.colors);
        setIsDark(true);
        setCurrentThemeName(darkThemePreference);
      } else {
        setThemeColors(themes['light'].colors);
        setIsDark(false);
        setCurrentThemeName('light');
      }

      return () => {
        darkThemeMediaQuery.removeEventListener(
          'change',
          darkThemeMediaQueryListener,
        );
      };
    } else {
      setThemeColors(themes[activeTheme as ThemeKey]?.colors);
      setIsDark(activeTheme !== 'light');
      setCurrentThemeName(activeTheme);
    }
  }, [activeTheme, darkThemePreference]);

  // Set data-theme attribute on document element for CSS targeting
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentThemeName);
  }, [currentThemeName]);

  if (!themeColors) return null;

  // Generate accent color overrides
  const accentOverrides = generateAccentOverrides(accentColor, isDark);

  // Merge theme colors with accent overrides
  const mergedColors = { ...themeColors, ...accentOverrides };

  const css = Object.entries(mergedColors)
    .map(([key, value]) => `  --color-${key}: ${value};`)
    .join('\n');
  return <style>{`:root {\n${css}}`}</style>;
}
