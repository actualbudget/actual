import { useEffect, useState } from 'react';

import { isNonProductionEnvironment } from 'loot-core/shared/environment';
import type { DarkTheme, Theme } from 'loot-core/types/prefs';

import { useGlobalPref } from '../hooks/useGlobalPref';
import { useActualPlugins } from '../plugin/ActualPluginsProvider';

import * as darkTheme from './themes/dark';
import * as developmentTheme from './themes/development';
import * as lightTheme from './themes/light';
import * as midnightTheme from './themes/midnight';

const builtInThemes = {
  light: { name: 'Light', colors: lightTheme },
  dark: { name: 'Dark', colors: darkTheme },
  midnight: { name: 'Midnight', colors: midnightTheme },
  auto: { name: 'System default', colors: darkTheme },
  ...(isNonProductionEnvironment() && {
    development: { name: 'Development', colors: developmentTheme },
  }),
};

// Enhanced theme options that include plugin themes
export function getThemeOptions(
  getPluginThemesFn?: () => Array<{ value: string; label: string }>,
  savedPluginThemes?: Record<string, {
    id: string;
    displayName: string;
    description?: string;
    baseTheme?: 'light' | 'dark' | 'midnight';
    colors: Record<string, string>;
  }>
): [string, string][] {
  const builtInOptions = Object.entries(builtInThemes).map(
    ([key, { name }]) => [key, name] as [string, string],
  );
  
  const pluginOptions = getPluginThemesFn ? getPluginThemesFn().map(
    ({ value, label }) => [value, label] as [string, string]
  ) : [];
  
  // Add saved plugin themes that aren't already in the plugin options (using display names)
  const savedPluginOptions = savedPluginThemes ? Object.values(savedPluginThemes)
    .filter(theme => !pluginOptions.some(([value]) => value === theme.id))
    .map(theme => [theme.id, theme.displayName] as [string, string])
    : [];
  
  return [...builtInOptions, ...pluginOptions, ...savedPluginOptions];
}

export const themeOptions = getThemeOptions();

