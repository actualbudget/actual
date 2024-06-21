import React from 'react';

import { type Theme } from 'loot-core/types/prefs';

import { useLocalPref } from '../../hooks/useLocalPref';
import { themeOptions, useTheme } from '../../style';
import { tokens } from '../../tokens';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { Checkbox } from '../forms';
import { useSidebar } from '../sidebar/SidebarProvider';

import { Column, Setting } from './UI';

export function ThemeSettings() {
  const [theme, switchTheme] = useTheme();
  const sidebar = useSidebar();
  const [colorizeBalances = true, setColorizeBalancesPref] =
    useLocalPref('colorizeBalances');

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
          <Column>
            <Button bounce={false} style={{ padding: 0 }}>
              <Select<Theme>
                bare
                onChange={value => {
                  switchTheme(value);
                }}
                value={theme}
                options={themeOptions}
                style={{ padding: '2px 10px', fontSize: 15 }}
              />
            </Button>
            <Text style={{ display: 'flex' }}>
              <Checkbox
                id="settings-textColorizeBalances"
                checked={!!colorizeBalances}
                onChange={e => setColorizeBalancesPref(e.currentTarget.checked)}
              />
              <label htmlFor="settings-textColorizeBalances">
                Colorize Budget and Account balances
              </label>
            </Text>
          </Column>
        </View>
      }
    >
      <Text>
        <strong>Themes</strong> change the user interface colors.
      </Text>
    </Setting>
  );
}
