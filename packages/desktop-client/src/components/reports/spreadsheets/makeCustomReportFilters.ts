import { send } from '@actual-app/core/platform/client/connection';
import type { RuleConditionEntity } from '@actual-app/core/types/models';

// The category checkboxes save a "category is one of" condition, which never
// matches transactions without a category. Keep those transactions here and
// let the "show uncategorized" and "show off budget" options decide.
export async function makeCustomReportFilters(
  conditions: RuleConditionEntity[],
) {
  const queryConditions = conditions.filter(cond => !cond.customName);
  const isCategoryOneOf = (cond: RuleConditionEntity) =>
    cond.field === 'category' && cond.op === 'oneOf';

  const [{ filters }, { filters: categoryFilters }] = await Promise.all([
    send('make-filters-from-conditions', {
      conditions: queryConditions.filter(cond => !isCategoryOneOf(cond)),
    }),
    send('make-filters-from-conditions', {
      conditions: queryConditions.filter(isCategoryOneOf),
    }),
  ]);

  return [
    ...filters,
    ...categoryFilters.map(filter => ({ $or: [filter, { category: null }] })),
  ];
}
