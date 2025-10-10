import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { Column, Setting } from './UI';

import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

export function PayPeriodSettings() {
  const enabledByFlag = useFeatureFlag('payPeriodsEnabled');
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();

  const [frequency, setFrequency] = useSyncedPref('payPeriodFrequency');
  const [startDate, setStartDate] = useSyncedPref('payPeriodStartDate');

  const frequencyOptions: [string, string][] = [
    ['weekly', t('Weekly')],
    ['biweekly', t('Biweekly')],
    ['semimonthly', t('Semimonthly')],
    ['monthly', t('Monthly')],
  ];

  return (
    <Setting
      primaryAction={
        <View
          style={{
            display: 'flex',
            flexDirection: isNarrowWidth ? 'column' : 'row',
            gap: '1.5em',
            width: '100%',
          }}
        >
          <Column title={t('Frequency')}>
            <Select
              value={frequency || 'monthly'}
              onChange={value => setFrequency(value)}
              options={frequencyOptions}
              disabled={!enabledByFlag}
              style={{ minHeight: 44 }}
            />
          </Column>

          <Column title={t('Start Date')}>
            <Input
              type="date"
              value={startDate || ''}
              onChange={e => setStartDate(e.target.value)}
              disabled={!enabledByFlag}
              style={{ minHeight: 44 }}
            />
          </Column>
        </View>
      }
    >
      <Text>
        <Trans>
          <strong>Pay period settings.</strong> Configure how pay periods are
          generated and displayed.
        </Trans>
      </Text>
    </Setting>
  );
}
