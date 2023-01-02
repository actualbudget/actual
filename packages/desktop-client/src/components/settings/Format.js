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
        <label for="settings-numberFormat">Number format: </label>
        <select
          id="settings-numberFormat"
          {...css({ marginLeft: 5, fontSize: 14 })}
          onChange={onNumberFormat}
        >
          {numberFormats.map(f => (
            <option value={f.value} selected={f.value === numberFormat}>
              {f.label}
            </option>
          ))}
        </select>
      </Text>

      <Text>
        <label for="settings-dateFormat">Date format: </label>
        <select
          id="settings-dateFormat"
          {...css({ marginLeft: 5, fontSize: 14 })}
          onChange={onDateFormat}
        >
          {dateFormats.map(f => (
            <option value={f.value} selected={f.value === dateFormat}>
              {f.label}
            </option>
          ))}
        </select>
      </Text>
    </Section>
  );
}
