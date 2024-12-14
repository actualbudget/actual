import React, { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { css } from '@emotion/css';

import { type DarkTheme, type Theme } from 'loot-core/types/prefs';

import {
  themeOptions,
  useTheme,
  theme as themeStyle,
  usePreferredDarkTheme,
  darkThemeOptions,
  themes,
} from '../../style';
import { tokens } from '../../tokens';
import { Select } from '../common/Select';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { useSidebar } from '../sidebar/SidebarProvider';

import { Setting } from './UI';
import { loadedPlugins } from '../../pluginLoader';

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
  const [themesExtended, setThemesExtended] = useState(themes);
  const [themeOptionsExtended, setThemeOptionsExtended] = useState(themeOptions);

  useEffect(() => {
    const themesLight = loadedPlugins?.reduce((acc, plugin) => {
      if (plugin.availableThemes?.length) {
        plugin.availableThemes(false).forEach(theme => {
          acc[theme] = { name: theme, colors: plugin.getThemeSchema(theme, false)};
        });
      }
      return acc;
    }, {}) ?? {};

    const themesDark = loadedPlugins?.reduce((acc, plugin) => {
      if (plugin.availableThemes?.length) {
        plugin.availableThemes(true).forEach(theme => {
          acc[theme] = { name: theme, colors: plugin.getThemeSchema(theme, true)};
        });
      }
      return acc;
    }, {}) ?? {};

    setThemesExtended({...themes, ...themesLight, ...themesDark})
  }, [loadedPlugins]);

  useEffect(() => {
    setThemeOptionsExtended(Object.entries(themesExtended).map(
      ([key, { name }]) => [key, name] as [Theme, string],
    ));
  }, [themesExtended]);

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
          <Column title="Theme">
            <Select<Theme>
              onChange={value => {
                switchTheme(value);
              }}
              value={theme}
              options={themeOptionsExtended}
              className={css({
                '&[data-hovered]': {
                  backgroundColor: themeStyle.buttonNormalBackgroundHover,
                },
              })}
            />
          </Column>
          {theme === 'auto' && (
            <Column title="Dark theme">
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
        <strong>{t('Themes')}</strong>
        {t(' change the user interface colors.')}
      </Text>
    </Setting>
  );
}
