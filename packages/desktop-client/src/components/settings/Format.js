import React from 'react';

import { css } from 'glamor';

import { numberFormats } from 'loot-core/src/shared/util';
import { Text } from 'loot-design/src/components/common';

import { Section } from './UI';

let dateFormats = [
  { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY' },
  { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY' },
  { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD' },
  { value: 'MM.dd.yyyy', label: 'MM.DD.YYYY' },
  { value: 'dd.MM.yyyy', label: 'DD.MM.YYYY' }
];

export default function FormatSettings({ prefs, savePrefs }) {
  function onDateFormat(e) {
    let format = e.target.value;
    savePrefs({ dateFormat: format });
  }

  function onNumberFormat(e) {
    let format = e.target.value;
    savePrefs({ numberFormat: format });
  }

  let dateFormat = prefs.dateFormat || 'MM/dd/yyyy';
  let numberFormat = prefs.numberFormat || 'comma-dot';

  return (
    <Section title="Formatting">
      <Text>
        <label htmlFor="settings-numberFormat">Number format: </label>
        <select
          defaultValue={numberFormat}
          id="settings-numberFormat"
          {...css({ marginLeft: 5, fontSize: 14 })}
          onChange={onNumberFormat}
        >
          {numberFormats.map(f => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </Text>

      <Text>
        <label htmlFor="settings-dateFormat">Date format: </label>
        <select
          defaultValue={dateFormat}
          id="settings-dateFormat"
          {...css({ marginLeft: 5, fontSize: 14 })}
          onChange={onDateFormat}
        >
          {dateFormats.map(f => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </Text>
    </Section>
  );
}
