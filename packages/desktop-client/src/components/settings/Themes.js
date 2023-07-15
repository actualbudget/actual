import React from 'react';

import { GetColorThemes } from '../../style';
import { View, CustomSelect, Text } from '../common';

import { Setting } from './UI';

export default function ThemeSettings({ globalPrefs, saveGlobalPrefs }) {
  let themes = GetColorThemes();
  return (
    <Setting
      primaryAction={
        <View>
          <CustomSelect
            onChange={value => {
              saveGlobalPrefs({ theme: value });
            }}
            value={globalPrefs.theme}
            options={themes.map(x => [x, x])}
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
