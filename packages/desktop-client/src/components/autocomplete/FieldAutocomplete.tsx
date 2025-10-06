import React, { type CSSProperties, useMemo } from 'react';

import { Autocomplete, type AutocompleteItem } from './Autocomplete';

type FieldAutocompleteProps = {
  style?: CSSProperties;
  options: string[];
  value: string[];
  onChange: (newValue: string[]) => void;
  hasHeaderRow: boolean;
  firstTransaction: Record<string, unknown>;
};

type FieldOption = AutocompleteItem & {
  id: string;
  name: string;
};

export function FieldAutocomplete({
  style,
  options,
  value,
  onChange,
  hasHeaderRow,
  firstTransaction,
}: FieldAutocompleteProps) {
  // Convert options to AutocompleteItem format
  const suggestions: FieldOption[] = useMemo(
    () =>
      options.map(option => ({
        id: option,
        name: hasHeaderRow
          ? option
          : `Column ${parseInt(option) + 1} (${firstTransaction[option]})`,
      })),
    [options, hasHeaderRow, firstTransaction],
  );

  // Filter out any selected columns that don't exist in the transaction sheet
  const validValue = useMemo(
    () => value.filter(v => suggestions.find(sug => sug.id === v)),
    [value, suggestions],
  );

  return (
    <Autocomplete
      type="multi"
      strict={true}
      suggestions={suggestions}
      value={validValue}
      onSelect={onChange}
      inputProps={{
        placeholder: 'Choose field(s)...',
        style,
      }}
    />
  );
}
