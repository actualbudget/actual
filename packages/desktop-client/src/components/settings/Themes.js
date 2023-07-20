import React from 'react';

import { themeNames, useTheme } from '../../style';
import { Button, Select, Text } from '../common';

import { Setting } from './UI';

export default function ThemeSettings({ saveGlobalPrefs }) {
  let theme = useTheme();
  return (
    <Setting
      primaryAction={
        <Button bounce={false} style={{ padding: 0 }}>
          <Select
            onChange={value => {
              saveGlobalPrefs({ theme: value });
            }}
            value={theme}
            options={themeNames.map(name => [name, name])}
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
