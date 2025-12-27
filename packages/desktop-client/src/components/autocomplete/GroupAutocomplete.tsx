import React, { type ComponentProps } from 'react';

import { type CategoryGroupEntity } from 'loot-core/types/models';

import { Autocomplete } from './Autocomplete';
import { GroupList } from './GroupList';

import { useCategories } from '@desktop-client/hooks/useCategories';

export function GroupAutocomplete({
  embedded,
  ...props
}: {
  embedded?: boolean;
} & ComponentProps<typeof Autocomplete<CategoryGroupEntity>>) {
  const filters = useCategories().grouped || [];
  return (
    <Autocomplete
      strict
      highlightFirst
      embedded={embedded}
      suggestions={filters}
      renderItems={(items, getItemProps, highlightedIndex) => (
        <GroupList
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
