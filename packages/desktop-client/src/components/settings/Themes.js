import React from 'react';

import { colors, GetColorThemes } from '../../style';
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
            style={{ padding: '2px 10px', fontSize: 15 }}
            wrapperStyle={{
              border: '1px solid ' + colors.formInputBorder,
            }}
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
