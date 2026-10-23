import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';

import { describeMissingRates } from './missingRates';

// Fills in the interpolations like i18next does
const t = ((text: string, values: Record<string, string> = {}) =>
  text.replace(
    /{{(\w+)}}/g,
    (_, key: string) => values[key] ?? '',
  )) as TFunction;

const none = {
  isOutdated: false,
  outdatedSince: null,
  olderTransactionsFrom: null,
  holes: null,
};

describe('describeMissingRates', () => {
  it.each([
    [
      { ...none, isOutdated: true, olderTransactionsFrom: '2026-01-05' },
      ['USD has no exchange rates yet.'],
    ],
    [
      { ...none, isOutdated: true, outdatedSince: '2026-10-20' },
      ['The last USD rate is from 10/20/2026.'],
    ],
    [
      { ...none, olderTransactionsFrom: '2026-01-05' },
      ['USD transactions from 01/05/2026 are older than its first rate.'],
    ],
    [
      {
        ...none,
        holes: { startDate: '2026-03-02', endDate: '2026-04-10' },
      },
      ['Some USD rates between 03/02/2026 and 04/10/2026 are missing.'],
    ],
    [
      {
        isOutdated: true,
        outdatedSince: '2026-10-20',
        olderTransactionsFrom: '2026-01-05',
        holes: { startDate: '2026-03-02', endDate: '2026-03-02' },
      },
      [
        'The last USD rate is from 10/20/2026.',
        'USD transactions from 01/05/2026 are older than its first rate.',
        'The USD rate of 03/02/2026 is missing.',
      ],
    ],
  ])('describes %o', (missing, expected) => {
    expect(
      describeMissingRates([{ currency: 'USD', ...missing }], t, 'MM/dd/yyyy'),
    ).toEqual(expected);
  });
});
