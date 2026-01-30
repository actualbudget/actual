import React from 'react';

import { SpaceBetween } from '@actual-app/components/space-between';
import { View } from '@actual-app/components/view';

import type {
  RuleConditionEntity,
  TransactionFilterEntity,
} from 'loot-core/types/models';

import { AppliedFilters } from './AppliedFilters';
import { SavedFilterMenuButton } from './SavedFilterMenuButton';
import type { SavedFilter } from './SavedFilterMenuButton';

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
      <SpaceBetween
        direction="horizontal"
        gap={10}
        style={{ justifyContent: 'flex-start', alignItems: 'flex-start' }}
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
      </SpaceBetween>
    </View>
  );
}
