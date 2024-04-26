import React from 'react';

import { type RuleConditionEntity } from 'loot-core/types/models/rule';

import { Stack } from '../common/Stack';
import { View } from '../common/View';

import { AppliedFilters } from './AppliedFilters';
import {
  type SavedFilter,
  SavedFilterMenuButton,
} from './SavedFilterMenuButton';

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
}: {
  filters: RuleConditionEntity[];
  conditionsOp: string;
  onUpdateFilter: (
    filter: RuleConditionEntity,
    newFilter: RuleConditionEntity,
  ) => void;
  onDeleteFilter: (filter: RuleConditionEntity) => void;
  onClearFilters: () => void;
  onReloadSavedFilter: (savedFilter: SavedFilter, value?: string) => void;
  filterId: SavedFilter;
  filtersList: RuleConditionEntity[];
  onCondOpChange: () => void;
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
