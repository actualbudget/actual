import React from 'react';

import { Select } from '../../common/Select';
import { View } from '../../common/View';
import { SectionLabel } from '../../forms';

import {
  dateFormats,
  type ImportTransaction,
  type FieldMapping,
} from './utils';

type DateFormatSelectProps = {
  transactions: ImportTransaction[];
  fieldMappings: FieldMapping;
  parseDateFormat?: string;
  onChange: (newValue: string) => void;
};

export function DateFormatSelect({
  transactions,
  fieldMappings,
  parseDateFormat,
  onChange,
}: DateFormatSelectProps) {
  // We don't actually care about the delimiter, but we try to render
  // it based on the data we have so far. Look in a transaction and
  // try to figure out what delimiter the date is using, and default
  // to space if we can't figure it out.
  let delimiter = '-';
  if (transactions.length > 0 && fieldMappings && fieldMappings.date != null) {
    const date = transactions[0][fieldMappings.date];
    const m = date && date.match(/[/.,-/\\]/);
    delimiter = m ? m[0] : ' ';
  }

  return (
    <View style={{ width: 120 }}>
      <SectionLabel title="Date format" />
      <Select
        options={dateFormats.map(f => [
          f.format,
          f.label.replace(/ /g, delimiter),
        ])}
        value={parseDateFormat || ''}
        onChange={onChange}
      />
    </View>
  );
}
