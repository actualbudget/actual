import React, { type ReactNode, useState, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme as themeStyle } from '@actual-app/components/theme';
import { tokens } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { type DarkTheme, type Theme } from 'loot-core/types/prefs';

import { Column, Setting } from './UI';

import { useSidebar } from '@desktop-client/components/sidebar/SidebarProvider';
import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';
import { useActualPlugins } from '@desktop-client/plugin/ActualPluginsProvider';
import {
  getThemeOptions,
  useTheme,
  usePreferredDarkTheme,
  darkThemeOptions,
} from '@desktop-client/style';

export function ThemeSettings() {
  const { t } = useTranslation();
  const sidebar = useSidebar();
  const [theme, switchTheme] = useTheme();
  const [darkTheme, switchDarkTheme] = usePreferredDarkTheme();

  // Get saved plugin themes
  const [savedPluginThemes] = useGlobalPref('pluginThemes');

  // Get theme options including plugin themes
  const [themeOptions, setThemeOptions] = useState(() =>
    getThemeOptions(undefined, savedPluginThemes),
  );

  // Get plugin context for dynamic updates - gracefully handles case when context is not available
  const plugins = useActualPlugins();

  // Update theme options when plugins change or saved themes change
  useEffect(() => {
    if (plugins.plugins.length > 0 || plugins.pluginThemes.size > 0) {
      // Plugins are loaded, use their theme functions
      const options = getThemeOptions(
        plugins.getPluginThemes,
        savedPluginThemes,
      );
      setThemeOptions(options);
    } else {
      // No plugins loaded, use saved themes only
      const options = getThemeOptions(undefined, savedPluginThemes);
      setThemeOptions(options);
    }
  }, [
    plugins.plugins,
    plugins.pluginThemes,
    plugins.themeOverrides,
    plugins.getPluginThemes,
    savedPluginThemes,
  ]);

  return (
    <Setting
      primaryAction={
        <View
          style={{
            flexDirection: 'column',
            gap: '1em',
            width: '100%',
            [`@media (min-width: ${
              sidebar.floating
                ? tokens.breakpoint_small
                : tokens.breakpoint_medium
            })`]: {
              flexDirection: 'row',
            },
          }}
        >
          <Column title={t('Theme')}>
            <Select<Theme>
              onChange={value => {
                switchTheme(value);
              }}
              value={theme}
              options={themeOptions}
              className={css({
                '&[data-hovered]': {
                  backgroundColor: themeStyle.buttonNormalBackgroundHover,
                },
              })}
            />
          </Column>
          {theme === 'auto' && (
            <Column title={t('Dark theme')}>
              <Select<DarkTheme>
                onChange={value => {
                  switchDarkTheme(value);
                }}
                value={darkTheme}
                options={darkThemeOptions}
                className={css({
                  '&[data-hovered]': {
                    backgroundColor: themeStyle.buttonNormalBackgroundHover,
                  },
                })}
              />
            </Column>
          )}
        </View>
      }
    >
      <Text>
        <Trans>
          <strong>Themes</strong> change the user interface colors.
        </Trans>
      </Text>
    </Setting>
  );
}
