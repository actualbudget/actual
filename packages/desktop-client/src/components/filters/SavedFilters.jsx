import React from 'react';

import { Stack } from '../common/Stack';
import { View } from '../common/View';

import { AppliedFilters } from './FiltersMenu';
import { SavedFilterMenuButton } from './SavedFilterMenuButton';

export function FiltersStack({
  filters,
  conditionsOp,
  onUpdateFilter,
  onDeleteFilter,
  onClearFilters,
  onReloadSavedFilter,
  filterId,
  filtersList,
  onCondOpChange,
}) {
  return (
    <View>
      <Stack
        spacing={2}
        direction="row"
        justify="flex-start"
        align="flex-start"
      >
        <AppliedFilters
          filters={filters}
          conditionsOp={conditionsOp}
          onCondOpChange={onCondOpChange}
          onUpdate={onUpdateFilter}
          onDelete={onDeleteFilter}
        />
        <View style={{ flex: 1 }} />
        <SavedFilterMenuButton
          filters={filters}
          conditionsOp={conditionsOp}
          filterId={filterId}
          onClearFilters={onClearFilters}
          onReloadSavedFilter={onReloadSavedFilter}
          filtersList={filtersList}
        />
      </Stack>
    </View>
  );
}
