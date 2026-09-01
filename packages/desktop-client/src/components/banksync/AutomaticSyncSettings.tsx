import { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Input } from '@actual-app/components/input';
import { Paragraph } from '@actual-app/components/paragraph';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { MIN_CUSTOM_INTERVAL_MINUTES } from '#hooks/useAutomaticBankSync';
import { useSyncedPref } from '#hooks/useSyncedPref';

import type { BankSyncIntervalUnit } from './bankSyncInterval';
import {
  isPresetInterval,
  minutesToParts,
  partsToMinutes,
} from './bankSyncInterval';

const CUSTOM = 'custom';

export function AutomaticSyncSettings() {
  const { t } = useTranslation();
  const [interval, setIntervalPref] = useSyncedPref('bank-sync-interval');

  const currentInterval = interval || '0';

  // A stored value that isn't one of the presets can only have come from the
  // custom control, so show it expanded.
  const [showCustom, setShowCustom] = useState(
    !isPresetInterval(currentInterval),
  );

  const intervals = useMemo<Array<[string, string]>>(
    () => [
      ['0', t('Never')],
      ['720', t('Every 12 hours')],
      ['1440', t('Every day')],
      ['10080', t('Every week')],
      [CUSTOM, t('Custom interval')],
    ],
    [t],
  );

  const units = useMemo<Array<[BankSyncIntervalUnit, string]>>(
    () => [
      ['minute', t('minutes')],
      ['hour', t('hours')],
      ['day', t('days')],
      ['week', t('weeks')],
    ],
    [t],
  );

  const customParts = minutesToParts(parseInt(currentInterval, 10));

  function onChangeInterval(value: string) {
    if (value === CUSTOM) {
      setShowCustom(true);
      // Write the interval straight away, so the value shown in the custom
      // fields is the one actually in effect.
      setIntervalPref(
        String(partsToMinutes(customParts.value, customParts.unit)),
      );
      return;
    }

    setShowCustom(false);
    setIntervalPref(value);
  }

  function onChangeCustom(value: number, unit: BankSyncIntervalUnit) {
    setIntervalPref(String(partsToMinutes(value, unit)));
  }

  return (
    <View
      style={{
        border: `1px solid ${theme.tableBorder}`,
        borderRadius: 8,
        padding: 16,
        backgroundColor: theme.tableBackground,
        gap: 12,
      }}
    >
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 17, fontWeight: 600 }}>
          <Trans>Automatic syncing</Trans>
        </Text>
        <Paragraph
          style={{ fontSize: 15, color: theme.pageTextSubdued, margin: 0 }}
        >
          <Trans>
            Download new transactions from your linked accounts in the
            background. This only happens while Actual is open, and is skipped
            if another device has already synced within the chosen interval.
          </Trans>
        </Paragraph>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <label htmlFor="bank-sync-interval">
          <Trans>Sync accounts</Trans>
        </label>
        <Select
          id="bank-sync-interval"
          value={showCustom ? CUSTOM : currentInterval}
          onChange={onChangeInterval}
          options={intervals}
          style={{ flexShrink: 0 }}
        />

        {showCustom && (
          <>
            <label htmlFor="bank-sync-interval-value">
              <Trans>every</Trans>
            </label>
            <Input
              id="bank-sync-interval-value"
              type="number"
              min={
                customParts.unit === 'minute' ? MIN_CUSTOM_INTERVAL_MINUTES : 1
              }
              style={{ width: 70, flexShrink: 0 }}
              value={String(customParts.value)}
              onChangeValue={value =>
                onChangeCustom(parseInt(value, 10), customParts.unit)
              }
            />
            <Select
              id="bank-sync-interval-unit"
              aria-label={t('Interval unit')}
              value={customParts.unit}
              onChange={unit =>
                onChangeCustom(customParts.value, unit as BankSyncIntervalUnit)
              }
              options={units}
              style={{ flexShrink: 0 }}
            />
          </>
        )}
      </View>
    </View>
  );
}
