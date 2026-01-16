import React, { useCallback, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme as themeStyle } from '@actual-app/components/theme';
import { tokens } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { type DarkTheme, type Theme } from 'loot-core/types/prefs';

import { ThemeInstaller } from './ThemeInstaller';
import { Column, Setting } from './UI';

import { useSidebar } from '@desktop-client/components/sidebar/SidebarProvider';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';
import {
  darkThemeOptions,
  themeOptions,
  usePreferredDarkTheme,
  useTheme,
} from '@desktop-client/style';
import {
  parseInstalledTheme,
  serializeInstalledTheme,
  type InstalledTheme,
} from '@desktop-client/style/customThemes';

const INSTALL_NEW_VALUE = '__install_new__';

export function ThemeSettings() {
  const { t } = useTranslation();
  const sidebar = useSidebar();
  const [theme, switchTheme] = useTheme();
  const [darkTheme, switchDarkTheme] = usePreferredDarkTheme();
  const [showInstaller, setShowInstaller] = useState(false);

  const customThemesEnabled = useFeatureFlag('customThemes');

  // Global prefs for custom themes
  const [installedThemeJson, setInstalledThemeJson] = useGlobalPref(
    'installedCustomTheme',
  );

  const installedTheme = parseInstalledTheme(installedThemeJson);

  // Build the options list
  const buildOptions = useCallback(() => {
    const options: Array<readonly [string, string] | typeof Menu.line> = [
      ...themeOptions,
    ];

    // Add custom theme options only if feature flag is enabled
    if (customThemesEnabled) {
      // Add installed custom theme if it exists
      if (installedTheme) {
        options.push([
          `custom:${installedTheme.id}`,
          installedTheme.name,
        ] as const);
      }

      // Add separator and "Custom theme" option
      options.push(Menu.line);
      options.push([INSTALL_NEW_VALUE, t('Custom theme')] as const);
    }

    return options;
  }, [installedTheme, customThemesEnabled, t]);

  // Determine current value for the select
  const getCurrentValue = useCallback(() => {
    if (customThemesEnabled && installedTheme) {
      return `custom:${installedTheme.id}`;
    }
    return theme;
  }, [customThemesEnabled, installedTheme, theme]);

  // Handle theme selection
  const handleThemeChange = useCallback(
    (value: string) => {
      if (value === INSTALL_NEW_VALUE) {
        setShowInstaller(true);
        return;
      }

      if (value.startsWith('custom:')) {
        // Custom theme is already installed and active, no action needed
        // (since there's only one theme, selecting it means it's already active)
      } else {
        // Built-in theme selected - clear the installed custom theme
        setInstalledThemeJson(serializeInstalledTheme(null));
        switchTheme(value as Theme);
      }
    },
    [setInstalledThemeJson, switchTheme],
  );

  // Handle theme installation
  const handleInstall = useCallback(
    (newTheme: InstalledTheme) => {
      setInstalledThemeJson(serializeInstalledTheme(newTheme));
    },
    [setInstalledThemeJson],
  );

  // Handle installer close
  const handleInstallerClose = useCallback(() => {
    setShowInstaller(false);
  }, []);

  return (
    <Setting
      primaryAction={
        <View
          style={{
            flexDirection: 'column',
            gap: '1em',
            width: '100%',
          }}
        >
          {!showInstaller && (
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
                  onChange={handleThemeChange}
                  value={getCurrentValue()}
                  options={buildOptions()}
                  className={css({
                    '&[data-hovered]': {
                      backgroundColor: themeStyle.buttonNormalBackgroundHover,
                    },
                  })}
                />
              </Column>
              {theme === 'auto' && !installedTheme && (
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
          )}

          {customThemesEnabled && showInstaller && (
            <ThemeInstaller
              onInstall={handleInstall}
              onClose={handleInstallerClose}
              installedTheme={installedTheme}
            />
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
