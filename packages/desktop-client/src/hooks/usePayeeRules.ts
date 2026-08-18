import type { PayeeEntity } from '@actual-app/core/types/models';
import { useQuery } from '@tanstack/react-query';

import { ruleQueries } from '#rules/queries';

export function usePayeeRules({
  payeeId,
}: {
  payeeId?: PayeeEntity['id'] | null;
}) {
  return useQuery(ruleQueries.listPayee({ payeeId }));
}
