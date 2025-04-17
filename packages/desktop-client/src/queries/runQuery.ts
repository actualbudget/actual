import { send } from 'loot-core/platform/client/fetch';
import { type Query } from 'loot-core/shared/query';

export async function runQuery(query: Query) {
  return send('query', query.serialize());
}
