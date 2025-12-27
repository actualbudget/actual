import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { TextArea } from 'react-aria-components';

import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme as themeStyle } from '@actual-app/components/theme';
import { tokens } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { type DarkTheme, type Theme } from 'loot-core/types/prefs';

import { Column, Setting } from './UI';

import { useSidebar } from '@desktop-client/components/sidebar/SidebarProvider';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import {
  themeOptions,
  useTheme,
  usePreferredDarkTheme,
  darkThemeOptions,
} from '@desktop-client/style';

export function ThemeSettings() {
  const { t } = useTranslation();
  const sidebar = useSidebar();
  const [theme, switchTheme] = useTheme();
  const [darkTheme, switchDarkTheme] = usePreferredDarkTheme();
  const [customThemeCSS, setCustomThemeCSS] = useSyncedPref('customThemeCSS');

  return (
    <>
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
      <Setting
        primaryAction={
          <View
            style={{
              width: '100%',
              gap: '0.5em',
            }}
          >
            <Text style={{ fontWeight: 500 }}>
              <Trans>Custom CSS Variables</Trans>
            </Text>
            <TextArea
              value={customThemeCSS || ''}
              onChange={e => setCustomThemeCSS(e.target.value)}
              placeholder={t(
                '--color-pageBackground: #ffffff;\n--color-pageText: #000000;',
              )}
              className={css({
                width: '100%',
                minHeight: 120,
                padding: 10,
                fontFamily: 'monospace',
                fontSize: 13,
                border: '1px solid ' + themeStyle.formInputBorder,
                borderRadius: 4,
                backgroundColor: themeStyle.formInputBackground,
                color: themeStyle.formInputText,
                outline: 'none',
                '&:focus': {
                  borderColor: themeStyle.formInputBorderSelected,
                  backgroundColor: themeStyle.formInputBackgroundSelected,
                },
                '&::placeholder': {
                  color: themeStyle.formInputTextPlaceholder,
                },
              })}
            />
            <Text style={{ fontSize: 12, color: themeStyle.pageTextSubdued }}>
              <Trans>
                Override theme colors using CSS variables. Example:{' '}
                <code>--color-pageBackground: #ffffff;</code>
              </Trans>
            </Text>
          </View>
        }
      >
        <Text>
          <Trans>
            <strong>Custom CSS</strong> allows you to override theme colors
            using CSS variables. Changes apply immediately.
          </Trans>
        </Text>
      </Setting>
    </>
  );
}
