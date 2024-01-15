import { makeValue, FIELD_TYPES } from 'loot-core/src/shared/rules';

export function updateFilterReducer(state: any, action: any) {
  switch (action.type) {
    case 'set-op': {
      const type = FIELD_TYPES.get(state.field);
      let value = state.value;
      if (
        (type === 'id' || type === 'string') &&
        (action.op === 'contains' ||
          action.op === 'is' ||
          action.op === 'doesNotContain' ||
          action.op === 'isNot')
      ) {
        // Clear out the value if switching between contains or
        // is/oneof for the id or string type
        value = null;
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
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}
