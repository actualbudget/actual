import { useQuery } from '@tanstack/react-query';

import { payeeQueries } from '#payees';

export function usePayeeRuleCounts() {
  return useQuery(payeeQueries.ruleCounts());
}
