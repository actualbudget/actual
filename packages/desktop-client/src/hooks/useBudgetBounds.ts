import { useQuery } from '@tanstack/react-query';

import { budgetBoundsQueries } from '#budget';

export function useBudgetBounds() {
  return useQuery(budgetBoundsQueries.bounds());
}
