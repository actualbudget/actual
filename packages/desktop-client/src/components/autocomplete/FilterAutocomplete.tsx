import React from 'react';
import type { ComponentProps } from 'react';

import type { TransactionFilterEntity } from 'loot-core/types/models';

import { Autocomplete } from './Autocomplete';
import { FilterList } from './FilterList';

import { useTransactionFilters } from '@desktop-client/hooks/useTransactionFilters';

export function FilterAutocomplete({
  embedded,
  ...props
}: {
  embedded?: boolean;
} & ComponentProps<typeof Autocomplete<TransactionFilterEntity>>) {
  const filters = useTransactionFilters() || [];

  return (
    <Autocomplete
      strict
      highlightFirst
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
