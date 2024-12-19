import React from 'react';

import { type TransactionFilterEntity } from 'loot-core/types/models';
import { type RuleConditionEntity } from 'loot-core/types/models/rule';

import { Stack } from '../common/Stack';
import { View } from '../common/View';

import { AppliedFilters } from './AppliedFilters';
import { SavedFilterMenuButton } from './SavedFilterMenuButton';

type FiltersStackProps = {
  conditions: readonly RuleConditionEntity[];
  conditionsOp: RuleConditionEntity['conditionsOp'];
  onUpdateFilter: (
    filterCondition: RuleConditionEntity,
    newFilterCondition: RuleConditionEntity,
  ) => void;
  onDeleteFilter: (filterCondition: RuleConditionEntity) => void;
  onClearFilters: () => void;
  onReloadSavedFilter: (
    savedFilter: TransactionFilterEntity,
    action?: 'reload' | 'update',
  ) => void;
  filter?: TransactionFilterEntity;
  dirtyFilter?: TransactionFilterEntity;
  onConditionsOpChange: (
    conditionsOp: RuleConditionEntity['conditionsOp'],
  ) => void;
};

export function FiltersStack({
  conditions,
  conditionsOp,
  onUpdateFilter,
  onDeleteFilter,
  onClearFilters,
  onReloadSavedFilter,
  filter,
  dirtyFilter,
  onConditionsOpChange,
}: FiltersStackProps) {
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
          filter={filter}
          dirtyFilter={dirtyFilter}
          onClearFilters={onClearFilters}
          onReloadSavedFilter={onReloadSavedFilter}
        />
      </Stack>
    </View>
  );
}
