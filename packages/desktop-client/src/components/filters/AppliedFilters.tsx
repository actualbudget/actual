import React from 'react';

import { type RuleConditionEntity } from 'loot-core/src/types/models';

import { View } from '../common/View';

import { FilterExpression } from './FilterExpression';
import { CondOpMenu } from './SavedFilters';

type AppliedFiltersProps = {
  filters: RuleConditionEntity[];
  onUpdate: (
    filter: RuleConditionEntity,
    newFilter: RuleConditionEntity,
  ) => RuleConditionEntity;
  onDelete: (filter: RuleConditionEntity) => void;
  conditionsOp: string;
  onCondOpChange: () => void;
};

export function AppliedFilters({
  filters,
  onUpdate,
  onDelete,
  conditionsOp,
  onCondOpChange,
}: AppliedFiltersProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
      }}
    >
      <CondOpMenu
        conditionsOp={conditionsOp}
        onCondOpChange={onCondOpChange}
        filters={filters}
      />
      {filters.map((filter: RuleConditionEntity, i: number) => (
        <FilterExpression
          key={i}
          customName={filter.customName}
          field={filter.field}
          op={filter.op}
          value={filter.value}
          options={filter.options}
          onChange={newFilter => onUpdate(filter, newFilter)}
          onDelete={() => onDelete(filter)}
        />
      ))}
    </View>
  );
}
