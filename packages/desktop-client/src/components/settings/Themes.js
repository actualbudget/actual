import React from 'react';

import { GetColorThemes } from '../../style';
import { View, Select, Text } from '../common';

import { Setting } from './UI';

export default function ThemeSettings({ globalPrefs, saveGlobalPrefs }) {
  let themes = GetColorThemes();
  return (
    <Setting
      primaryAction={
        <View>
          <Select
            value={globalPrefs.theme}
            onChange={e => {
              saveGlobalPrefs({ theme: e.target.value });
            }}
          >
            {themes.map(x => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </Select>
        </View>
      }
    >
      <Text>
        <strong>Themes</strong> change the user interface colors.
      </Text>
    </Setting>
  );
}
