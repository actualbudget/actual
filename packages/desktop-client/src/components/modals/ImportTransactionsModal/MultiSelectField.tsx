import React, { type CSSProperties } from 'react';

import { MultiSelect } from '@actual-app/components/multi-select';

type MultiSelectFieldProps = {
  style?: CSSProperties;
  options: string[];
  value: string[];
  onChange: (newValue: string[]) => void;
  hasHeaderRow: boolean;
  firstTransaction: Record<string, unknown>;
};

export function MultiSelectField({
  style,
  options,
  value,
  onChange,
  hasHeaderRow,
  firstTransaction,
}: MultiSelectFieldProps) {
  const columns = options.map(
    option =>
      [
        option,
        hasHeaderRow
          ? option
          : `Column ${parseInt(option) + 1} (${firstTransaction[option]})`,
      ] as const,
  );

  // Filter out any selected columns that don't exist in the transaction sheet
  const validValue = value.filter(v => columns.find(col => col[0] === v));

  return (
    <MultiSelect
      options={columns}
      value={validValue}
      onChange={onChange}
      defaultLabel="Choose field(s)..."
      style={style}
    />
  );
}
