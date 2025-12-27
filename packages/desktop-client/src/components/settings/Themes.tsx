import React from 'react';
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
import {
  type AccentColor,
  accentColors,
  accentColorOptions,
  themeOptions,
  useAccentColor,
  useTheme,
  usePreferredDarkTheme,
  darkThemeOptions,
} from '@desktop-client/style';

function AccentColorSwatch({
  color,
  isSelected,
  onClick,
}: {
  color: AccentColor;
  isSelected: boolean;
  onClick: () => void;
}) {
  const scale = accentColors[color];
  return (
    <button
      type="button"
      onClick={onClick}
      className={css({
        width: 32,
        height: 32,
        borderRadius: 6,
        border: isSelected
          ? `2px solid ${themeStyle.pageText}`
          : '2px solid transparent',
        background: scale[500],
        cursor: 'pointer',
        transition: 'transform 0.1s ease, border-color 0.15s ease',
        '&:hover': {
          transform: 'scale(1.1)',
        },
      })}
      aria-label={color}
    />
  );
}

export function ThemeSettings() {
  const { t } = useTranslation();
  const sidebar = useSidebar();
  const [theme, switchTheme] = useTheme();
  const [darkTheme, switchDarkTheme] = usePreferredDarkTheme();
  const [accentColor, setAccentColor] = useAccentColor();

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
          <Column title={t('Accent color')}>
            <View
              style={{
                flexDirection: 'row',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              {accentColorOptions.map(([colorKey]) => (
                <AccentColorSwatch
                  key={colorKey}
                  color={colorKey}
                  isSelected={accentColor === colorKey}
                  onClick={() => setAccentColor(colorKey)}
                />
              ))}
            </View>
          </Column>
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
