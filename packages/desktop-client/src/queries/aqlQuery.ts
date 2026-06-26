import { send } from 'loot-core/platform/client/connection';
import type { Query } from 'loot-core/shared/query';
import type { AqlErrorDetail, AqlQueryResult } from 'loot-core/types/aql';

export class AqlQueryError extends Error {
  detail: AqlErrorDetail;
  constructor(detail: AqlErrorDetail) {
    super(detail.message);
    this.name = 'AqlQueryError';
    this.detail = detail;
  }
}

export async function aqlQuery(query: Query): Promise<AqlQueryResult> {
  const result = await send('query', query.serialize());
  if (result.error) {
    throw new AqlQueryError(result.error);
  }
  return result;
}
