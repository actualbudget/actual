import React, { type ComponentProps } from 'react';

import { type TransactionFilterEntity } from 'loot-core/types/models';

import { useTransactionFilters } from '../../hooks/useTransactionFilters';

import { Autocomplete } from './Autocomplete';
import { FilterList } from './FilterList';

export function FilterAutocomplete({
  embedded,
  ...props
}: {
  embedded?: boolean;
} & ComponentProps<typeof Autocomplete<TransactionFilterEntity>>) {
  const filters = useTransactionFilters() || [];

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
