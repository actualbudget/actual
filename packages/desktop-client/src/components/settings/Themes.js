import React from 'react';

import { themeNames } from '../../theme';
import { View, Select, Text } from '../common';

import { Setting } from './UI';

export default function ThemeSettings({ globalPrefs, saveGlobalPrefs }) {
  return (
    <Setting
      primaryAction={
        <View>
          <Select
            onChange={value => {
              saveGlobalPrefs({ theme: value });
            }}
            value={globalPrefs.theme}
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
