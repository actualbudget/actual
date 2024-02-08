// @ts-strict-ignore
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { type State } from 'loot-core/client/state-types';
import { type PrefsState } from 'loot-core/client/state-types/prefs';
import { isNonProductionEnvironment } from 'loot-core/src/shared/environment';
import type { Theme } from 'loot-core/src/types/prefs';

import * as darkTheme from './themes/dark';
import * as developmentTheme from './themes/development';
import * as lightTheme from './themes/light';

const themes = {
  light: { name: 'Light', colors: lightTheme },
  dark: { name: 'Dark', colors: darkTheme },
  auto: { name: 'System default', colors: darkTheme },
  ...(isNonProductionEnvironment() && {
    development: { name: 'Development', colors: developmentTheme },
  }),
};

export const themeOptions = Object.entries(themes).map(
  ([key, { name }]) => [key, name] as [Theme, string],
);

export function useTheme(): Theme {
  return (
    useSelector<State, PrefsState['global']['theme']>(
      state => state.prefs.global?.theme,
    ) || 'light'
  );
}

export function ThemeStyle() {
  const theme = useTheme();
  const [themeColors, setThemeColors] = useState<
    typeof lightTheme | typeof darkTheme | undefined
  >(undefined);

  useEffect(() => {
    if (theme === 'auto') {
      function darkThemeMediaQueryListener(event: MediaQueryListEvent) {
        if (event.matches) {
          setThemeColors(themes['dark'].colors);
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
        setThemeColors(themes['dark'].colors);
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
      setThemeColors(themes[theme].colors);
    }
  }, [theme]);

  if (!themeColors) return null;

  const css = Object.keys(themeColors)
    .map(key => `  --color-${key}: ${themeColors[key]};`)
    .join('\n');
  return <style>{`:root {\n${css}}`}</style>;
}

export const theme = Object.fromEntries(
  Object.keys(lightTheme).map(key => [key, `var(--color-${key})`]),
) as Record<keyof typeof lightTheme, string>;
