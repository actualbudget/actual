import React, { type ReactNode, useState, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme as themeStyle } from '@actual-app/components/theme';
import { tokens } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { type DarkTheme, type Theme } from 'loot-core/types/prefs';

import {
  getThemeOptions,
  useTheme,
  usePreferredDarkTheme,
  darkThemeOptions,
} from '../../style';
import { useSidebar } from '../sidebar/SidebarProvider';
import { useActualPlugins } from '../../plugin/ActualPluginsProvider';
import { useGlobalPref } from '../../hooks/useGlobalPref';

import { Setting } from './UI';

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View
      style={{
        alignItems: 'flex-start',
        flexGrow: 1,
        gap: '0.5em',
        width: '100%',
      }}
    >
      <Text style={{ fontWeight: 500 }}>{title}</Text>
      <View style={{ alignItems: 'flex-start', gap: '1em' }}>{children}</View>
    </View>
  );
}

export function ThemeSettings() {
  const { t } = useTranslation();
  const sidebar = useSidebar();
  const [theme, switchTheme] = useTheme();
  const [darkTheme, switchDarkTheme] = usePreferredDarkTheme();
  
  // Get saved plugin themes
  const [savedPluginThemes] = useGlobalPref('pluginThemes');
  
  // Get theme options including plugin themes
  const [themeOptions, setThemeOptions] = useState(() => getThemeOptions(undefined, savedPluginThemes));
  
  // Try to get plugin context for dynamic updates
  let plugins;
  try {
    plugins = useActualPlugins();
  } catch {
    plugins = null;
  }
  
  // Update theme options when plugins change or saved themes change
  useEffect(() => {
    if (plugins) {
      const options = getThemeOptions(plugins.getPluginThemes, savedPluginThemes);
      setThemeOptions(options);
    } else {
      // No plugins loaded, use saved themes only
      const options = getThemeOptions(undefined, savedPluginThemes);
      setThemeOptions(options);
    }
  }, [plugins?.pluginThemes, plugins?.themeOverrides, savedPluginThemes]);

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
            <Select<string>
              onChange={value => {
                switchTheme(value as Theme);
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
