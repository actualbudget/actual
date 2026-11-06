// @ts-strict-ignore
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { theme } from '@actual-app/components/theme';
import { numberFormats } from '@actual-app/core/shared/util';
import type { SyncedPrefs } from '@actual-app/core/types/prefs';
import { css } from '@emotion/css';

import { Checkbox } from '#components/forms';
import { useDateFormat } from '#hooks/useDateFormat';
import { useDaysOfWeek } from '#hooks/useDaysOfWeek';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { saveSyncedPrefs } from '#prefs/prefsSlice';
import { useDispatch } from '#redux';

import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';

const dateFormats: { value: SyncedPrefs['dateFormat']; label: string }[] = [
  { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY' },
  { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY' },
  { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD' },
  { value: 'MM.dd.yyyy', label: 'MM.DD.YYYY' },
  { value: 'dd.MM.yyyy', label: 'DD.MM.YYYY' },
  { value: 'dd-MM-yyyy', label: 'DD-MM-YYYY' },
];

export function FormatSettings() {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const [_firstDayOfWeekIdx, setFirstDayOfWeekIdxPref] =
    useSyncedPref('firstDayOfWeekIdx'); // Sunday;
  const firstDayOfWeekIdx = _firstDayOfWeekIdx || '0';
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const [, setDateFormatPref] = useSyncedPref('dateFormat');
  const [_numberFormat] = useSyncedPref('numberFormat');
  const numberFormat = _numberFormat || 'comma-dot';
  const [hideFraction, setHideFractionPref] = useSyncedPref('hideFraction');

  const daysOfWeek = useDaysOfWeek();

  const selectButtonClassName = css({
    '&[data-hovered]': {
      backgroundColor: theme.buttonNormalBackgroundHover,
    },
  });

  return (
    <SettingsGroup
      title={t('Formatting')}
      description={
        <Trans>
          <span>Formatting</span> does not affect how budget data is stored, and
          can be changed at any time.
        </Trans>
      }
    >
      <SettingsRow
        title={t('Number format')}
        control={
          <Select
            key={String(hideFraction)} // needed because label does not update
            value={numberFormat}
            onChange={format => {
              void dispatch(
                saveSyncedPrefs({ prefs: { numberFormat: format } }),
              );
            }}
            options={numberFormats.map(f => [
              f.value,
              String(hideFraction) === 'true' ? f.labelNoFraction : f.label,
            ])}
            className={selectButtonClassName}
          />
        }
      />
      <SettingsRow
        htmlFor="settings-textDecimal"
        title={t('Hide decimal places')}
        control={
          <Checkbox
            id="settings-textDecimal"
            checked={String(hideFraction) === 'true'}
            onChange={e => setHideFractionPref(String(e.currentTarget.checked))}
            style={{ marginRight: 0 }}
          />
        }
      />
      <SettingsRow
        title={t('Date format')}
        control={
          <Select
            value={dateFormat}
            onChange={format => setDateFormatPref(format)}
            options={dateFormats.map(f => [f.value, f.label])}
            className={selectButtonClassName}
          />
        }
      />
      <SettingsRow
        title={t('First day of the week')}
        control={
          <Select
            value={firstDayOfWeekIdx}
            onChange={idx => setFirstDayOfWeekIdxPref(idx)}
            options={Object.entries(daysOfWeek)}
            className={selectButtonClassName}
          />
        }
      />
    </SettingsGroup>
  );
}
