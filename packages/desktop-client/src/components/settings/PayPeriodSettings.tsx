import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { Column, Setting } from './UI';

import { Checkbox } from '@desktop-client/components/forms';
import { Input } from '@actual-app/components/input';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

export function PayPeriodSettings() {
  const enabledByFlag = useFeatureFlag('payPeriodsEnabled');
  const { t } = useTranslation();

  const [enabled, setEnabled] = useSyncedPref('payPeriodEnabled');
  const [frequency, setFrequency] = useSyncedPref('payPeriodFrequency');
  const [startDate, setStartDate] = useSyncedPref('payPeriodStartDate');
  const [yearStart, setYearStart] = useSyncedPref('payPeriodYearStart');
  const [showPayPeriods, setShowPayPeriods] = useSyncedPref('showPayPeriods');

  const frequencyOptions: [string, string][] = [
    ['weekly', t('Weekly')],
    ['biweekly', t('Biweekly')],
    ['monthly', t('Monthly')],
  ];

  return (
    <Setting
      primaryAction={
        <View style={{ display: 'flex', flexDirection: 'column', gap: '1.5em' }}>
          <View style={{ display: 'flex', flexDirection: 'row', gap: '1.5em' }}>
            <Column title={t('Enable Pay Periods')}>
              <Checkbox
                id="settings-payPeriodEnabled"
                checked={String(enabled) === 'true'}
                onChange={e => setEnabled(e.target.checked ? 'true' : 'false')}
                disabled={!enabledByFlag}
              />
            </Column>

            <Column title={t('Frequency')}>
              <Select
                value={frequency || 'monthly'}
                onChange={value => setFrequency(value)}
                options={frequencyOptions}
                disabled={!enabledByFlag}
              />
            </Column>
          </View>

          <View style={{ display: 'flex', flexDirection: 'row', gap: '1.5em' }}>
            <Column title={t('Start Date')}>
              <Input
                type="date"
                value={startDate || ''}
                onChange={e => setStartDate(e.target.value)}
                disabled={!enabledByFlag}
              />
            </Column>

            <Column title={t('Plan Year Start (YYYY)')}>
              <Input
                type="number"
                value={yearStart || ''}
                onChange={e => setYearStart(e.target.value)}
                disabled={!enabledByFlag}
              />
            </Column>
          </View>

          <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <Checkbox
              id="settings-showPayPeriods"
              checked={String(showPayPeriods) === 'true'}
              onChange={e => setShowPayPeriods(e.target.checked ? 'true' : 'false')}
              disabled={!enabledByFlag}
            />
            <label htmlFor="settings-showPayPeriods" style={{ marginLeft: '0.5em' }}>
              <Trans>Show pay periods in budget view</Trans>
            </label>
          </View>
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

