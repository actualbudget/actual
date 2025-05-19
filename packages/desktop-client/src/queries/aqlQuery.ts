import { send } from 'loot-core/platform/client/fetch';
import { type Query } from 'loot-core/shared/query';

export async function aqlQuery(query: Query) {
  return send('query', query.serialize());
}
