import { useEffect, useState } from 'react';

import { useGlobalPref } from '#hooks/useGlobalPref';
import { usePreferredDarkTheme, useTheme } from '#style/theme';

const VAR_STRING_REGEX = /^var\((--.*)\)$/;
const DEFAULT_THEME_COLOR = '#5c3dbb';

/**
 * Sets the theme-color meta tag (for browsers that use it) and document.body
 * background-color (for Safari 26+, which derives status bar tint from body).
 * Re-runs when built-in/custom themes, CSS overrides, or the system color
 * scheme change so the status bar follows the app theme.
 */
export function useMetaThemeColor(color?: string) {
  const [activeTheme] = useTheme();
  const [darkThemePreference] = usePreferredDarkTheme();
  const [installedCustomLightTheme] = useGlobalPref(
    'installedCustomLightTheme',
  );
  const [installedCustomDarkTheme] = useGlobalPref('installedCustomDarkTheme');
  const [customCssOverride] = useGlobalPref('customCssOverride');
  const systemColorScheme = useSystemColorScheme();

  useEffect(() => {
    if (!color) return;

    const resolved =
      getPropertyValueFromVarString(color) || DEFAULT_THEME_COLOR;

    ensureThemeColorMetaTag();
    setThemeColorMetaContent(resolved);
    document.body.style.backgroundColor = resolved;
  }, [
    color,
    activeTheme,
    darkThemePreference,
    installedCustomLightTheme,
    installedCustomDarkTheme,
    customCssOverride,
    systemColorScheme,
  ]);
}

function useSystemColorScheme() {
  const [systemColorScheme, setSystemColorScheme] = useState(() =>
    getSystemColorScheme(),
  );

  useEffect(() => {
    if (!window.matchMedia) return;

    const darkThemeMediaQuery = window.matchMedia(
      '(prefers-color-scheme: dark)',
    );
    const handleColorSchemeChange = () => {
      setSystemColorScheme(darkThemeMediaQuery.matches ? 'dark' : 'light');
    };

    darkThemeMediaQuery.addEventListener('change', handleColorSchemeChange);
    handleColorSchemeChange();

    return () => {
      darkThemeMediaQuery.removeEventListener(
        'change',
        handleColorSchemeChange,
      );
    };
  }, []);

  return systemColorScheme;
}

function getSystemColorScheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function ensureThemeColorMetaTag() {
  const metaTags = document.getElementsByTagName('meta');
  const existing = [...metaTags].find(tag => tag.name === 'theme-color');
  if (!existing) {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.setAttribute('content', DEFAULT_THEME_COLOR);
    document.head.appendChild(meta);
  }
}

function setThemeColorMetaContent(color: string) {
  const metaTags = document.getElementsByTagName('meta');
  const themeTag = [...metaTags].find(tag => tag.name === 'theme-color');
  if (themeTag) {
    themeTag.setAttribute('content', color);
  }
}

function getPropertyValueFromVarString(varString: string) {
  if (!VAR_STRING_REGEX.test(varString)) return varString;
  const match = varString.match(VAR_STRING_REGEX);
  return match
    ? window
        .getComputedStyle(document.documentElement)
        .getPropertyValue(match[1])
        .trim()
    : varString;
}
