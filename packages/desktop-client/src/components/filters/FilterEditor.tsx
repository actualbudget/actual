import React, { useReducer } from 'react';

import { unparse, FIELD_TYPES } from 'loot-core/src/shared/rules';
import { type RuleConditionEntity } from 'loot-core/src/types/models';

import { type Filter } from './AppliedFilters';
import { ConfigureField } from './ConfigureField';
import { subfieldFromFilter } from './subfieldFromFilter';
import { updateFilterReducer } from './updateFilterReducer';

type FilterEditorProps = {
  field: string;
  op: string;
  value: string | number;
  options: { inflow: boolean; outflow: boolean };
  onSave: (cond: RuleConditionEntity) => Filter;
  onClose: () => void;
};

export function FilterEditor({
  field,
  op,
  value,
  options,
  onSave,
  onClose,
}: FilterEditorProps) {
  const [state, dispatch] = useReducer(
    (state: any, action: RuleConditionEntity) => {
      switch (action.type) {
        case 'close':
          onClose();
          return state;
        default:
          return updateFilterReducer(state, action);
      }
    },
    { field, op, value, options },
  );

  return (
    <ConfigureField
      field={state.field}
      initialSubfield={subfieldFromFilter({ field, options, value })}
      op={state.op}
      value={state.value}
      dispatch={dispatch}
      onApply={(cond: RuleConditionEntity) => {
        const saveItem: RuleConditionEntity = {
          ...cond,
          type: FIELD_TYPES.get(cond.field),
        };
        cond = unparse({ item: saveItem });
        onSave(cond);
        onClose();
      }}
    />
  );
}
