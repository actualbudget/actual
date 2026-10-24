import type {
  CategoryPocketsMonth,
  ReservationsBridge,
} from '@actual-app/core/server/budget/pocket-readers';

import { an1Jpy } from './fxReservations';

// MC-10.4 budget UI fixtures (USD 2dp budget, JPY 0dp), taken from the MC-10
// work order's literal states as the MC-10.3 readers report them.

type Pocket = CategoryPocketsMonth['pockets'][number];
type Lane = Pocket['lanes'][number];

const standing100 = {
  rate: '100',
  kind: 'standing',
  source: 'manual',
  timestamp: '2025-12-01T00:00:00.000Z',
  fallback: false,
} as const;

function lane(overrides: Partial<Lane>): Lane {
  return {
    laneId: 'travelJpy',
    kind: 'own',
    originCategoryId: 'travel',
    encoding: 'JPY.0',
    budgeted: 0,
    budgetedBase: 0,
    captureDate: null,
    spent: 0,
    spentBase: 0,
    balance: 0,
    balanceBase: 0,
    valueKind: 'resolved',
    carryover: false,
    status: 'live',
    ...overrides,
  };
}

function pocket(overrides: Partial<Pocket>): Pocket {
  return {
    id: 'travelJpy',
    currency: 'JPY',
    precision: 0,
    hidden: false,
    budgeted: 0,
    budgetedBase: 0,
    spent: 0,
    spentBase: 0,
    balance: 0,
    balanceBase: 0,
    fxContribution: 0,
    carryIn: 0,
    reset: 0,
    valuationDate: '2026-01-31',
    valuation: 'market',
    rate: standing100,
    lanes: [],
    incomplete: [],
    ...overrides,
  };
}

function entry(
  overrides: Partial<CategoryPocketsMonth>,
  pockets: Pocket[],
): CategoryPocketsMonth {
  return {
    budgeted: 0,
    spent: 0,
    balance: 0,
    carryIn: 0,
    reset: 0,
    fxContribution: 0,
    base: {
      budgeted: 0,
      spent: 0,
      balance: 0,
      carryover: false,
      carryIn: 0,
      reset: 0,
    },
    incomplete: [],
    ...overrides,
    pockets,
  };
}

/**
 * K1: 10000 JPY reserved with no rate ever; the assignment captured on
 * 2026-01-10 is pending, valued by rule 3 (included holdings rate).
 */
export const k1Travel = entry(
  { budgeted: null, balance: null, incomplete: ['rate-unavailable'] },
  [
    pocket({
      budgeted: 10000,
      budgetedBase: null,
      balance: 10000,
      balanceBase: null,
      fxContribution: null,
      valuation: 'included-rate',
      rate: null,
      incomplete: ['rate-unavailable', 'entry-pending'],
      lanes: [
        lane({
          budgeted: 10000,
          budgetedBase: null,
          captureDate: '2026-01-10',
          balance: 10000,
          balanceBase: null,
          valueKind: 'unknown',
        }),
      ],
    }),
  ],
);

/**
 * RL6 February: Food spent the account's 10000 JPY, so Travel's 10000 JPY
 * stays reserved with 0 held, valued at January's unit value (rule 4).
 */
export const rl6Travel = entry(
  { balance: null, incomplete: ['reservation-unvalued'] },
  [
    pocket({
      balance: 10000,
      balanceBase: null,
      fxContribution: null,
      carryIn: null,
      valuationDate: '2026-02-28',
      valuation: 'last-unit-value',
      rate: null,
      incomplete: ['reservation-unvalued'],
      lanes: [
        lane({ balance: 10000, balanceBase: null, valueKind: 'unknown' }),
      ],
    }),
  ],
);

/** RL6 February's MC-8.2 details: "10000 JPY reserved, 0 held". */
export const rl6Reservations: ReservationsBridge = {
  changes: 0,
  incomplete: false,
  cell: { changes: 0, incomplete: false },
  pending: false,
  assigned: 0,
  remainder: 0,
  currencies: [
    {
      ...an1Jpy,
      rule: 4,
      valuation: 'last-unit-value',
      carriedFrom: '2026-01',
      holdings: 0,
      reserved: 10000,
      unreserved: -10000,
      backing: { reserved: 10000, held: 0, shortage: true },
      incomplete: ['reservation-unvalued'],
    },
  ],
};

