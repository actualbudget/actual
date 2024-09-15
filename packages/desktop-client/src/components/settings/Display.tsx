import { useState, type HTMLProps } from 'react';
import { Trans } from 'react-i18next';

import { useLocalPref } from '../../hooks/useLocalPref';
import { theme as themeStyle } from '../../style';
import { Input } from '../common/Input';
import { Text } from '../common/Text';
import { View } from '../common/View';

import { Column, Setting } from './UI';

export function DisplaySettings() {
  const [prefWidth = 200, setPrefWidth] = useLocalPref('category.width');
  const [tempWidth, setTempWidth] = useState(prefWidth.toString());

  const onBlur: HTMLProps<HTMLInputElement>['onBlur'] = event => {
    if (document.hasFocus()) {
      const value = parseInt(event.target.value);

      if (Number.isInteger(value)) {
        const clampedValue = Math.max(100, Math.min(1024, value));
        setPrefWidth(clampedValue);
        setTempWidth(clampedValue.toString());
      } else {
        setTempWidth(prefWidth.toString());
      }
    }
  };

  return (
    <Setting
      primaryAction={
        <View
          style={{
            flexDirection: 'column',
            gap: '1em',
            width: '100%',
          }}
        >
          <Column title="Categories Width">
            <Text>
              <Trans>
                Width of the categories column in pixels. Must be between
              </Trans>
            </Text>
            <Input
              value={tempWidth}
              onChange={event => setTempWidth(event.target.value)}
              onBlur={onBlur}
              style={{
                ':hover': {
                  backgroundColor: themeStyle.buttonNormalBackgroundHover,
                },
              }}
            />
          </Column>
        </View>
      }
    >
      <Text>
        <Trans>
          <strong>Display settings</strong> change how certain elements of the
          interface are displayed.
        </Trans>
      </Text>
    </Setting>
  );
}
