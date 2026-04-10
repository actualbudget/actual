import * as connection from '@actual-app/core/platform/client/connection';
import { q } from '@actual-app/core/shared/query';

import { aqlQuery } from './aqlQuery';

describe('aqlQuery', () => {
  it('runs an AQL query', async () => {
    vi.spyOn(connection, 'send').mockImplementation((name, args) => {
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
