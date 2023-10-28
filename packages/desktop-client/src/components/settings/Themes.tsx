import React from 'react';

import { useActions } from '../../hooks/useActions';
import { themeOptions, useTheme } from '../../style';
import Button from '../common/Button';
import Select from '../common/Select';
import Text from '../common/Text';

import { Setting } from './UI';

export default function ThemeSettings() {
  let theme = useTheme();
  let { saveGlobalPrefs } = useActions();

  return (
    <Setting
      primaryAction={
        <Button bounce={false} style={{ padding: 0 }}>
          <Select
            onChange={value => {
              saveGlobalPrefs({ theme: value });
            }}
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
