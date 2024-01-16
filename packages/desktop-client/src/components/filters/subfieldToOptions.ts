import { type RuleConditionEntity } from 'loot-core/src/types/models';

export function subfieldToOptions(field: string, subfield: string) {
  let setOptions: RuleConditionEntity['options'];
  switch (field) {
    case 'amount':
      switch (subfield) {
        case 'amount-inflow':
          setOptions = { ...setOptions, inflow: true };
          break;
        case 'amount-outflow':
          setOptions = { ...setOptions, outflow: true };
          break;
        default:
          break;
      }
      break;
    case 'date':
      switch (subfield) {
        case 'month':
          setOptions = { ...setOptions, month: true };
          break;
        case 'year':
          setOptions = { ...setOptions, year: true };
          break;
        default:
          break;
      }
      break;
    default:
      break;
  }
  return setOptions;
}
