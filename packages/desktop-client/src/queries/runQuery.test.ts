import { initServer, clearServer } from 'loot-core/platform/client/fetch';
import { q } from 'loot-core/shared/query';

import { runQuery } from './runQuery';

describe('runQuery', () => {
  beforeEach(() => {
    clearServer();
  });

  it('runs a query', async () => {
    initServer({
      query: query => Promise.resolve({ data: query, dependencies: [] }),
    });

    const query = q('transactions').select('*');
    const { data } = await runQuery(query);
    expect(data).toEqual(query.serialize());
  });
});
