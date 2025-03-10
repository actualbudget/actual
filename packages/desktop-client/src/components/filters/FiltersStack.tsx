import React from 'react';

import { Stack } from '@actual-app/components/stack';
import { View } from '@actual-app/components/view';

import {
  type TransactionFilterEntity,
  type RuleConditionEntity,
} from 'loot-core/types/models';

import { AppliedFilters } from './AppliedFilters';
import {
  type SavedFilter,
  SavedFilterMenuButton,
} from './SavedFilterMenuButton';

export function FiltersStack({
  conditions,
  conditionsOp,
  onUpdateFilter,
  onDeleteFilter,
  onClearFilters,
  onReloadSavedFilter,
  filterId,
  savedFilters,
  onConditionsOpChange,
}: {
  conditions: RuleConditionEntity[];
  conditionsOp: 'and' | 'or';
  onUpdateFilter: (
    filter: RuleConditionEntity,
    newFilter: RuleConditionEntity,
  ) => void;
  onDeleteFilter: (filter: RuleConditionEntity) => void;
  onClearFilters: () => void;
  onReloadSavedFilter: (savedFilter: SavedFilter, value?: string) => void;
  filterId?: SavedFilter;
  savedFilters: TransactionFilterEntity[];
  onConditionsOpChange: (value: 'and' | 'or') => void;
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
          conditions={conditions}
          conditionsOp={conditionsOp}
          onConditionsOpChange={onConditionsOpChange}
          onUpdate={onUpdateFilter}
          onDelete={onDeleteFilter}
        />
        <View style={{ flex: 1 }} />
        <SavedFilterMenuButton
          conditions={conditions}
          conditionsOp={conditionsOp}
          filterId={filterId}
          onClearFilters={onClearFilters}
          onReloadSavedFilter={onReloadSavedFilter}
          savedFilters={savedFilters}
        />
      </Stack>
    </View>
  );
}
