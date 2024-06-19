import React from 'react';

import { type Theme } from 'loot-core/types/prefs';

import { themeOptions, useTheme } from '../../style';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { Text } from '../common/Text';

import { Setting } from './UI';

export function ThemeSettings() {
  const [theme, switchTheme] = useTheme();

  return (
    <Setting
      primaryAction={
        <Button bounce={false} style={{ padding: 0 }}>
          <Select<Theme>
            bare
            onChange={switchTheme}
            value={theme}
            options={themeOptions}
          />
        </Button>
      }
    >
      <Text>
        <strong>Themes</strong> change the user interface colors.
      </Text>
    </Setting>
  );
}
