import React, { type ComponentProps } from 'react';

import { type CustomReportEntity } from 'loot-core-shared/types/models/reports';

import { useReports } from 'loot-core/client/data-hooks/reports';

import { Autocomplete } from './Autocomplete';
import { ReportList } from './ReportList';

type ReportAutocompleteProps = {
  embedded?: boolean;
} & ComponentProps<typeof Autocomplete<CustomReportEntity>>;

export function ReportAutocomplete({
  embedded,
  ...props
}: ReportAutocompleteProps) {
  const { data: reports } = useReports();

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
