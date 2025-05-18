import * as fetch from 'loot-core/platform/client/fetch';
import { q } from 'loot-core/shared/query';

import { aqlQuery } from './aqlQuery';

describe('aqlQuery', () => {
  it('runs an AQL query', async () => {
    vi.spyOn(fetch, 'send').mockImplementation((name, args) => {
      if (name === 'query') {
        return Promise.resolve({ data: args, dependencies: [] });
      }
      return Promise.reject(new Error(`Unknown command: ${name}`));
    });

    const query = q('transactions').select('*');
    const { data } = await aqlQuery(query);
    expect(data).toEqual(query.serialize());
  });
});
