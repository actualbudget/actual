import React, { useCallback, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCode } from '@actual-app/components/icons/v1';
import { Menu } from '@actual-app/components/menu';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme as themeStyle } from '@actual-app/components/theme';
import { tokens } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import type { DarkTheme, Theme } from '@actual-app/core/types/prefs';
import { css } from '@emotion/css';

import { useSidebar } from '#components/sidebar/SidebarProvider';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useGlobalPref } from '#hooks/useGlobalPref';
import {
  darkThemeOptions,
  themeOptions,
  usePreferredDarkTheme,
  useTheme,
} from '#style';
import {
  parseInstalledTheme,
  serializeInstalledTheme,
} from '#style/customThemes';
import type { InstalledTheme } from '#style/customThemes';

import { ThemeInstaller } from './ThemeInstaller';
import { Column, Setting } from './UI';

const INSTALL_NEW_VALUE = '__install_new__';
const INSTALL_CUSTOM_LIGHT = '__install_custom_light__';
const INSTALL_CUSTOM_DARK = '__install_custom_dark__';

type InstallerState = {
  slot: 'light' | 'dark';
  catalogMode?: 'light' | 'dark';
} | null;

export function ThemeSettings() {
  const { t } = useTranslation();
  const sidebar = useSidebar();
  const [theme, switchTheme] = useTheme();
  const [darkTheme, switchDarkTheme] = usePreferredDarkTheme();
  const [showInstaller, setShowInstaller] = useState<InstallerState>(null);

  const customThemesEnabled = useFeatureFlag('customThemes');

  // Global prefs for custom themes
  const [installedLightThemeJson, setInstalledLightThemeJson] = useGlobalPref(
    'installedCustomLightTheme',
  );
  const [installedDarkThemeJson, setInstalledDarkThemeJson] = useGlobalPref(
    'installedCustomDarkTheme',
  );
  const [customCssOverride] = useGlobalPref('customCssOverride');
  const hasCustomCssOverride = Boolean(customCssOverride?.trim());

  const installedCustomLightTheme = parseInstalledTheme(
    installedLightThemeJson,
  );
  const installedCustomDarkTheme = parseInstalledTheme(installedDarkThemeJson);

  // Build the options list for the single (non-auto) theme selector
  const buildOptions = useCallback(() => {
    const options: Array<readonly [string, string] | typeof Menu.line> = [
      ...themeOptions,
    ];

    if (customThemesEnabled) {
      if (theme !== 'auto' && installedCustomLightTheme) {
        options.push([
          `custom:${installedCustomLightTheme.id}`,
          installedCustomLightTheme.name,
        ] as const);
      }
      options.push(Menu.line);
      options.push([INSTALL_NEW_VALUE, t('Custom theme')] as const);
    }

    return options;
  }, [installedCustomLightTheme, customThemesEnabled, theme, t]);

  // Build options for the auto-mode light theme selector
  const buildLightOptions = useCallback(() => {
    const options: Array<readonly [string, string] | typeof Menu.line> = [
      ['light', t('Light')],
    ];
    if (customThemesEnabled) {
      if (installedCustomLightTheme) {
        options.push([
          `custom-light:${installedCustomLightTheme.id}`,
          installedCustomLightTheme.name,
        ] as const);
      }
      options.push(Menu.line);
      options.push([INSTALL_CUSTOM_LIGHT, t('Custom theme')] as const);
    }
    return options;
  }, [installedCustomLightTheme, customThemesEnabled, t]);

  // Build options for the auto-mode dark theme selector
  const buildDarkOptions = useCallback(() => {
    const options: Array<readonly [string, string] | typeof Menu.line> = [
      ...darkThemeOptions,
    ];
    if (customThemesEnabled) {
      if (installedCustomDarkTheme) {
        options.push([
          `custom-dark:${installedCustomDarkTheme.id}`,
          installedCustomDarkTheme.name,
        ] as const);
      }
      options.push(Menu.line);
      options.push([INSTALL_CUSTOM_DARK, t('Custom theme')] as const);
    }
    return options;
  }, [installedCustomDarkTheme, customThemesEnabled, t]);

  // Determine current value for the single theme select
  const getCurrentValue = useCallback(() => {
    if (customThemesEnabled && installedCustomLightTheme && theme !== 'auto') {
      return `custom:${installedCustomLightTheme.id}`;
    }
    return theme;
  }, [customThemesEnabled, installedCustomLightTheme, theme]);

  // Handle theme selection (non-auto mode)
  const handleThemeChange = useCallback(
    (value: string) => {
      if (value === INSTALL_NEW_VALUE) {
        // Pre-switch out of auto so the just-installed theme is immediately
        // visible regardless of the OS color-scheme preference.
        if (theme === 'auto') {
          switchTheme('light');
        }
        setShowInstaller({ slot: 'light' });
        return;
      }

      if (!value.startsWith('custom:')) {
        setInstalledLightThemeJson(serializeInstalledTheme(null));
        setInstalledDarkThemeJson(serializeInstalledTheme(null));
        switchTheme(value as Theme);
      }
    },
    [theme, setInstalledLightThemeJson, setInstalledDarkThemeJson, switchTheme],
  );

  // Handle light theme selection (auto mode)
  const handleLightThemeChange = useCallback(
    (value: string) => {
      if (value === INSTALL_CUSTOM_LIGHT) {
        setShowInstaller({ slot: 'light', catalogMode: 'light' });
        return;
      }
      if (value === 'light') {
        setInstalledLightThemeJson(serializeInstalledTheme(null));
      }
    },
    [setInstalledLightThemeJson],
  );

  // Handle dark theme selection (auto mode)
  const handleDarkThemeChange = useCallback(
    (value: string) => {
      if (value === INSTALL_CUSTOM_DARK) {
        setShowInstaller({ slot: 'dark', catalogMode: 'dark' });
        return;
      }
      if (!value.startsWith('custom-dark:')) {
        setInstalledDarkThemeJson(serializeInstalledTheme(null));
        switchDarkTheme(value as DarkTheme);
      }
    },
    [setInstalledDarkThemeJson, switchDarkTheme],
  );

  const handleInstall = useCallback(
    (newTheme: InstalledTheme) => {
      if (!showInstaller) return;
      if (showInstaller.slot === 'dark') {
        setInstalledDarkThemeJson(serializeInstalledTheme(newTheme));
      } else {
        setInstalledLightThemeJson(serializeInstalledTheme(newTheme));
      }
    },
    [showInstaller, setInstalledLightThemeJson, setInstalledDarkThemeJson],
  );

  // Handle installer close
  const handleInstallerClose = useCallback(() => {
    setShowInstaller(null);
  }, []);

  const handleEditOverride = useCallback(() => {
    setShowInstaller({ slot: 'light' });
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
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Select<string>
                    onChange={handleThemeChange}
                    value={getCurrentValue()}
                    options={buildOptions()}
                    className={css({
                      '&[data-hovered]': {
                        backgroundColor: themeStyle.buttonNormalBackgroundHover,
                      },
                      maxWidth: '100%',
                    })}
                  />
                  {customThemesEnabled && hasCustomCssOverride && (
                    <Button
                      variant="bare"
                      aria-label={t(
                        'Custom CSS override active — click to edit',
                      )}
                      onPress={handleEditOverride}
                      style={{
                        color: themeStyle.pageTextPositive,
                        gap: 6,
                      }}
                    >
                      <Trans>Custom CSS is active</Trans>
                      <SvgCode style={{ width: 14, height: 14 }} />
                    </Button>
                  )}
                </View>
              </Column>
              {theme === 'auto' && (
                <>
                  <Column title={t('Light theme')}>
                    <Select<string>
                      onChange={handleLightThemeChange}
                      value={
                        customThemesEnabled && installedCustomLightTheme
                          ? `custom-light:${installedCustomLightTheme.id}`
                          : 'light'
                      }
                      options={buildLightOptions()}
                      className={css({
                        '&[data-hovered]': {
                          backgroundColor:
                            themeStyle.buttonNormalBackgroundHover,
                        },
                        maxWidth: '100%',
                      })}
                    />
                  </Column>
                  <Column title={t('Dark theme')}>
                    <Select<string>
                      onChange={handleDarkThemeChange}
                      value={
                        customThemesEnabled && installedCustomDarkTheme
                          ? `custom-dark:${installedCustomDarkTheme.id}`
                          : darkTheme
                      }
                      options={buildDarkOptions()}
                      className={css({
                        '&[data-hovered]': {
                          backgroundColor:
                            themeStyle.buttonNormalBackgroundHover,
                        },
                        maxWidth: '100%',
                      })}
                    />
                  </Column>
                </>
              )}
            </View>
          )}

          {customThemesEnabled && showInstaller && (
            <ThemeInstaller
              onInstall={handleInstall}
              onClose={handleInstallerClose}
              installedTheme={
                showInstaller.slot === 'dark'
                  ? installedCustomDarkTheme
                  : installedCustomLightTheme
              }
              mode={showInstaller.catalogMode}
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
