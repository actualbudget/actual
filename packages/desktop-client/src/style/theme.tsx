import { useEffect, useMemo, useState } from 'react';

import type { DarkTheme, Theme } from '@actual-app/core/types/prefs';

import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useGlobalPref } from '#hooks/useGlobalPref';

import {
  parseInstalledTheme,
  validateAndCombineThemeCss,
} from './customThemes';
import type { BaseTheme } from './customThemes';
import * as darkTheme from './themes/dark';
import * as lightTheme from './themes/light';
import * as midnightTheme from './themes/midnight';

const themes = {
  light: { name: 'Light', colors: lightTheme },
  dark: { name: 'Dark', colors: darkTheme },
  midnight: { name: 'Midnight', colors: midnightTheme },
  auto: { name: 'System default', colors: darkTheme },
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

function getBaseThemeColors(baseTheme: BaseTheme) {
  return themes[baseTheme]?.colors;
}

export function ThemeStyle() {
  const [activeTheme] = useTheme();
  const [darkThemePreference] = usePreferredDarkTheme();
  const customThemesEnabled = useFeatureFlag('customThemes');
  const [installedCustomLightThemeJson] = useGlobalPref(
    'installedCustomLightTheme',
  );
  const [installedCustomDarkThemeJson] = useGlobalPref(
    'installedCustomDarkTheme',
  );
  const [themeColors, setThemeColors] = useState<
    typeof lightTheme | typeof darkTheme | typeof midnightTheme | undefined
  >(undefined);

  useEffect(() => {
    if (activeTheme === 'auto') {
      const installedLight = customThemesEnabled
        ? parseInstalledTheme(installedCustomLightThemeJson)
        : null;
      const installedDark = customThemesEnabled
        ? parseInstalledTheme(installedCustomDarkThemeJson)
        : null;

      const lightColors =
        (installedLight?.baseTheme &&
          getBaseThemeColors(installedLight.baseTheme)) ||
        themes['light'].colors;
      const darkColors =
        (installedDark?.baseTheme &&
          getBaseThemeColors(installedDark.baseTheme)) ||
        themes[darkThemePreference].colors;

      function darkThemeMediaQueryListener(event: MediaQueryListEvent) {
        if (event.matches) {
          setThemeColors(darkColors);
        } else {
          setThemeColors(lightColors);
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
        setThemeColors(darkColors);
      } else {
        setThemeColors(lightColors);
      }

      return () => {
        darkThemeMediaQuery.removeEventListener(
          'change',
          darkThemeMediaQueryListener,
        );
      };
    } else {
      const installedTheme = customThemesEnabled
        ? parseInstalledTheme(installedCustomLightThemeJson)
        : null;
      if (installedTheme?.baseTheme) {
        setThemeColors(
          getBaseThemeColors(installedTheme.baseTheme) ??
            themes[activeTheme as ThemeKey]?.colors,
        );
      } else {
        setThemeColors(themes[activeTheme as ThemeKey]?.colors);
      }
    }
  }, [
    activeTheme,
    darkThemePreference,
    customThemesEnabled,
    installedCustomLightThemeJson,
    installedCustomDarkThemeJson,
  ]);

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

      try {
        const lightCss = validateAndCombineThemeCss(
          lightTheme?.cssContent,
          lightTheme?.overrideCss,
        );
        if (lightCss) {
          css += `@media (prefers-color-scheme: light) { ${lightCss} }\n`;
        }
      } catch (error) {
        console.error('Invalid custom light theme CSS', { error });
      }

      try {
        const darkCss = validateAndCombineThemeCss(
          darkTheme?.cssContent,
          darkTheme?.overrideCss,
        );
        if (darkCss) {
          css += `@media (prefers-color-scheme: dark) { ${darkCss} }\n`;
        }
      } catch (error) {
        console.error('Invalid custom dark theme CSS', { error });
      }

      return css || null;
    }

    const installedTheme = parseInstalledTheme(installedCustomLightThemeJson);

    try {
      return (
        validateAndCombineThemeCss(
          installedTheme?.cssContent,
          installedTheme?.overrideCss,
        ) || null
      );
    } catch (error) {
      console.error('Invalid custom theme CSS', { error });
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
