// @ts-strict-ignore
import React, { type ReactNode } from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { tokens } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { numberFormats } from 'loot-core/shared/util';
import { type SyncedPrefs } from 'loot-core/types/prefs';

import { Column, Setting } from './UI';

import { Checkbox } from '@desktop-client/components/forms';
import { useSidebar } from '@desktop-client/components/sidebar/SidebarProvider';
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

// Follows Pikaday 'firstDay' numbering
// https://github.com/Pikaday/Pikaday
function useDaysOfWeek() {
  const { t } = useTranslation();

  const daysOfWeek: {
    value: SyncedPrefs['firstDayOfWeekIdx'];
    label: string;
  }[] = [
    { value: '0', label: t('Sunday') },
    { value: '1', label: t('Monday') },
    { value: '2', label: t('Tuesday') },
    { value: '3', label: t('Wednesday') },
    { value: '4', label: t('Thursday') },
    { value: '5', label: t('Friday') },
    { value: '6', label: t('Saturday') },
  ] as const;

  return { daysOfWeek };
}
const dateFormats: { value: SyncedPrefs['dateFormat']; label: string }[] = [
  { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY' },
  { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY' },
  { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD' },
  { value: 'MM.dd.yyyy', label: 'MM.DD.YYYY' },
  { value: 'dd.MM.yyyy', label: 'DD.MM.YYYY' },
];

export function FormatSettings() {
  const { t } = useTranslation();

  const sidebar = useSidebar();
  const [_firstDayOfWeekIdx, setFirstDayOfWeekIdxPref] =
    useSyncedPref('firstDayOfWeekIdx'); // Sunday;
  const firstDayOfWeekIdx = _firstDayOfWeekIdx || '0';
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const [, setDateFormatPref] = useSyncedPref('dateFormat');
  const [_numberFormat, setNumberFormatPref] = useSyncedPref('numberFormat');
  const numberFormat = _numberFormat || 'comma-dot';
  const [hideFraction, setHideFractionPref] = useSyncedPref('hideFraction');

  const { daysOfWeek } = useDaysOfWeek();

  const selectButtonClassName = css({
    '&[data-hovered]': {
      backgroundColor: theme.buttonNormalBackgroundHover,
    },
  });

  return (
    <Setting
      primaryAction={
        <View
          style={{
            flexDirection: 'column',
            gap: '1em',
            width: '100%',
            [`@media (min-width: ${
              sidebar.floating
                ? tokens.breakpoint_small
                : tokens.breakpoint_medium
            })`]: {
              flexDirection: 'row',
            },
          }}
        >
          <Column title={t('Numbers')}>
            <Select
              key={String(hideFraction)} // needed because label does not update
              value={numberFormat}
              onChange={format => setNumberFormatPref(format)}
              options={numberFormats.map(f => [
                f.value,
                String(hideFraction) === 'true' ? f.labelNoFraction : f.label,
              ])}
              className={selectButtonClassName}
            />

            <Text style={{ display: 'flex' }}>
              <Checkbox
                id="settings-textDecimal"
                checked={String(hideFraction) === 'true'}
                onChange={e =>
                  setHideFractionPref(String(e.currentTarget.checked))
                }
              />
              <label htmlFor="settings-textDecimal">
                <Trans>Hide decimal places</Trans>
              </label>
            </Text>
          </Column>

          <Column title={t('Dates')}>
            <Select
              value={dateFormat}
              onChange={format => setDateFormatPref(format)}
              options={dateFormats.map(f => [f.value, f.label])}
              className={selectButtonClassName}
            />
          </Column>

          <Column title={t('First day of the week')}>
            <Select
              value={firstDayOfWeekIdx}
              onChange={idx => setFirstDayOfWeekIdxPref(idx)}
              options={daysOfWeek.map(f => [f.value, f.label])}
              className={selectButtonClassName}
            />
          </Column>
        </View>
      }
    >
      <Text>
        <Trans>
          <strong>Formatting</strong> does not affect how budget data is stored,
          and can be changed at any time.
        </Trans>
      </Text>
    </Setting>
  );
}
