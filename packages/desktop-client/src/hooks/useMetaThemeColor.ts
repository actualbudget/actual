import { useEffect } from 'react';

import { usePreferredDarkTheme, useTheme } from '@desktop-client/style/theme';

const VAR_STRING_REGEX = /^var\((--.*)\)$/;
const DEFAULT_THEME_COLOR = '#5c3dbb';

/**
 * Sets the theme-color meta tag (for browsers that use it) and document.body
 * background-color (for Safari 26+, which derives status bar tint from body).
 * Re-runs when theme changes so the status bar follows the app theme.
 */
export function useMetaThemeColor(color?: string) {
  const [activeTheme] = useTheme();
  const [darkThemePreference] = usePreferredDarkTheme();

  useEffect(() => {
    if (!color) return;

    const resolved =
      getPropertyValueFromVarString(color) || DEFAULT_THEME_COLOR;

    ensureThemeColorMetaTag();
    setThemeColorMetaContent(resolved);
    document.body.style.backgroundColor = resolved;
  }, [color, activeTheme, darkThemePreference]);
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
