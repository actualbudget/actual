import { useState } from 'react';
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

  // Set when the user explicitly picks "Custom interval". Kept separate from
  // the derivation below so choosing Custom while the interval happens to
  // equal a preset (say a whole day) doesn't immediately collapse the fields.
  const [choseCustom, setChoseCustom] = useState(false);

  // `bank-sync-interval` is a synced pref, so a value can arrive from another
  // device — or simply load — after mount. Deriving from it rather than
  // snapshotting keeps the fields in step with whatever is stored.
  const showCustom = choseCustom || !isPresetInterval(currentInterval);

  // Uncommitted text in the number field. Without this, clamping on every
  // keystroke makes multi-digit minute values impossible to type: the "3" of
  // "30" would be rewritten to the 15-minute floor.
  const [draft, setDraft] = useState<string | null>(null);

  const intervals: Array<[string, string]> = [
    ['0', t('Never')],
    ['720', t('Every 12 hours')],
    ['1440', t('Every day')],
    ['10080', t('Every week')],
    [CUSTOM, t('Custom interval')],
  ];

  const units: Array<[BankSyncIntervalUnit, string]> = [
    ['minute', t('minutes')],
    ['hour', t('hours')],
    ['day', t('days')],
    ['week', t('weeks')],
  ];

  const customParts = minutesToParts(parseInt(currentInterval, 10));

  function onChangeInterval(value: string) {
    if (value === CUSTOM) {
      setChoseCustom(true);
      // Write the interval straight away, so the value shown in the custom
      // fields is the one actually in effect.
      setIntervalPref(
        String(partsToMinutes(customParts.value, customParts.unit)),
      );
      return;
    }

    setChoseCustom(false);
    setDraft(null);
    setIntervalPref(value);
  }

  function onChangeCustom(value: number, unit: BankSyncIntervalUnit) {
    setDraft(null);
    setIntervalPref(String(partsToMinutes(value, unit)));
  }

  function commitDraft(value: string) {
    onChangeCustom(parseInt(value, 10), customParts.unit);
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
              value={draft ?? String(customParts.value)}
              onChangeValue={setDraft}
              // Persist once the value is complete, not per keystroke.
              onUpdate={commitDraft}
              onEnter={commitDraft}
            />
            {/* Select drops unknown props, so this cannot carry an aria-label;
                the button's own text ("minutes", "hours", …) names it. */}
            <Select
              id="bank-sync-interval-unit"
              value={customParts.unit}
              onChange={unit => onChangeCustom(customParts.value, unit)}
              options={units}
              style={{ flexShrink: 0 }}
            />
          </>
        )}
      </View>
    </View>
  );
}
