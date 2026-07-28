import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import {
  DEFAULT_UPCOMING_SCHEDULE_DAYS,
  isCustomUpcomingLength,
  UPCOMING_LENGTH_PRESET_OPTIONS,
} from '@actual-app/core/shared/schedules';
import type { SyncedPrefs } from '@actual-app/core/types/prefs';
import { css } from '@emotion/css';

import { Link } from '#components/common/Link';
import { Checkbox } from '#components/forms';
import { CustomUpcomingLength } from '#components/schedules/CustomUpcomingLength';
import { useGlobalPref } from '#hooks/useGlobalPref';
import { useSyncedPref } from '#hooks/useSyncedPref';

import { Setting } from './UI';

function useUpcomingLengthOptions() {
  const { t } = useTranslation();

  const upcomingLengthOptions = UPCOMING_LENGTH_PRESET_OPTIONS.map(o => ({
    value: o.value as SyncedPrefs['upcomingScheduledTransactionLength'],
    label: t(o.labelKey),
  }));

  upcomingLengthOptions.push({ value: 'custom', label: t('Custom length') });

  return { upcomingLengthOptions };
}

function nonCustomUpcomingLengthValues(value: string) {
  return isCustomUpcomingLength(value);
}

function PersistCustomUpcomingLength({
  tempValue,
  upcomingLength,
  setUpcomingLength,
}: {
  tempValue: string;
  upcomingLength: string;
  setUpcomingLength: (v: string) => void;
}) {
  // Debounce saves to avoid persisting on every render-driven change.
  useEffect(() => {
    // Only save when the temp value is a valid custom format and differs
    // from the currently-synced upcomingLength.
    if (!/^[1-9]\d*-(day|week|month|year)$/.test(tempValue)) return;
    if (tempValue === upcomingLength) return;

    const timeout = setTimeout(() => {
      setUpcomingLength(tempValue);
    }, 700);

    return () => clearTimeout(timeout);
  }, [tempValue, upcomingLength, setUpcomingLength]);

  return null;
}

export function ScheduleSettings() {
  const [_upcomingLength, setUpcomingLength] = useSyncedPref(
    'upcomingScheduledTransactionLength',
  );

  const upcomingLength = _upcomingLength || DEFAULT_UPCOMING_SCHEDULE_DAYS;
  const [tempUpcomingLength, setTempUpcomingLength] = useState(upcomingLength);
  const [useCustomLength, setUseCustomLength] = useState(
    nonCustomUpcomingLengthValues(tempUpcomingLength),
  );

  const [showConvertToSchedulePrompt = true, setShowConvertToSchedulePrompt] =
    useGlobalPref('showConvertToSchedulePrompt');

  useEffect(() => {
    // keep local temp in sync when external changes happen
    setTempUpcomingLength(upcomingLength);
    setUseCustomLength(nonCustomUpcomingLengthValues(upcomingLength));
  }, [upcomingLength]);

  const { upcomingLengthOptions } = useUpcomingLengthOptions();

  const selectClass = css({
    maxWidth: 300,
  });

  return (
    <Setting>
      <View id="schedules" style={{ gap: 10 }}>
        <Text>
          <Trans>
            <strong>Schedules</strong> help you keep track of future
            transactions. You can see and manage your current schedules by
            clicking "Schedules" in the sidebar. These settings only affect how
            schedules are displayed, not how budget data is stored. They can be
            changed at any time.
          </Trans>{' '}
          <Link
            variant="external"
            to="https://actualbudget.org/docs/schedules"
            linkColor="purple"
          >
            <Trans>Learn more</Trans>
          </Link>
        </Text>

        <View style={{ marginTop: 10 }}>
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              flexWrap: 'wrap',
              maxWidth: 540,
            }}
          >
            <Text>
              <Trans>
                <strong>Upcoming length</strong> controls how many days in
                advance of the scheduled date a scheduled transaction appears in
                the account ledger as upcoming.
              </Trans>
            </Text>
            <div style={{ maxWidth: 300 }}>
              <Select
                className={selectClass}
                options={upcomingLengthOptions.map(x => [
                  x.value || DEFAULT_UPCOMING_SCHEDULE_DAYS,
                  x.label,
                ])}
                value={
                  useCustomLength
                    ? 'custom'
                    : tempUpcomingLength || DEFAULT_UPCOMING_SCHEDULE_DAYS
                }
                onChange={newValue => {
                  if (newValue === 'custom') {
                    setUseCustomLength(true);
                    // Default the underlying custom value to a sensible current value.
                    // If tempUpcomingLength is a plain number (e.g., '7'), treat it as days.
                    // Map known tokens like 'oneMonth' to '1-month'. Otherwise fallback to '1-day'.
                    const current =
                      tempUpcomingLength ||
                      upcomingLength ||
                      DEFAULT_UPCOMING_SCHEDULE_DAYS;
                    let defaultCustom = '1-day';
                    if (/^\d+$/.test(String(current))) {
                      defaultCustom = `${current}-day`;
                    } else if (
                      current === 'oneMonth' ||
                      current === 'currentMonth'
                    ) {
                      defaultCustom = '1-month';
                    }
                    setTempUpcomingLength(defaultCustom);
                    // do not auto-save yet until custom value is provided (will auto-save when CustomUpcomingLength onChange runs)
                  } else {
                    setUseCustomLength(false);
                    setTempUpcomingLength(newValue);
                    setUpcomingLength(newValue);
                  }
                }}
              />
            </div>

            {useCustomLength && (
              <CustomUpcomingLength
                inline
                onChange={newVal => {
                  // Only update the local temp value here. Persisting to the
                  // synced preference is handled by a debounced effect below to
                  // avoid repeated saves on every keystroke and to prevent
                  // overwriting externally-synced changes while the user types.
                  setTempUpcomingLength(newVal);
                }}
                tempValue={tempUpcomingLength}
              />
            )}

            {/* Persist custom upcoming length after the user stops typing. */}
            {useCustomLength && (
              <PersistCustomUpcomingLength
                tempValue={tempUpcomingLength}
                upcomingLength={upcomingLength}
                setUpcomingLength={setUpcomingLength}
              />
            )}
          </div>
        </View>

        <View style={{ marginTop: 12 }}>
          <Text>
            <Trans>
              The <strong>Convert to Schedule</strong> prompt is an optional
              pop-up that appears when a transaction is entered for a date in
              the future. It allows you to choose whether you would like to
              create a single-time schedule instead of a regular transaction.
            </Trans>
          </Text>{' '}
          <Text
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 8,
            }}
          >
            <Checkbox
              id="settings-showConvertToSchedulePrompt"
              checked={showConvertToSchedulePrompt === true}
              onChange={e =>
                setShowConvertToSchedulePrompt(e.currentTarget.checked)
              }
            />
            <label htmlFor="settings-showConvertToSchedulePrompt">
              <Trans>
                Show "Convert to Schedule" prompt for future-dated transactions
              </Trans>
            </label>
          </Text>
        </View>
      </View>
    </Setting>
  );
}
