import React from 'react';

import { themeNames, useTheme } from '../../style';
import { View, Select, Text } from '../common';

import { Setting } from './UI';

export default function ThemeSettings({ saveGlobalPrefs }) {
  let theme = useTheme();
  return (
    <Setting
      primaryAction={
        <View>
          <Select
            onChange={value => {
              saveGlobalPrefs({ theme: value });
            }}
            value={theme}
            options={themeNames.map(name => [name, name])}
          />
        </View>
      }
    >
      <Text>
        <strong>Themes</strong> change the user interface colors.
      </Text>
    </Setting>
  );
}
