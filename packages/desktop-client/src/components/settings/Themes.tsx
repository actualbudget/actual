import React from 'react';

import { type Theme } from 'loot-core/types/prefs';

import { themeOptions, useTheme, theme as themeStyle } from '../../style';
import { Select } from '../common/Select';
import { Text } from '../common/Text';

import { Setting } from './UI';

export function ThemeSettings() {
  const [theme, switchTheme] = useTheme();

  return (
    <Setting
      primaryAction={
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
      }
    >
      <Text>
        <strong>Themes</strong> change the user interface colors.
      </Text>
    </Setting>
  );
}
