import { useQuery } from '@tanstack/react-query';

import { payeeQueries } from '@desktop-client/payees';

export function usePayeeRuleCounts() {
  return useQuery(payeeQueries.ruleCounts());
}
