import { useEffect, useMemo, useState } from 'react';

import { isNonProductionEnvironment } from 'loot-core/shared/environment';
import type { DarkTheme, Theme } from 'loot-core/types/prefs';

import { parseInstalledTheme, validateThemeCss } from './customThemes';
import * as darkTheme from './themes/dark';
import * as developmentTheme from './themes/development';
import * as lightTheme from './themes/light';
import * as midnightTheme from './themes/midnight';

import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';

const themes = {
  light: { name: 'Light', colors: lightTheme },
  dark: { name: 'Dark', colors: darkTheme },
  midnight: { name: 'Midnight', colors: midnightTheme },
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
  const [activeTheme] = useTheme();
  const [darkThemePreference] = usePreferredDarkTheme();
  const [themeColors, setThemeColors] = useState<
    | typeof lightTheme
    | typeof darkTheme
    | typeof midnightTheme
    | typeof developmentTheme
    | undefined
  >(undefined);

  useEffect(() => {
    if (activeTheme === 'auto') {
      const darkTheme = themes[darkThemePreference];

      function darkThemeMediaQueryListener(event: MediaQueryListEvent) {
        if (event.matches) {
          setThemeColors(darkTheme.colors);
        } else {
          setThemeColors(themes['light'].colors);
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
        setThemeColors(themes['light'].colors);
      }

      return () => {
        darkThemeMediaQuery.removeEventListener(
          'change',
          darkThemeMediaQueryListener,
        );
      };
    } else {
      setThemeColors(themes[activeTheme as ThemeKey]?.colors);
    }
  }, [activeTheme, darkThemePreference]);

  if (!themeColors) return null;

  const css = Object.entries(themeColors)
    .map(([key, value]) => `  --color-${key}: ${value};`)
    .join('\n');
  return <style>{`:root {\n${css}}`}</style>;
}

/**
 * CustomThemeStyle injects CSS from the installed custom theme (if any).
 * This is rendered after ThemeStyle to allow custom themes to override base theme variables.
 *
 * When `theme === 'auto'`, separate custom themes can be set for light and dark modes,
 * injected via @media (prefers-color-scheme) rules. Otherwise, a single custom theme applies.
 */
export function CustomThemeStyle() {
  const customThemesEnabled = useFeatureFlag('customThemes');
  const [activeTheme] = useTheme();
  const [installedCustomLightThemeJson] = useGlobalPref(
    'installedCustomLightTheme',
  );
  const [installedCustomDarkThemeJson] = useGlobalPref(
    'installedCustomDarkTheme',
  );

  const validatedCss = useMemo(() => {
    if (!customThemesEnabled) return null;

    if (activeTheme === 'auto') {
      const lightTheme = parseInstalledTheme(installedCustomLightThemeJson);
      const darkTheme = parseInstalledTheme(installedCustomDarkThemeJson);

      let css = '';

      if (lightTheme?.cssContent) {
        try {
          const validated = validateThemeCss(lightTheme.cssContent);
          css += `@media (prefers-color-scheme: light) { ${validated} }\n`;
        } catch (error) {
          console.error('Invalid custom light theme CSS', { error });
        }
      }

      if (darkTheme?.cssContent) {
        try {
          const validated = validateThemeCss(darkTheme.cssContent);
          css += `@media (prefers-color-scheme: dark) { ${validated} }\n`;
        } catch (error) {
          console.error('Invalid custom dark theme CSS', { error });
        }
      }

      return css || null;
    }

    const installedTheme = parseInstalledTheme(installedCustomLightThemeJson);
    const { cssContent } = installedTheme ?? {};

    if (!cssContent) return null;

    try {
      return validateThemeCss(cssContent);
    } catch (error) {
      console.error('Invalid custom theme CSS', { error, cssContent });
      return null;
    }
  }, [
    customThemesEnabled,
    activeTheme,
    installedCustomLightThemeJson,
    installedCustomDarkThemeJson,
  ]);

  if (!validatedCss) {
    return null;
  }

  return <style id="custom-theme-active">{validatedCss}</style>;
}
