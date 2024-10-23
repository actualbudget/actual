import React, { type CSSProperties } from 'react';

import { Select } from '../../common/Select';

type SelectFieldProps = {
  style?: CSSProperties;
  options: string[];
  value: null | string;
  onChange: (newValue: string) => void;
  hasHeaderRow: boolean;
  firstTransaction: Record<string, unknown>;
};

export function SelectField({
  style,
  options,
  value,
  onChange,
  hasHeaderRow,
  firstTransaction,
}: SelectFieldProps) {
  return (
    <Select
      options={[
        ['choose-field', 'Choose field...'],
        ...options.map(
          option =>
            [
              option,
              hasHeaderRow
                ? option
                : `Column ${parseInt(option) + 1} (${firstTransaction[option]})`,
            ] as const,
        ),
      ]}
      value={value === null ? 'choose-field' : value}
      onChange={onChange}
      style={style}
    />
  );
}
