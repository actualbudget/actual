import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';

import { Column } from 'glamor/jsxstyle';

import { type SyncedPrefs } from 'loot-core/types/prefs';

import { useSyncedPref } from '../../hooks/useSyncedPref';
import { type CSSProperties, theme } from '../../style';
import { Button } from '../common/Button';
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

  const location = useLocation();
  const [expanded, setExpanded] = useState(location.hash === '#upcomingLength');

  return expanded ? (
    <Setting
      primaryAction={
        <View style={{ flexDirection: 'row', gap: '1em' }}>
          <Column title="Upcoming Length">
            <Select
              options={options.map(x => [x.value || '7', x.label])}
              value={upcomingLength}
              onChange={newValue => setUpcomingLength(newValue)}
              style={selectButtonStyle}
            />
          </Column>
        </View>
      }
    >
      <View style={{ flexDirection: 'row', gap: 20 }}>
        <Text>
          <strong>Upcoming Length</strong> does not affect how budget data is
          stored, and can be changed at any time.
        </Text>
        <Button
          onClick={() => setExpanded(false)}
          aria-label="Close upcoming length settings"
        >
          Close
        </Button>
      </View>
    </Setting>
  ) : (
    <Setting>
      <View style={{ flexDirection: 'row', gap: 20 }}>
        <Text style={{ fontSize: '1.25rem' }}>
          <strong>Upcoming Length</strong>
        </Text>
        <Button
          onClick={() => setExpanded(true)}
          aria-label="Edit upcoming length settings"
        >
          Edit
        </Button>
      </View>
    </Setting>
  );
}
