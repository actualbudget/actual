import * as connection from 'loot-core/platform/client/connection';
import { q } from 'loot-core/shared/query';

import { aqlQuery, AqlQueryError } from './aqlQuery';

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

  it('throws AqlQueryError when result contains error', async () => {
    vi.spyOn(connection, 'send').mockImplementation(name => {
      if (name === 'query') {
        return Promise.resolve({
          data: [],
          dependencies: [],
          error: {
            type: 'compile-error',
            message: 'Unknown table: foo',
          },
        });
      }
      return Promise.reject(new Error(`Unknown command: ${name}`));
    });

    const query = q('foo').select('*');
    await expect(aqlQuery(query)).rejects.toThrow(AqlQueryError);

    try {
      await aqlQuery(query);
    } catch (e) {
      expect(e).toBeInstanceOf(AqlQueryError);
      expect((e as AqlQueryError).detail.type).toBe('compile-error');
      expect((e as AqlQueryError).detail.message).toBe('Unknown table: foo');
    }
  });

  it('returns columns when present in result', async () => {
    vi.spyOn(connection, 'send').mockImplementation(name => {
      if (name === 'query') {
        return Promise.resolve({
          data: [{ amount: 100 }],
          dependencies: [],
          columns: [{ name: 'amount', type: 'integer' }],
        });
      }
      return Promise.reject(new Error(`Unknown command: ${name}`));
    });

    const query = q('transactions').calculate({ $sum: '$amount' });
    const result = await aqlQuery(query);
    expect(result.columns).toEqual([{ name: 'amount', type: 'integer' }]);
  });
});
