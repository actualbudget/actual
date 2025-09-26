import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { Column, Setting } from './UI';
import { Input } from '@actual-app/components/input';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

export function PayPeriodSettings() {
  const enabledByFlag = useFeatureFlag('payPeriodsEnabled');
  const { t } = useTranslation();

  const [frequency, setFrequency] = useSyncedPref('payPeriodFrequency');
  const [startDate, setStartDate] = useSyncedPref('payPeriodStartDate');

  const frequencyOptions: [string, string][] = [
    ['weekly', t('Weekly')],
    ['biweekly', t('Biweekly')],
    ['monthly', t('Monthly')],
  ];

  return (
    <Setting
      primaryAction={
        <View style={{ display: 'flex', flexDirection: 'row', gap: '1.5em' }}>
          <Column title={t('Frequency')}>
            <Select
              value={frequency || 'monthly'}
              onChange={value => setFrequency(value)}
              options={frequencyOptions}
              disabled={!enabledByFlag}
            />
          </Column>

          <Column title={t('Start Date')}>
            <Input
              type="date"
              value={startDate || ''}
              onChange={e => setStartDate(e.target.value)}
              disabled={!enabledByFlag}
            />
          </Column>
        </View>
      }
    >
      <Text>
        <Trans>
          <strong>Pay period settings.</strong> Configure how pay periods are generated and displayed.
        </Trans>
      </Text>
    </Setting>
  );
}

