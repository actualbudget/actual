import React from 'react';

import { GetColorThemes } from '../../style';
import { Button, View, CustomSelect, Text } from '../common';

import { Setting } from './UI';

export default function ThemeSettings({ globalPrefs, saveGlobalPrefs }) {
  let themes = GetColorThemes();
  return (
    <Setting
      primaryAction={
        <View>
          <Button bounce={false} style={{ padding: 0 }}>
            <CustomSelect
              onChange={value => {
                saveGlobalPrefs({ theme: value });
              }}
              value={globalPrefs.theme}
              options={themes.map(x => [x, x])}
              style={{ padding: '2px 10px', fontSize: 15 }}
            />
          </Button>
        </View>
      }
    >
      <Text>
        <strong>Themes</strong> change the user interface colors.
      </Text>
    </Setting>
  );
}
