import type { send } from '@actual-app/core/platform/client/connection';

// Literal bridge: $100 opening + $20 frozen flow + $60 monthly FX = $180 close.
// The separate $5 pre-range carry contributes to the included cell, not the bridge.
export const fxValuationFixture = {
  month: '2016-12',
  opening: 10000,
  flows: 2000,
  posted: 6000,
  broughtForward: 500,
  closing: 18000,
  incomplete: false,
  unavailableReason: null,
  accounts: [
    {
      account: 'yen',
      name: 'Yen',
      currency: 'JPY',
      opening: 10000,
      flows: 2000,
      posted: 6000,
      broughtForward: 500,
      closing: 18000,
      incomplete: false,
      unavailableReason: null,
      covers: [],
      openDate: '2016-11-30',
      openingRate: {
        rate: '150',
        kind: 'standing',
        source: 'manual',
        timestamp: '2016-10-01T00:00:00.000Z',
        fallback: false,
      },
      closeDate: '2016-12-31',
      rate: {
        rate: '100',
        kind: 'fetched',
        source: 'provider',
        timestamp: '2016-12-24T16:05:30.000Z',
        fallback: true,
      },
    },
  ],
} satisfies Awaited<ReturnType<typeof send<'budget/fx-valuation'>>>;
