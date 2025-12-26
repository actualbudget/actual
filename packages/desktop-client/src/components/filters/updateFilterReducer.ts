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
        // When switching to single-value operators, convert array to first element
        // or null if empty
        if (Array.isArray(value)) {
          value = value.length > 0 ? value[0] : null;
        } else {
          // Clear out the value if switching between contains or
          // is/oneof for the id or string type
          value = null;
        }
      } else if (
        (type === 'id' || type === 'string') &&
        state.field !== 'notes' &&
        (action.op === 'oneOf' || action.op === 'notOneOf')
      ) {
        // Convert single value to array when switching to oneOf/notOneOf
        if (value === null || value === undefined) {
          value = [] as T['value'];
        } else if (!Array.isArray(value)) {
          value = [value] as T['value'];
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
