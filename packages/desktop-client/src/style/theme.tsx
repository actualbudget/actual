import { useEffect, useMemo, useState } from 'react';

import type { DarkTheme, Theme } from '@actual-app/core/types/prefs';

import { useGlobalPref } from '#hooks/useGlobalPref';

import {
  migrateLegacyOverride,
  parseInstalledTheme,
  validateThemeCss,
} from './customThemes';
import type { BaseTheme } from './customThemes';
import paletteCss from './palette.css?inline';
import darkThemeCss from './themes/dark.css?inline';
import lightThemeCss from './themes/light.css?inline';
import midnightThemeCss from './themes/midnight.css?inline';

const themes = {
  light: { name: 'Light', css: lightThemeCss },
  dark: { name: 'Dark', css: darkThemeCss },
  midnight: { name: 'Midnight', css: midnightThemeCss },
  auto: { name: 'System default', css: darkThemeCss },
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

/**
 * One-time migration: moves any legacy `overrideCss` field out of the
 * installed theme JSON blobs and into the new `customCssOverride` global pref.
 *
 * TODO: remove this after v26.6.0 is released
 */
function useMigrateLegacyOverride() {
  const [customCssOverride, setCustomCssOverride] =
    useGlobalPref('customCssOverride');
  const [installedCustomLightThemeJson, setInstalledCustomLightThemeJson] =
    useGlobalPref('installedCustomLightTheme');
  const [installedCustomDarkThemeJson, setInstalledCustomDarkThemeJson] =
    useGlobalPref('installedCustomDarkTheme');

  useEffect(() => {
    const result = migrateLegacyOverride({
      existingOverride: customCssOverride,
      lightJson: installedCustomLightThemeJson,
      darkJson: installedCustomDarkThemeJson,
    });

    if (!result) return;

    setCustomCssOverride(result.override);
    if (result.newLightJson !== installedCustomLightThemeJson) {
      setInstalledCustomLightThemeJson(result.newLightJson);
    }
    if (result.newDarkJson !== installedCustomDarkThemeJson) {
      setInstalledCustomDarkThemeJson(result.newDarkJson);
    }
    // Re-runs when prefs hydrate so migration isn't missed if the installed
    // theme JSONs arrive after the first render. migrateLegacyOverride is
    // idempotent: once customCssOverride is set (or the legacy field is
    // stripped), subsequent invocations return null.
  }, [
    customCssOverride,
    installedCustomLightThemeJson,
    installedCustomDarkThemeJson,
    setCustomCssOverride,
    setInstalledCustomLightThemeJson,
    setInstalledCustomDarkThemeJson,
  ]);
}

function getBaseThemeCss(baseTheme: BaseTheme) {
  return themes[baseTheme]?.css;
}

export function ThemeStyle() {
  const [activeTheme] = useTheme();
  const [darkThemePreference] = usePreferredDarkTheme();
  const [installedCustomLightThemeJson] = useGlobalPref(
    'installedCustomLightTheme',
  );
  const [installedCustomDarkThemeJson] = useGlobalPref(
    'installedCustomDarkTheme',
  );
  const [activeCss, setActiveCss] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (activeTheme === 'auto') {
      const installedLight = parseInstalledTheme(installedCustomLightThemeJson);
      const installedDark = parseInstalledTheme(installedCustomDarkThemeJson);

      const lightCss =
        (installedLight?.baseTheme &&
          getBaseThemeCss(installedLight.baseTheme)) ||
        themes['light'].css;
      const darkCss =
        (installedDark?.baseTheme &&
          getBaseThemeCss(installedDark.baseTheme)) ||
        themes[darkThemePreference].css;

      function darkThemeMediaQueryListener(event: MediaQueryListEvent) {
        if (event.matches) {
          setActiveCss(darkCss);
        } else {
          setActiveCss(lightCss);
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
        setActiveCss(darkCss);
      } else {
        setActiveCss(lightCss);
      }

      return () => {
        darkThemeMediaQuery.removeEventListener(
          'change',
          darkThemeMediaQueryListener,
        );
      };
    } else {
      const installedTheme = parseInstalledTheme(installedCustomLightThemeJson);
      if (installedTheme?.baseTheme) {
        setActiveCss(
          getBaseThemeCss(installedTheme.baseTheme) ??
            themes[activeTheme as ThemeKey]?.css,
        );
      } else {
        setActiveCss(themes[activeTheme as ThemeKey]?.css);
      }
    }
  }, [
    activeTheme,
    darkThemePreference,
    installedCustomLightThemeJson,
    installedCustomDarkThemeJson,
  ]);

  if (!activeCss) return null;

  return (
    <>
      <style data-theme-palette>{paletteCss}</style>
      <style data-theme-active>{activeCss}</style>
    </>
  );
}

/**
 * CustomThemeStyle injects CSS from the installed custom theme (if any).
 * This is rendered after ThemeStyle to allow custom themes to override base theme variables.
 *
 * When `theme === 'auto'`, separate custom themes can be set for light and dark modes,
 * injected via @media (prefers-color-scheme) rules. Otherwise, a single custom theme applies.
 */
export function CustomThemeStyle() {
  useMigrateLegacyOverride();
  const [activeTheme] = useTheme();
  const [installedCustomLightThemeJson] = useGlobalPref(
    'installedCustomLightTheme',
  );
  const [installedCustomDarkThemeJson] = useGlobalPref(
    'installedCustomDarkTheme',
  );
  const [customCssOverride] = useGlobalPref('customCssOverride');

  const validatedCss = useMemo(() => {
    const safeValidate = (css: string | undefined, errorLabel: string) => {
      if (!css?.trim()) return '';
      try {
        return validateThemeCss(css);
      } catch (error) {
        console.error(errorLabel, { error });
        return '';
      }
    };

    let baseCss = '';
    if (activeTheme === 'auto') {
      const lightCss = safeValidate(
        parseInstalledTheme(installedCustomLightThemeJson)?.cssContent,
        'Invalid custom light theme CSS',
      );
      if (lightCss) {
        baseCss += `@media (prefers-color-scheme: light) { ${lightCss} }\n`;
      }
      const darkCss = safeValidate(
        parseInstalledTheme(installedCustomDarkThemeJson)?.cssContent,
        'Invalid custom dark theme CSS',
      );
      if (darkCss) {
        baseCss += `@media (prefers-color-scheme: dark) { ${darkCss} }\n`;
      }
    } else {
      baseCss = safeValidate(
        parseInstalledTheme(installedCustomLightThemeJson)?.cssContent,
        'Invalid custom theme CSS',
      );
    }

    const overrideLayer = safeValidate(
      customCssOverride,
      'Invalid custom CSS override',
    );

    const combined = [baseCss, overrideLayer].filter(Boolean).join('\n');
    return combined || null;
  }, [
    activeTheme,
    installedCustomLightThemeJson,
    installedCustomDarkThemeJson,
    customCssOverride,
  ]);

  if (!validatedCss) {
    return null;
  }

  return <style id="custom-theme-active">{validatedCss}</style>;
}
