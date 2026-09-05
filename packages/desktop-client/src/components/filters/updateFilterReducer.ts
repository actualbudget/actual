import { FIELD_TYPES, makeValue } from '@actual-app/core/shared/rules';
import type { RuleConditionEntity } from '@actual-app/core/types/models';

import {
  normalizeAmountRange,
  normalizeDateRange,
} from '#components/util/betweenRange';

// Deliberately looser than a complete range: a half-formed `{ num1 }` still
// has to be unwrapped when the op moves away from `isbetween`
function isRangeLike(
  value: unknown,
): value is { num1?: unknown; num2?: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('num1' in value || 'num2' in value)
  );
}

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

      // `isbetween` holds a pair of bounds instead of a single value, so the
      // value has to be converted whenever the op moves in or out of it
      if (type === 'date' || type === 'number') {
        if (action.op === 'isbetween') {
          // New filters start out with an empty value, and a stored one can
          // arrive with only a single bound
          value = (
            type === 'date'
              ? normalizeDateRange(value)
              : normalizeAmountRange(value)
          ) as T['value'];
        } else if (isRangeLike(value)) {
          // Normalizing first keeps the bound a half-formed range does have,
          // rather than dropping straight to the empty default
          value = (
            type === 'date'
              ? normalizeDateRange(value)
              : normalizeAmountRange(value)
          ).num1 as T['value'];
        }

        return { ...state, op: action.op, value };
      }

      if (
        (type === 'id' || type === 'string') &&
        state.field !== 'notes' &&
        (action.op === 'contains' ||
          action.op === 'matches' ||
          action.op === 'is' ||
          action.op === 'doesNotContain' ||
          action.op === 'isNot' ||
          action.op === 'hasTags' ||
          action.op === 'hasAnyTag' ||
          action.op === 'onBudget' ||
          action.op === 'offBudget')
      ) {
        // When switching to single-value operators, convert array to first element
        if (Array.isArray(value)) {
          value = value.length > 0 ? value[0] : null;
        }
      } else if (
        (type === 'id' || type === 'string') &&
        state.field !== 'notes' &&
        (action.op === 'oneOf' || action.op === 'notOneOf')
      ) {
        // Convert single value to array when switching to oneOf/notOneOf
        if (value === null || value === undefined) {
          value = [];
        } else if (!Array.isArray(value)) {
          // @ts-expect-error - fix me
          value = [value];
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