export const darkThemeOptions = Object.entries({
  dark: builtInThemes.dark,
  midnight: builtInThemes.midnight,
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

function ThemeStyleWithPlugins() {
  const [activeTheme] = useTheme();
  const [darkThemePreference] = usePreferredDarkTheme();
  const [themeColors, setThemeColors] = useState<Record<string, string> | undefined>(undefined);
  
  const plugins = useActualPlugins();
  const { getThemeColors, pluginThemes, themeOverrides } = plugins;
  
  // Get saved plugin themes from global preferences as fallback
  const [savedPluginThemes] = useGlobalPref('pluginThemes');

  useEffect(() => {
    let baseColors: Record<string, string>;
    
    if (activeTheme === 'auto') {
      const darkTheme = builtInThemes[darkThemePreference as keyof typeof builtInThemes] || builtInThemes.dark;

      function darkThemeMediaQueryListener(event: MediaQueryListEvent) {
        if (event.matches) {
          baseColors = darkTheme.colors;
        } else {
          baseColors = builtInThemes['light'].colors;
        }
        setThemeColors(getThemeColors(activeTheme, baseColors));
      }
      
      const darkThemeMediaQuery = window.matchMedia(
        '(prefers-color-scheme: dark)',
      );

      darkThemeMediaQuery.addEventListener(
        'change',
        darkThemeMediaQueryListener,
      );

      if (darkThemeMediaQuery.matches) {
        baseColors = darkTheme.colors;
      } else {
        baseColors = builtInThemes['light'].colors;
      }
      
      setThemeColors(getThemeColors(activeTheme, baseColors));

      return () => {
        darkThemeMediaQuery.removeEventListener(
          'change',
          darkThemeMediaQueryListener,
        );
      };
    } else {
      // Check if this is a built-in theme
      const isBuiltInTheme = activeTheme in builtInThemes;
      
      if (isBuiltInTheme) {
        baseColors = builtInThemes[activeTheme as keyof typeof builtInThemes]?.colors || {};
        setThemeColors(getThemeColors(activeTheme, baseColors));
      } else {
        // This is a plugin theme - first try to use saved colors
        const savedTheme = savedPluginThemes?.[activeTheme];
        
        if (savedTheme) {
          // Apply saved colors immediately
          const savedBaseTheme = savedTheme.baseTheme || 'light';
          const baseThemeColors = builtInThemes[savedBaseTheme as keyof typeof builtInThemes]?.colors || builtInThemes.light.colors;
          baseColors = { ...baseThemeColors, ...savedTheme.colors };
          setThemeColors(baseColors);
        } else {
          // No saved colors, fallback to light theme
          baseColors = builtInThemes.light.colors;
          setThemeColors(baseColors);
        }
      }
    }
  }, [activeTheme, darkThemePreference, getThemeColors, pluginThemes, savedPluginThemes]);

  // Listen for plugin theme changes - only override if plugin theme is actually loaded
  useEffect(() => {
    const isBuiltInTheme = activeTheme in builtInThemes;
    const hasLoadedPluginTheme = pluginThemes.get(activeTheme);
    
    // Only use getThemeColors if it's a built-in theme or if the plugin theme is actually loaded
    if (isBuiltInTheme || hasLoadedPluginTheme) {
      const baseColors = builtInThemes[activeTheme as keyof typeof builtInThemes]?.colors || {};
      setThemeColors(getThemeColors(activeTheme, baseColors));
    }
    // For plugin themes that aren't loaded yet, we keep using the saved colors from the first useEffect
  }, [pluginThemes, themeOverrides, activeTheme, getThemeColors]);

  if (!themeColors) return null;

  const css = Object.entries(themeColors)
    .map(([key, value]) => `  --color-${key}: ${value};`)
    .join('\n');
  return <style>{`:root {\n${css}}`}</style>;
}

function ThemeStyleWithoutPlugins() {
  const [activeTheme] = useTheme();
  const [darkThemePreference] = usePreferredDarkTheme();
  const [themeColors, setThemeColors] = useState<Record<string, string> | undefined>(undefined);
  
  // Get saved plugin themes from global preferences
  const [savedPluginThemes] = useGlobalPref('pluginThemes');

  useEffect(() => {
    let baseColors: Record<string, string>;
    
    if (activeTheme === 'auto') {
      const darkTheme = builtInThemes[darkThemePreference as keyof typeof builtInThemes] || builtInThemes.dark;

      function darkThemeMediaQueryListener(event: MediaQueryListEvent) {
        if (event.matches) {
          baseColors = darkTheme.colors;
        } else {
          baseColors = builtInThemes['light'].colors;
        }
        setThemeColors(baseColors);
      }
      
      const darkThemeMediaQuery = window.matchMedia(
        '(prefers-color-scheme: dark)',
      );

      darkThemeMediaQuery.addEventListener(
        'change',
        darkThemeMediaQueryListener,
      );

      if (darkThemeMediaQuery.matches) {
        baseColors = darkTheme.colors;
      } else {
        baseColors = builtInThemes['light'].colors;
      }
      
      setThemeColors(baseColors);

      return () => {
        darkThemeMediaQuery.removeEventListener(
          'change',
          darkThemeMediaQueryListener,
        );
      };
    } else {
      // Check if this is a plugin theme (not a built-in theme)
      const isBuiltInTheme = activeTheme in builtInThemes;
      
      if (isBuiltInTheme) {
        baseColors = builtInThemes[activeTheme as keyof typeof builtInThemes]?.colors || {};
        setThemeColors(baseColors);
      } else {
        // This is a plugin theme - check if we have saved theme data
        const savedTheme = savedPluginThemes?.[activeTheme];
        if (savedTheme) {
          // Use saved theme with proper base theme
          const savedBaseTheme = savedTheme.baseTheme || 'light';
          const baseThemeColors = builtInThemes[savedBaseTheme as keyof typeof builtInThemes]?.colors || builtInThemes.light.colors;
          baseColors = { ...baseThemeColors, ...savedTheme.colors };
          setThemeColors(baseColors);
        } else {
          // Fallback to light theme if no saved theme data
          baseColors = builtInThemes.light.colors;
          setThemeColors(baseColors);
        }
      }
    }
  }, [activeTheme, darkThemePreference, savedPluginThemes]);

  if (!themeColors) return null;

  const css = Object.entries(themeColors)
    .map(([key, value]) => `  --color-${key}: ${value};`)
    .join('\n');
  return <style>{`:root {\n${css}}`}</style>;
}

export function ThemeStyle() {
  // Check if we can access plugin context
  let hasPluginContext = false;
  try {
    useActualPlugins();
    hasPluginContext = true;
  } catch {
    hasPluginContext = false;
  }

  // Use the appropriate component based on plugin context availability
  if (hasPluginContext) {
    return <ThemeStyleWithPlugins />;
  } else {
    return <ThemeStyleWithoutPlugins />;
  }
}
