import { getForNextMonthCoverable } from '@actual-app/core/shared/future-buffer';
import type { IntegerAmount } from '@actual-app/core/shared/util';
import type { CategoryEntity } from '@actual-app/core/types/models';

import { useSheetValue } from '#hooks/useSheetValue';
import { envelopeBudget } from '#spreadsheet/bindings';

// How much of the current sheet's "For next month" can cover this
// category's overspending. 0 when there's no category to cover.
export function useForNextMonthCoverable(
  categoryId: CategoryEntity['id'] | undefined,
): IntegerAmount {
  const managed = useSheetValue<'envelope-budget', 'buffered-managed'>(
    envelopeBudget.managed,
  );
  const forNextMonth = useSheetValue<'envelope-budget', 'buffered-selected'>(
    envelopeBudget.forNextMonth,
  );
  const balance = useSheetValue<'envelope-budget', 'leftover'>(
    envelopeBudget.catBalance(categoryId ?? ''),
  );
  const carryover = useSheetValue<'envelope-budget', 'carryover'>(
    envelopeBudget.catCarryover(categoryId ?? ''),
  );

  if (!categoryId) {
    return 0;
  }
  return getForNextMonthCoverable({
    managed: managed === true,
    forNextMonth: forNextMonth ?? 0,
    balance: balance ?? 0,
    carryover: Boolean(carryover),
  });
}
