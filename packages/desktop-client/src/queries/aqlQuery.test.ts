import { initServer } from 'loot-core/platform/client/fetch';
import { q } from 'loot-core/shared/query';

import { aqlQuery } from './aqlQuery';

describe('aqlQuery', () => {
  it('runs an AQL query', async () => {
    initServer({
      query: query => Promise.resolve({ data: query, dependencies: [] }),
    });

    const query = q('transactions').select('*');
    const { data } = await aqlQuery(query);
    expect(data).toEqual(query.serialize());
  });
});
