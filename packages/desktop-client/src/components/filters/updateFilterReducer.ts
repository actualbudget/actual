import { makeValue, FIELD_TYPES } from 'loot-core/shared/rules';
import { type RuleConditionEntity } from 'loot-core/types/models';

export function updateFilterReducer<T extends RuleConditionEntity>(
  state: Pick<T, 'op' | 'field'> & { value: T['value'] | null },
  action:
    | { type: 'set-op'; op: T['op'] }
    | { type: 'set-value'; value: T['value'] },
) {
  switch (action.type) {
    case 'set-op': {
      const type = FIELD_TYPES.get(state.field);
      let value = state.value;
      if (
        (type === 'id' || type === 'string') &&
        state.field !== 'notes' &&
        (action.op === 'contains' ||
          action.op === 'matches' ||
          action.op === 'is' ||
          action.op === 'doesNotContain' ||
          action.op === 'isNot' ||
          action.op === 'hasTags' ||
          action.op === 'onBudget' ||
          action.op === 'offBudget')
      ) {
        // Clear out the value if switching between contains or
        // is/oneof for the id or string type
        value = null;
      }

      if(action.op === 'oneOf' || action.op === 'notOneOf') {
        // Ensure value is an array for multi-select ops
        if (!Array.isArray(value)) {
          const fixedValue = value !== null ? [value] : [];
          return { ...state, op: action.op, value: fixedValue };
        }
      }

      return { ...state, op: action.op, value };
    }
    case 'set-value': {
      const { value } = makeValue(action.value, {
        type: FIELD_TYPES.get(state.field),
      });
      return { ...state, value };
    }
    default:
      // @ts-expect-error - fix me
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}
