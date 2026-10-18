import { buildRateIndex } from '@actual-app/core/shared/fx/rates';
import type { RateRecord } from '@actual-app/core/shared/fx/rates';
import { describe, expect, it } from 'vitest';

import { getCurrenciesBeforeFirstRate } from './ReportsCurrencyWarning';

function rate(from: string, date: string): RateRecord {
  return {
    id: `${from}-${date}`,
    from_currency: from,
    to_currency: 'CAD',
    rate: 1.25,
    date,
    source: 'manual',
    created_at: 1,
  };
}

const rateIndex = buildRateIndex([
  rate('EUR', '2024-01-01'),
  rate('USD', '2024-06-01'),
]);

describe('getCurrenciesBeforeFirstRate', () => {
  it('checks each currency against its own first transaction', () => {
    expect(
      getCurrenciesBeforeFirstRate(
        [
          // EUR starts before its first rate; USD only after its own
          { currency: 'EUR', date: '2024-02-01' },
          { currency: 'EUR', date: '2023-12-01' },
          { currency: 'USD', date: '2024-07-01' },
        ],
        rateIndex,
        'CAD',
      ),
    ).toEqual(['EUR']);
  });

  it('flags a currency as soon as one of its accounts predates the rates', () => {
    expect(
      getCurrenciesBeforeFirstRate(
        [
          { currency: 'USD', date: '2024-07-01' },
          { currency: 'USD', date: '2024-05-01' },
        ],
        rateIndex,
        'CAD',
      ),
    ).toEqual(['USD']);
  });

  it('leaves out currencies without any rate', () => {
    expect(
      getCurrenciesBeforeFirstRate(
        [{ currency: 'GBP', date: '2020-01-01' }],
        rateIndex,
        'CAD',
      ),
    ).toEqual([]);
  });
});
