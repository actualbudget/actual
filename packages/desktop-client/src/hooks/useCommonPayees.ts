import { useQuery } from '@tanstack/react-query';

import { payeeQueries } from '@desktop-client/payees';

export function useCommonPayees() {
  return useQuery(payeeQueries.listCommon());
}
