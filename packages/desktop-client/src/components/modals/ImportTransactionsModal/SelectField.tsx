import React, { type CSSProperties } from 'react';

import { Select } from '@actual-app/components/select';

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
  const columns = options.map(
    option =>
      [
        option,
        hasHeaderRow
          ? option
          : `Column ${parseInt(option) + 1} (${firstTransaction[option]})`,
      ] as const,
  );

  // If selected column does not exist in transaction sheet, ignore
  if (!columns.find(col => col[0] === value)) value = null;

  return (
    <Select
      options={[['choose-field', 'Choose field...'], ...columns]}
      value={value === null ? 'choose-field' : value}
      onChange={onChange}
      style={style}
    />
  );
}
