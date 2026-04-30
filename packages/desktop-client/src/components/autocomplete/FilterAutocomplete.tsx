import React from 'react';
import type { ComponentProps } from 'react';

import type { TransactionFilterEntity } from '@actual-app/core/types/models';

import { useTransactionFilters } from '#hooks/useTransactionFilters';

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
