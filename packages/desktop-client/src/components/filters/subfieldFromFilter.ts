import { type RuleConditionEntity } from 'loot-core/src/types/models';

export function subfieldFromFilter({
  field,
  options,
  value,
}: RuleConditionEntity) {
  if (typeof value === 'number') {
    return field;
  } else if (value === 'string') {
    if (field === 'date') {
      if (value.length === 7) {
        return 'month';
      } else if (value.length === 4) {
        return 'year';
      }
    } else if (field === 'amount') {
      if (options && options.inflow) {
        return 'amount-inflow';
      } else if (options && options.outflow) {
        return 'amount-outflow';
      }
    }
  }
  return field;
}
