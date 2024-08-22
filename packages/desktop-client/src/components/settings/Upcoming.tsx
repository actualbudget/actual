import React, { ReactNode } from 'react';

import { Column } from 'glamor/jsxstyle';

import { type SyncedPrefs } from 'loot-core/types/prefs';

import { useSyncedPref } from '../../hooks/useSyncedPref';
import { type CSSProperties, theme } from '../../style';
import { Select } from '../common/Select';
import { Text } from '../common/Text';
import { View } from '../common/View';

import { Setting } from './UI';

const options: {
  value: SyncedPrefs['upcomingScheduledTransactionLength'];
  label: string;
}[] = [
  { value: '1', label: '1 Day' },
  { value: '7', label: '1 Week' },
  { value: '14', label: '2 Weeks' },
  { value: '30', label: '1 Month' },
  { value: '60', label: '2 Months' },
  { value: '90', label: '3 Months' },
];

export function UpcomingLengthSettings() {
  const [_upcomingLength, setUpcomingLength] = useSyncedPref(
    'upcomingScheduledTransactionLength',
  );
  const upcomingLength = _upcomingLength || '7';

  const selectButtonStyle: CSSProperties = {
    ':hover': {
      backgroundColor: theme.buttonNormalBackgroundHover,
    },
  };

  return (
    <Setting
      primaryAction={
        <View style={{ flexDirection: 'row', gap: '1em' }}>
          <Column title="Upcoming Length">
            <Select
              options={options.map(x => [x.value || '7', x.label])}
              value={upcomingLength}
              onChange={newValue => setUpcomingLength(newValue)}
              buttonStyle={selectButtonStyle}
            />
          </Column>
        </View>
      }
    >
      <Text>
        <strong>Upcoming Length</strong> does not affect how budget data is
        stored, and can be changed at any time.
      </Text>
    </Setting>
  );
}
