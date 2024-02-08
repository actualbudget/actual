// @ts-strict-ignore
import React, { type ReactNode } from 'react';

import { numberFormats } from 'loot-core/src/shared/util';
import { type LocalPrefs } from 'loot-core/src/types/prefs';

import { useDateFormat } from '../../hooks/useDateFormat';
import { useLocalPref } from '../../hooks/useLocalPref';
import { tokens } from '../../tokens';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { Checkbox } from '../forms';
import { useSidebar } from '../sidebar/SidebarProvider';

import { Setting } from './UI';

// Follows Pikaday 'firstDay' numbering
// https://github.com/Pikaday/Pikaday
const daysOfWeek: { value: LocalPrefs['firstDayOfWeekIdx']; label: string }[] =
  [
    { value: '0', label: 'Sunday' },
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' },
  ];

const dateFormats: { value: LocalPrefs['dateFormat']; label: string }[] = [
  { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY' },
  { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY' },
  { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD' },
  { value: 'MM.dd.yyyy', label: 'MM.DD.YYYY' },
  { value: 'dd.MM.yyyy', label: 'DD.MM.YYYY' },
];

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View
      style={{
        alignItems: 'flex-start',
        flexGrow: 1,
        gap: '0.5em',
        width: '100%',
      }}
    >
      <Text style={{ fontWeight: 500 }}>{title}</Text>
      <View style={{ alignItems: 'flex-start', gap: '1em' }}>{children}</View>
    </View>
  );
}

export function FormatSettings() {
  const sidebar = useSidebar();
  const [firstDayOfWeekIdx, setFirstDayOfWeekIdxPref] = useLocalPref(
    'firstDayOfWeekIdx',
    '0',
  ); // Sunday;
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const [, setDateFormatPref] = useLocalPref('dateFormat');
  const [numberFormat, setNumberFormatPref] = useLocalPref(
    'numberFormat',
    'comma-dot',
  );
  const [hideFraction, setHideFractionPref] = useLocalPref('hideFraction');

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
          <Column title="Numbers">
            <Button bounce={false} style={{ padding: 0 }}>
              <Select
                bare
                key={String(hideFraction)} // needed because label does not update
                value={numberFormat}
                onChange={format => setNumberFormatPref(format)}
                options={numberFormats.map(f => [
                  f.value,
                  hideFraction ? f.labelNoFraction : f.label,
                ])}
                style={{ padding: '2px 10px', fontSize: 15 }}
              />
            </Button>

            <Text style={{ display: 'flex' }}>
              <Checkbox
                id="settings-textDecimal"
                checked={!!hideFraction}
                onChange={e => setHideFractionPref(e.currentTarget.checked)}
              />
              <label htmlFor="settings-textDecimal">Hide decimal places</label>
            </Text>
          </Column>

          <Column title="Dates">
            <Button bounce={false} style={{ padding: 0 }}>
              <Select
                bare
                value={dateFormat}
                onChange={format => setDateFormatPref(format)}
                options={dateFormats.map(f => [f.value, f.label])}
                style={{ padding: '2px 10px', fontSize: 15 }}
              />
            </Button>
          </Column>

          <Column title="First day of the week">
            <Button bounce={false} style={{ padding: 0 }}>
              <Select
                bare
                value={firstDayOfWeekIdx}
                onChange={idx => setFirstDayOfWeekIdxPref(idx)}
                options={daysOfWeek.map(f => [f.value, f.label])}
                style={{ padding: '2px 10px', fontSize: 15 }}
              />
            </Button>
          </Column>
        </View>
      }
    >
      <Text>
        <strong>Formatting</strong> does not affect how budget data is stored,
        and can be changed at any time.
      </Text>
    </Setting>
  );
}
