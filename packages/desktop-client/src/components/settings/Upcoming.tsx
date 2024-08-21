import React, { ReactNode } from 'react';
import { Setting } from './UI';
import { Select } from '../common/Select';
import { Text } from '../common/Text';
import { Column } from 'glamor/jsxstyle';
import { View } from '../common/View';

const options: { value: string; label: string }[] = [
  { value: '1', label: '1 Day' },
  { value: '7', label: '1 Week' },
  { value: '14', label: '2 Weeks' },
  { value: '30', label: '1 Month' },
  { value: '60', label: '2 Months' },
  { value: '90', label: '3 Months' },
];

export function UpcomingLengthSettings() {
  return (
    <Setting
      primaryAction={
        <View style={{ flexDirection: 'row', gap: '1em' }}>
          <Column title="Upcoming Length">
            <Select
              options={options.map(x => [x.value, x.label])}
              value={'7'}
              onChange={() => {}}
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
