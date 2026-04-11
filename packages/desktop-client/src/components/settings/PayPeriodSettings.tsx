import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { Checkbox, FormField, FormLabel } from '#components/forms';
import { useSyncedPref } from '#hooks/useSyncedPref';

import { Setting } from './UI';

const FREQUENCY_OPTIONS: [string, string][] = [
  ['weekly', 'Weekly'],
  ['biweekly', 'Biweekly (every 2 weeks)'],
  ['monthly', 'Monthly'],
];

export function PayPeriodSettings() {
  const { t } = useTranslation();
  const [showPayPeriods, setShowPayPeriods] = useSyncedPref('showPayPeriods');
  const [payPeriodFrequency, setPayPeriodFrequency] =
    useSyncedPref('payPeriodFrequency');
  const [payPeriodStartDate, setPayPeriodStartDate] =
    useSyncedPref('payPeriodStartDate');

  const enabled = showPayPeriods === 'true';
  const [validationError, setValidationError] = useState<string | null>(null);
  const [frequencyWarning, setFrequencyWarning] = useState(false);

  const handleToggle = () => {
    if (!enabled) {
      if (!payPeriodStartDate) {
        setValidationError(
          t('A start date is required before enabling pay periods.'),
        );
        return;
      }
      if (!payPeriodFrequency) {
        setValidationError(
          t('A frequency is required before enabling pay periods.'),
        );
        return;
      }
    }
    setValidationError(null);
    setShowPayPeriods(enabled ? 'false' : 'true');
  };

  const handleFrequencyChange = (freq: string) => {
    if (enabled) {
      setFrequencyWarning(true);
    }
    setPayPeriodFrequency(freq);
  };

  return (
    <View data-testid="pay-period-settings">
      <Setting
        primaryAction={
          <View style={{ gap: 10 }}>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <Checkbox
                id="settings-showPayPeriods"
                checked={enabled}
                onChange={handleToggle}
              />
              <label
                htmlFor="settings-showPayPeriods"
                style={{ cursor: 'pointer' }}
              >
                <Trans>Enable pay period budgeting</Trans>
              </label>
            </View>

            {validationError && (
              <Text style={{ color: theme.errorText, fontSize: 13 }}>
                {validationError}
              </Text>
            )}

            <FormField>
              <FormLabel
                title={t('Pay frequency')}
                htmlFor="pay-period-frequency"
              />
              <Select
                id="pay-period-frequency"
                value={payPeriodFrequency || 'monthly'}
                onChange={handleFrequencyChange}
                options={FREQUENCY_OPTIONS}
              />
            </FormField>

            {frequencyWarning && (
              <Text style={{ color: theme.warningText, fontSize: 13 }}>
                <Trans>
                  Changing frequency will reset period numbering for the
                  affected year. Budgeted amounts will be preserved.
                </Trans>
              </Text>
            )}

            <FormField>
              <FormLabel
                title={t('Pay period start date')}
                htmlFor="pay-period-start-date"
              />
              <input
                id="pay-period-start-date"
                type="date"
                value={payPeriodStartDate || ''}
                onChange={e => {
                  setPayPeriodStartDate(e.target.value);
                  setValidationError(null);
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: '1px solid ' + theme.tableBorder,
                  backgroundColor: theme.tableBackground,
                  color: theme.tableText,
                  fontSize: 14,
                }}
              />
            </FormField>

            {enabled && (
              <Button
                onPress={() => {
                  setShowPayPeriods('false');
                  setValidationError(null);
                }}
                style={{ alignSelf: 'flex-start' }}
              >
                <Trans>Disable pay periods</Trans>
              </Button>
            )}
          </View>
        }
      >
        <Text>
          <Trans>
            <strong>Pay period budgeting</strong> replaces calendar months with
            your actual pay schedule (weekly, biweekly, or monthly). Set a start
            date that matches when your first pay period of the year begins.
          </Trans>
        </Text>
        <Text>
          <Trans>
            Pay periods use IDs starting from 13 to distinguish them from
            calendar months. Period 1 of each year always starts on or before
            January 1 based on your cadence.
          </Trans>
        </Text>
      </Setting>
    </View>
  );
}
