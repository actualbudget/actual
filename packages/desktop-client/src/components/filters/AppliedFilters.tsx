import React from 'react';

import { type RuleConditionEntity } from 'loot-core/src/types/models';

import { View } from '../common/View';

import { CondOpMenu } from './CondOpMenu';
import { FilterExpression } from './FilterExpression';

type AppliedFiltersProps = {
  filters: RuleConditionEntity[];
  onUpdate: (
    filter: RuleConditionEntity,
    newFilter: RuleConditionEntity,
  ) => void;
  onDelete: (filter: RuleConditionEntity) => void;
  conditionsOp: string;
  onCondOpChange: (value: string, filters: RuleConditionEntity[]) => void;
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
