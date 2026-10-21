import type {
  CategoryPocketsMonth,
  ReservationExplanation,
  ReservationsBridge,
} from '@actual-app/core/server/budget/pocket-readers';

// Literal MC-10 fixtures (USD 2dp budget, JPY 0dp) for the readers.

const standing80 = {
  rate: '80',
  kind: 'standing',
  source: 'manual',
  timestamp: '2026-01-20T00:00:00.000Z',
  fallback: false,
};

/** AN1 / BR1: 10000 JPY held and reserved, assigned 100.00, valued at 80. */
export const an1Jpy: ReservationExplanation = {
  currency: 'JPY',
  precision: 0,
  valuationDate: '2026-01-31',
  rate: standing80,
  rule: 2,
  valuation: 'market',
  carriedFrom: null,
  holdings: 10000,
  bookedHoldings: 10000,
  heldAtValuation: 10000,
  bookedAtValuation: 10000,
  reserved: 10000,
  unreserved: 0,
  holdingsValue: 12500,
  gap: 2500,
  excludedFx: 0,
  includedFx: 2500,
  includedValue: 12500,
  marketHoldings: 12500,
  marketUnreserved: 0,
  accountRounding: 0,
  planning: 0,
  pocketTotal: 12500,
  includedReservation: 12500,
  exactChange: 12500,
  writtenChange: 12500,
  spentBase: 0,
  funds: 0,
  backing: { reserved: 10000, held: 10000, shortage: false },
  incomplete: [],
  lanes: [
    {
      laneId: 'travelJpy',
      categoryId: 'travel',
      budgeted: 10000,
      budgetedBase: 10000,
      captureDate: '2026-01-31',
      spent: 0,
      spentBase: 0,
      carryIn: 0,
      reset: 0,
      balance: 10000,
      balanceBase: 12500,
      valueKind: 'resolved',
      carryover: false,
      assignedBase: 10000,
      reservationFx: 2500,
    },
  ],
};

export const br1Reservations: ReservationsBridge = {
  changes: 12500,
  incomplete: false,
  cell: { changes: 12500, incomplete: false },
  pending: false,
  assigned: 10000,
  remainder: 2500,
  currencies: [an1Jpy],
};

/** BR3: PL1's March, Q -20.00 and D 0.00 leave funds of 80.00. */
export const pl1Reservations: ReservationsBridge = {
  ...br1Reservations,
  changes: 10000,
  cell: { changes: 10000, incomplete: false },
  assigned: 10000,
  remainder: 0,
  currencies: [
    {
      ...an1Jpy,
      valuationDate: '2026-01-15',
      rate: { ...standing80, rate: '100' },
      holdings: 20000,
      bookedHoldings: 18000,
      reserved: 10000,
      unreserved: 10000,
      marketHoldings: 20000,
      marketUnreserved: 10000,
      accountRounding: 0,
      planning: -2000,
      pocketTotal: 10000,
      includedReservation: 10000,
      writtenChange: 10000,
      funds: 8000,
    },
  ],
};

/** BR3: OV2's January, gross P and exact X unrepresentable. */
export const ov2Reservations: ReservationsBridge = {
  changes: 0,
  incomplete: true,
  cell: { changes: 0, incomplete: true },
  pending: false,
  assigned: null,
  remainder: null,
  currencies: [
    {
      ...an1Jpy,
      rate: { ...standing80, rate: '100' },
      holdings: 0,
      reserved: null,
      unreserved: null,
      pocketTotal: null,
      includedReservation: 0,
      exactChange: null,
      writtenChange: 0,
      includedValue: 0,
      funds: 0,
      backing: { reserved: null, held: 0, shortage: true },
      incomplete: [
        'entry-pending',
        'amount-out-of-range',
        'reservation-incomplete',
      ],
      lanes: [],
    },
  ],
};

