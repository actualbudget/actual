import {
  clearServer,
  initServer,
} from '@actual-app/core/platform/client/connection';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildFilteredTransactionsQuery } from './useFormulaExecution';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

describe('buildFilteredTransactionsQuery', () => {
  beforeEach(() => {
    initServer({
      'make-filters-from-conditions': async () => ({ filters: [] }),
    });
  });

  afterEach(async () => {
    await clearServer();
  });

  it('applies default bounds for partial static query timeframes', async () => {
    const query = await buildFilteredTransactionsQuery({
      timeFrame: {
        mode: 'static',
        start: '2016-10',
      },
    });

    expect(query.serialize().filterExpressions).toEqual([
      {
        $and: [
          { date: { $gte: '2016-10-01' } },
          { date: { $lte: '2017-01-31' } },
        ],
      },
    ]);
  });
});
