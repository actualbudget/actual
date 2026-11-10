import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Input } from '@actual-app/components/input';
import { Paragraph } from '@actual-app/components/paragraph';
import { Select } from '@actual-app/components/select';
import { styles } from '@actual-app/components/styles';
import type { CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
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
  const { isNarrowWidth } = useResponsive();
  const [interval, setIntervalPref] = useSyncedPref('bank-sync-interval');
  const touchSelectStyle = isNarrowWidth
    ? {
        ...styles.mediumText,
        minHeight: styles.mobileMinHeight,
        paddingInline: spacing.md,
      }
    : {};
  const rowStyle: CSSProperties = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  };

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
    const parsed = Number(value);
    if (value.trim() === '' || !Number.isFinite(parsed)) {
      setDraft(null);
      return;
    }

    onChangeCustom(parsed, customParts.unit);
  }

  return (
    <View
      style={{
        gap: spacing.md,
      }}
    >
      <Paragraph style={{ color: theme.pageTextLight, margin: 0 }}>
        <Trans>
          Download new transactions from your linked accounts in the background
          while Actual is open. A sync runs when any account hasn't synced
          within the chosen interval, including syncs from other devices.
        </Trans>
      </Paragraph>

      <View style={rowStyle}>
        <label htmlFor="bank-sync-interval">
          <Trans>Sync accounts</Trans>
        </label>
        <Select
          id="bank-sync-interval"
          value={showCustom ? CUSTOM : currentInterval}
          onChange={onChangeInterval}
          options={intervals}
          style={{ flexShrink: 0, ...touchSelectStyle }}
        />
      </View>

      {showCustom && (
        <View style={rowStyle}>
          <label htmlFor="bank-sync-interval-value">
            <Trans>every</Trans>
          </label>
          <Input
            id="bank-sync-interval-value"
            type="number"
            size={isNarrowWidth ? 'extra-large' : undefined}
            min={
              customParts.unit === 'minute' ? MIN_CUSTOM_INTERVAL_MINUTES : 1
            }
            style={{
              width: isNarrowWidth ? 90 : 70,
              flexShrink: 0,
              ...(isNarrowWidth && { height: styles.mobileMinHeight }),
            }}
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
            style={{ flexShrink: 0, ...touchSelectStyle }}
          />
        </View>
      )}
    </View>
  );
}
