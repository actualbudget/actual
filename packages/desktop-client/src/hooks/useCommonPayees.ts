import { useQuery } from '@tanstack/react-query';

import { payeeQueries } from '#payees';

export function useCommonPayees() {
  return useQuery(payeeQueries.listCommon());
}
