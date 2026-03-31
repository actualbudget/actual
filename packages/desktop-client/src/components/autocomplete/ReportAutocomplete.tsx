import React from 'react';
import type { ComponentProps } from 'react';

import type { CustomReportEntity } from 'loot-core/types/models';

import { Autocomplete } from './Autocomplete';
import { ReportList } from './ReportList';

import { useReports } from '@desktop-client/hooks/useReports';

type ReportAutocompleteProps = {
  embedded?: boolean;
} & ComponentProps<typeof Autocomplete<CustomReportEntity>>;

export function ReportAutocomplete({
  embedded,
  ...props
}: ReportAutocompleteProps) {
  const { data: reports = [] } = useReports();

  return (
    <Autocomplete
      strict
      highlightFirst
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