/** BR3: MM1's February, an unknown native with a placeholder P. */
export const mm1Reservations: ReservationsBridge = {
  changes: 0,
  incomplete: true,
  cell: { changes: 0, incomplete: true },
  pending: false,
  assigned: null,
  remainder: null,
  currencies: [
    {
      ...an1Jpy,
      rule: null,
      valuation: 'unknown-native',
      reserved: null,
      pocketTotal: 4000,
      includedReservation: 4000,
      exactChange: 0,
      writtenChange: 0,
      incomplete: ['pair-encoding-mismatch', 'reservation-incomplete'],
      lanes: [
        {
          ...an1Jpy.lanes[0],
          budgeted: null,
          balance: null,
          balanceBase: null,
          valueKind: 'unknown',
        },
      ],
    },
  ],
};

type Pocket = CategoryPocketsMonth['pockets'][number];

/** Travel's own JPY lane, carry off. */
const lane = (
  overrides: Partial<Pocket['lanes'][number]>,
): Pocket['lanes'][number] => ({
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
});

/** A JPY pocket whose single lane holds the pocket's own figures. */
const pocket = (overrides: Partial<Pocket>): Pocket => ({
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
  rate: standing80,
  incomplete: [],
  ...overrides,
  lanes: [
    lane({
      budgeted: overrides.budgeted ?? 0,
      budgetedBase: overrides.budgetedBase ?? 0,
      spent: overrides.spent ?? 0,
      spentBase: overrides.spentBase ?? 0,
      balance: overrides.balance ?? 0,
      balanceBase: overrides.balanceBase ?? 0,
    }),
  ],
});

const category = (
  overrides: Partial<CategoryPocketsMonth>,
  pockets: Array<Partial<Pocket>>,
): CategoryPocketsMonth => ({
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
  pockets: pockets.map(pocket),
});

/** `envelope-budget-month` cells of Travel, an affected category. */
export function travelMonth(month: string, entry: CategoryPocketsMonth) {
  const sheet = `budget${month.replace('-', '')}`;
  return [
    { name: `${sheet}!budget-travel`, value: entry.base.budgeted },
    { name: `${sheet}!sum-amount-travel`, value: entry.base.spent },
    { name: `${sheet}!leftover-travel`, value: entry.base.balance },
    { name: `${sheet}!carryover-travel`, value: entry.base.carryover },
    { name: `${sheet}!category-pockets-travel`, value: entry },
  ];
}

/** AN1: January assigned 100.00, FX +25.00, balance 125.00; February carries it. */
export const an1Months: Record<string, CategoryPocketsMonth> = {
  '2026-01': category(
    { budgeted: 10000, fxContribution: 2500, balance: 12500 },
    [
      {
        budgeted: 10000,
        budgetedBase: 10000,
        balance: 10000,
        balanceBase: 12500,
        fxContribution: 2500,
      },
    ],
  ),
  '2026-02': category({ carryIn: 12500, balance: 12500 }, [
    { balance: 10000, balanceBase: 12500, carryIn: 12500 },
  ]),
};

/** AN2: base +50.00 and JPY -3000 (-30.00, carry off). */
export const an2Months: Record<string, CategoryPocketsMonth> = {
  '2026-01': category(
    {
      budgeted: 5000,
      spent: -3000,
      balance: 2000,
      base: {
        budgeted: 5000,
        spent: 0,
        balance: 5000,
        carryover: false,
        carryIn: 0,
        reset: 0,
      },
    },
    [
      {
        spent: -3000,
        spentBase: -3000,
        balance: -3000,
        balanceBase: -3000,
      },
    ],
  ),
  '2026-02': category(
    {
      carryIn: 5000,
      reset: -3000,
      balance: 5000,
      base: {
        budgeted: 0,
        spent: 0,
        balance: 5000,
        carryover: false,
        carryIn: 5000,
        reset: 0,
      },
    },
    [{ reset: -3000 }],
  ),
};

/** SB1: January spent -2 JPY with an out-of-range spent base. */
export const sb1Months: Record<string, CategoryPocketsMonth> = {
  '2026-01': category(
    {
      spent: null,
      balance: -2,
      fxContribution: null,
      incomplete: ['amount-out-of-range'],
    },
    [
      {
        spent: -2,
        spentBase: null,
        balance: -2,
        balanceBase: -2,
        fxContribution: null,
        incomplete: ['amount-out-of-range'],
      },
    ],
  ),
};
