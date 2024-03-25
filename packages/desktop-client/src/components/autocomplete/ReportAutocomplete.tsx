import React, { type ComponentProps } from 'react';

import { useReports } from 'loot-core/client/data-hooks/reports';
import { type CustomReportEntity } from 'loot-core/src/types/models/reports';

import { Autocomplete } from './Autocomplete';
import { ReportList } from './ReportList';

type ReportAutocompleteProps = {
  embedded?: boolean;
} & ComponentProps<typeof Autocomplete<CustomReportEntity>>;

export function ReportAutocomplete({
  embedded,
  ...props
}: ReportAutocompleteProps) {
  const reports = useReports() || [];

  return (
    <Autocomplete
      strict={true}
      highlightFirst={true}
      embedded={embedded}
      suggestions={reports}
      renderItems={(items, getItemProps, highlightedIndex) => (
        <ReportList
          items={items}
          getItemProps={getItemProps}
          highlightedIndex={highlightedIndex}
          embedded={embedded}
        />
      )}
      {...props}
    />
  );
}