/**
 * L1 January after deleting Travel JPY into Food JPY: Food's own lane
 * (10000 frozen 100.00) and Travel's retired lane (5000 frozen 50.00, spent
 * -8000 / -80.00) display +7000 / 70.00.
 */
export const l1Food = entry({ budgeted: 15000, spent: -8000, balance: 7000 }, [
  pocket({
    id: 'foodJpy',
    budgeted: 15000,
    budgetedBase: 15000,
    spent: -8000,
    spentBase: -8000,
    balance: 7000,
    balanceBase: 7000,
    lanes: [
      lane({
        laneId: 'foodJpy',
        originCategoryId: 'food',
        budgeted: 10000,
        budgetedBase: 10000,
        captureDate: '2026-01-31',
        balance: 10000,
        balanceBase: 10000,
      }),
      lane({
        laneId: 'travelJpy',
        kind: 'inherited',
        budgeted: 5000,
        budgetedBase: 5000,
        captureDate: '2026-01-31',
        spent: -8000,
        spentBase: -8000,
        balance: -3000,
        balanceBase: -3000,
        status: 'retired',
      }),
    ],
  }),
]);

/**
 * Lane status coverage (not one literal fixture): Shop's JPY slot showing a
 * duplicate lane (B6), an orphan (OC4) and an unresolved lane (W3) beside
 * its own lane. Every lane counts; none has a value.
 */
export const statusShop = entry({ balance: null }, [
  pocket({
    id: 'shopJpy',
    budgeted: 1000,
    balance: 1000,
    balanceBase: null,
    valuation: 'market',
    incomplete: ['owner-unresolved'],
    lanes: [
      lane({ laneId: 'shopJpy', originCategoryId: 'shop' }),
      lane({
        laneId: 'shopJpy2',
        kind: 'inherited',
        originCategoryId: 'shop',
        status: 'duplicate',
      }),
      lane({
        laneId: 'oldJpy',
        kind: 'inherited',
        originCategoryId: 'old',
        status: 'orphan',
      }),
      // The reader reports a lane with no owner as its own slot lane.
      lane({
        laneId: 'lateJpy',
        kind: 'own',
        originCategoryId: 'shop',
        budgeted: 1000,
        balance: 1000,
        balanceBase: null,
        valueKind: 'unknown',
        status: 'unresolved',
      }),
    ],
  }),
]);

/**
 * Reader shapes of lanes without an owner (MC-10.6, pocket-deletion.test.ts
 * "reader shapes for repairs"): W3's late allocation to a deleted empty
 * Shop JPY lane, and an orphan of an older-client deletion whose mapped
 * category has no JPY slot. Each is its own slot, with one own lane.
 */
export const unresolvedShop = entry({ balance: null }, [
  pocket({
    id: 'lateJpy',
    budgeted: 1000,
    balance: 1000,
    balanceBase: null,
    incomplete: ['owner-unresolved'],
    lanes: [
      lane({
        laneId: 'lateJpy',
        originCategoryId: 'shop',
        budgeted: 1000,
        balance: 1000,
        balanceBase: null,
        valueKind: 'unknown',
        status: 'unresolved',
      }),
    ],
  }),
]);

export const orphanFood = entry({ budgeted: 4000, balance: 4000 }, [
  pocket({
    id: 'travelJpy',
    budgeted: 4000,
    balance: 4000,
    balanceBase: 4000,
    lanes: [
      lane({
        laneId: 'travelJpy',
        originCategoryId: 'travel',
        budgeted: 4000,
        budgetedBase: 4000,
        balance: 4000,
        balanceBase: 4000,
        status: 'orphan',
      }),
    ],
  }),
]);

/** `envelope-budget-month` cells of a month whose categories have pockets. */
export function pocketMonthCells(
  month: string,
  entries: Record<string, CategoryPocketsMonth>,
) {
  const sheet = `budget${month.replace('-', '')}`;
  return [
    { name: `${sheet}!total-budgeted`, value: 0 },
    ...Object.entries(entries).map(([id, value]) => ({
      name: `${sheet}!category-pockets-${id}`,
      value,
    })),
  ];
}
