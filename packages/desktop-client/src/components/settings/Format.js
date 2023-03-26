import React from 'react';

import { numberFormats } from 'loot-core/src/shared/util';

import tokens from '../../tokens';
import { Button, CustomSelect, Text, View } from '../common';
import { Checkbox } from '../forms';

import { Setting } from './UI';

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
        gap: '0.5em',
        flexGrow: 1,
        [`@media (max-width: ${tokens.breakpoint_xs})`]: {
          width: '100%',
        },
      }}
    >
      <Text style={{ fontWeight: 500 }}>{title}</Text>
      <View style={{ alignItems: 'flex-start', gap: '1em' }}>{children}</View>
    </View>
  );
}

export default function FormatSettings({ prefs, savePrefs }) {
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

  let dateFormat = prefs.dateFormat || 'MM/dd/yyyy';
  let numberFormat = prefs.numberFormat || 'comma-dot';

  return (
    <Setting
      primaryAction={
        <View
          style={{
            flexDirection: 'row',
            gap: '1em',
            width: '100%',
            [`@media (max-width: ${tokens.breakpoint_xs})`]: {
              flexDirection: 'column',
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
                style={{ padding: '5px 10px', fontSize: 15 }}
              />
            </Button>

            <Text style={{ display: 'flex' }}>
              <Checkbox
                id="settings-textDecimal"
                checked={prefs.hideFraction}
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
                style={{ padding: '5px 10px', fontSize: 15 }}
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
