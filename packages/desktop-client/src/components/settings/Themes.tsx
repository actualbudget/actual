import React from 'react';

import { useActions } from '../../hooks/useActions';
import { themeOptions, useTheme } from '../../style';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { Text } from '../common/Text';

import { Setting } from './UI';

export function ThemeSettings() {
  const theme = useTheme();
  const { saveGlobalPrefs } = useActions();

  return (
    <Setting
      primaryAction={
        <Button bounce={false} style={{ padding: 0 }}>
          <Select
            bare
            onChange={value => {
              saveGlobalPrefs({ theme: value });
            }}
            value={theme}
            options={themeOptions}
            style={{ padding: '2px 10px', fontSize: 15 }}
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
