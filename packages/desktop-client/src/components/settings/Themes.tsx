import React, { type ReactNode } from 'react';

import { type DarkTheme, type Theme } from 'loot-core/types/prefs';

import {
  themeOptions,
  useTheme,
  theme as themeStyle,
  usePreferredDarkTheme,
  darkThemeOptions,
} from '../../style';
import { tokens } from '../../tokens';
import { Select } from '../common/Select';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { useSidebar } from '../sidebar/SidebarProvider';

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
  const sidebar = useSidebar();
  const [theme, switchTheme] = useTheme();
  const [darkTheme, switchDarkTheme] = usePreferredDarkTheme();

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
              options={themeOptions}
              buttonStyle={{
                ':hover': {
                  backgroundColor: themeStyle.buttonNormalBackgroundHover,
                },
              }}
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
                buttonStyle={{
                  ':hover': {
                    backgroundColor: themeStyle.buttonNormalBackgroundHover,
                  },
                }}
              />
            </Column>
          )}
        </View>
      }
    >
      <Text>
        <strong>Themes</strong> change the user interface colors.
      </Text>
    </Setting>
  );
}
