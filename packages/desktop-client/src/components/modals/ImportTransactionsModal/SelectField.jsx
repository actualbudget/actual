import React from 'react';

import { Select } from '../../common/Select';

export function SelectField({
  style,
  options,
  value,
  onChange,
  hasHeaderRow,
  firstTransaction,
}) {
  return (
    <Select
      options={[
        ['choose-field', 'Choose field...'],
        ...options.map(option => [
          option,
          hasHeaderRow
            ? option
            : `Column ${parseInt(option) + 1} (${firstTransaction[option]})`,
        ]),
      ]}
      value={value === null ? 'choose-field' : value}
      onChange={onChange}
      style={style}
    />
  );
}
