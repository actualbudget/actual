import React, { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { type SyncedPrefs } from 'loot-core/types/prefs';

import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useSyncedPref } from '../../hooks/useSyncedPref';
import { Button } from '../common/Button2';
import { InfoBubble } from '../common/InfoBubble';
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
  const { t } = useTranslation();
  const [_upcomingLength, setUpcomingLength] = useSyncedPref(
    'upcomingScheduledTransactionLength',
  );
  const upcomingLength = _upcomingLength || '7';

  const enabled = useFeatureFlag('upcomingLengthAdjustment');

  const location = useLocation();
  const [expanded, setExpanded] = useState(location.hash === '#upcomingLength');

  if (!enabled) return null;

  return expanded ? (
    <Setting
      primaryAction={
        <View style={{ flexDirection: 'row', gap: '1em' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
            <View title={t('Upcoming Length')}>
              <Select
                options={options.map(x => [x.value || '7', x.label])}
                value={upcomingLength}
                onChange={newValue => setUpcomingLength(newValue)}
              />
            </View>
            <InfoBubble
              label={t(
                'Only the first instance of a recurring transaction will be shown.',
              )}
            />
          </View>
        </View>
      }
    >
      <View style={{ flexDirection: 'row', gap: 20 }}>
        <Text>
          <Trans>
            <strong>Upcoming Length</strong> does not affect how budget data is
            stored, and can be changed at any time.
          </Trans>
        </Text>
        <Button
          onPress={() => setExpanded(false)}
          aria-label="Close upcoming length settings"
        >
          <Trans>Close</Trans>
        </Button>
      </View>
    </Setting>
  ) : (
    <View>
      <Button
        aria-label="Edit upcoming length settings"
        variant="primary"
        onPress={() => setExpanded(true)}
      >
        <Trans>Edit Upcoming Length</Trans> (
        {options.find(x => x.value === upcomingLength)?.label ?? '1 Week'})
      </Button>
    </View>
  );
}
