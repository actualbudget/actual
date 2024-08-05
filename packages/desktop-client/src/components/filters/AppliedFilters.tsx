import React from 'react';

import { type RuleConditionEntity } from 'loot-core/src/types/models';

import { View } from '../common/View';

import { ConditionsOpMenu } from './ConditionsOpMenu';
import { FilterExpression } from './FilterExpression';

type AppliedFiltersProps = {
  conditions: RuleConditionEntity[];
  onUpdate: (
    filter: RuleConditionEntity,
    newFilter: RuleConditionEntity,
  ) => void;
  onDelete: (filter: RuleConditionEntity) => void;
  conditionsOp: string;
  onConditionsOpChange: (value: 'and' | 'or') => void;
};

export function AppliedFilters({
  conditions,
  onUpdate,
  onDelete,
  conditionsOp,
  onConditionsOpChange,
}: AppliedFiltersProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
      }}
    >
      <ConditionsOpMenu
        conditionsOp={conditionsOp}
        onChange={onConditionsOpChange}
        conditions={conditions}
      />
      {conditions.map((filter: RuleConditionEntity, i: number) => (
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
