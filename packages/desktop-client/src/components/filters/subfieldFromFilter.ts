import { type RuleConditionEntity } from 'loot-core/src/types/models';

export function subfieldFromFilter({
  field,
  options,
  value,
}: Pick<RuleConditionEntity, 'field' | 'options' | 'value'>) {
  if (field === 'date') {
    if (typeof value === 'string') {
      if (value.length === 7) {
        return 'month';
      } else if (value.length === 4) {
        return 'year';
      }
    }
  }

  if (field === 'amount') {
    if (options && options.inflow) {
      return 'amount-inflow';
    } else if (options && options.outflow) {
      return 'amount-outflow';
    }
  }

  return field;
}
