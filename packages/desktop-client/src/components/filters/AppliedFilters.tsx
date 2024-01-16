import React from 'react';

import { View } from '../common/View';

import { FilterExpression } from './FilterExpression';
import { CondOpMenu } from './SavedFilters';

export type Filter = {
  type: string;
  field: string;
  op: string;
  value: string | number;
  options: { inflow: boolean; outflow: boolean; month?: string; year?: string };
  customName?: string;
};

type AppliedFiltersProps = {
  filters: Filter[];
  onUpdate: (filter: Filter, newFilter: Filter) => void;
  onDelete: (filter: Filter) => void;
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
      {filters.map((filter: Filter, i: number) => (
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
