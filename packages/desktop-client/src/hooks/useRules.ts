import type { RuleEntity } from '@actual-app/core/types/models';
import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';

import { ruleQueries } from '#rules/queries';

type UseRulesOptions = Pick<UseQueryOptions<RuleEntity[]>, 'enabled'>;

export function useRules(options?: UseRulesOptions) {
  return useQuery({
    ...ruleQueries.list(),
    ...(options ?? {}),
  });
}
