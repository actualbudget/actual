import React from 'react';

import { numberFormats } from 'loot-core/src/shared/util';

import tokens from '../../tokens';
import { Button, CustomSelect, Text, View } from '../common';
import { useSidebar } from '../FloatableSidebar';
import { Checkbox } from '../forms';

import { Setting } from './UI';

// Follows Pikaday 'firstDay' numbering
// https://github.com/Pikaday/Pikaday
let daysOfWeek = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

let dateFormats = [
  { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY' },
  { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY' },
  { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD' },
  { value: 'MM.dd.yyyy', label: 'MM.DD.YYYY' },
  { value: 'dd.MM.yyyy', label: 'DD.MM.YYYY' },
];

function Column({ title, children }) {
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

export default function FormatSettings({ prefs, savePrefs }) {
  function onFirstDayOfWeek(idx) {
    savePrefs({ firstDayOfWeekIdx: idx });
  }

  function onDateFormat(format) {
    savePrefs({ dateFormat: format });
  }

  function onNumberFormat(format) {
    savePrefs({ numberFormat: format });
  }

  function onHideFraction(e) {
    let hideFraction = e.target.checked;
    savePrefs({ hideFraction });
  }

  let sidebar = useSidebar();
  let firstDayOfWeekIdx = prefs.firstDayOfWeekIdx || '0'; // Sunday
  let dateFormat = prefs.dateFormat || 'MM/dd/yyyy';
  let numberFormat = prefs.numberFormat || 'comma-dot';

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
              <CustomSelect
                key={prefs.hideFraction} // needed because label does not update
                value={numberFormat}
                onChange={onNumberFormat}
                options={numberFormats.map(f => [
                  f.value,
                  prefs.hideFraction ? f.labelNoFraction : f.label,
                ])}
                style={{ padding: '2px 10px', fontSize: 15 }}
              />
            </Button>

            <Text style={{ display: 'flex' }}>
              <Checkbox
                id="settings-textDecimal"
                checked={!!prefs.hideFraction}
                onChange={onHideFraction}
              />
              <label htmlFor="settings-textDecimal">Hide decimal places</label>
            </Text>
          </Column>

          <Column title="Dates">
            <Button bounce={false} style={{ padding: 0 }}>
              <CustomSelect
                value={dateFormat}
                onChange={onDateFormat}
                options={dateFormats.map(f => [f.value, f.label])}
                style={{ padding: '2px 10px', fontSize: 15 }}
              />
            </Button>
          </Column>

          <Column title="First day of the week">
            <Button bounce={false} style={{ padding: 0 }}>
              <CustomSelect
                value={firstDayOfWeekIdx}
                onChange={onFirstDayOfWeek}
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
