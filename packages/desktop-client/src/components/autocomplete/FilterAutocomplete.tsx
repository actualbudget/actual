import React, { type ComponentProps } from 'react';

import { useFilters } from 'loot-core/src/client/data-hooks/filters';
import { TransactionFilterEntity } from 'loot-core/types/models/transaction-filter';

import { Autocomplete } from './Autocomplete';
import { FilterList } from './FilterList';

export function FilterAutocomplete({
  embedded,
  ...props
}: {
  embedded?: boolean;
} & ComponentProps<typeof Autocomplete<TransactionFilterEntity>>) {
  const filters = useFilters() || [];

  return (
    <Autocomplete
      strict={true}
      highlightFirst={true}
      embedded={embedded}
      suggestions={filters}
      renderItems={(items, getItemProps, highlightedIndex) => (
        <FilterList
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
