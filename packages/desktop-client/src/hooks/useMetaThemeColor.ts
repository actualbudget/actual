// @ts-strict-ignore
import { useEffect } from 'react';

import {
  usePreferredDarkTheme,
  useTheme,
} from '@desktop-client/style/theme';

const DEFAULT_THEME_COLOR = '#5c3dbb';

export type ThemeColorKey =
  | 'mobileViewTheme'
  | 'mobileConfigServerViewTheme'
  | 'pageBackground';

/**
 * Sets the theme-color meta tag (for browsers that use it) and document.body
 * background-color (for Safari 26+, which derives status bar tint from body).
 * Re-runs when theme or colorKey changes so the status bar follows the app theme.
 */
export function useMetaThemeColor(colorKey?: ThemeColorKey) {
  const [activeTheme] = useTheme();
  const [darkThemePreference] = usePreferredDarkTheme();

  useEffect(() => {
    if (!colorKey) return;

    const resolved =
      document.documentElement &&
      window
        .getComputedStyle(document.documentElement)
        .getPropertyValue(`--color-${colorKey}`)
        .trim();
    const color = resolved || DEFAULT_THEME_COLOR;

    ensureThemeColorMetaTag();
    setThemeColorMetaContent(color);
    document.body.style.backgroundColor = color;
  }, [colorKey, activeTheme, darkThemePreference]);
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
