import { MAX_SAFE_NUMBER } from '@actual-app/core/shared/util';
import type {
  FxAccountMonth,
  FxImpactResult,
  FxTotal,
} from '@actual-app/core/types/models';

const standing80 = {
  rate: '80',
  kind: 'standing',
  source: 'manual',
  timestamp: '2016-12-01T00:00:00.000Z',
  fallback: false,
};
const fetched100 = {
  rate: '100',
  kind: 'fetched',
  source: 'provider',
  timestamp: '2016-11-27T16:05:30.000Z',
  fallback: true,
};

const zeroStocks = { booked: 0, basis: 0, value: 0, unrealized: 0 };
const unknownChanges = {
  flows: 100,
  realized: null,
  feeRealized: null,
  feeExpense: 0,
  unrealized: null,
  carry: null,
  settlement: null,
  gap: null,
};

// E1 at a January close of 80: 10000 JPY bought for 100.00 with a 2.00
// source fee is worth 125.00, so unrealized and total change are +25.00.
const yen: FxAccountMonth = {
  accountId: 'yen',
  flows: 10000,
  realized: 0,
  feeRealized: 0,
  feeExpense: 0,
  unrealized: 2500,
  carry: 0,
  settlement: 0,
  gap: 2500,
  opening: { native: 0, ...zeroStocks, rate: null },
  closing: {
    native: 10000,
    booked: 10000,
    basis: 10000,
    value: 12500,
    unrealized: 2500,
    rate: standing80,
  },
  reasons: [],
};

// A KWD account whose basis is unknown, holding the largest wire amount.
const dinar: FxAccountMonth = {
  accountId: 'dinar',
  ...unknownChanges,
  opening: { native: 0, ...zeroStocks, rate: null },
  closing: {
    native: MAX_SAFE_NUMBER,
    booked: 100,
    basis: null,
    value: null,
    unrealized: null,
    rate: null,
  },
  reasons: [
    { reason: 'sign-mismatch', since: '2016-12-05' },
    { reason: 'rate-unavailable', since: '2016-12-31' },
  ],
};

function totalOf(row: FxAccountMonth, incomplete: string[]): FxTotal {
  const { accountId: _id, reasons: _reasons, opening, closing, ...rest } = row;
  const { native: _o, rate: _or, ...openingStocks } = opening;
  const { native: _c, rate: _cr, ...closingStocks } = closing;
  return {
    ...rest,
    opening: openingStocks,
    closing: closingStocks,
    incompleteAccountIds: incomplete,
  };
}

export const fxImpactFixture = {
  today: '2017-01-01',
  budgetCurrency: 'USD',
  basePrecision: 2,
  startMonth: '2016-12',
  endMonth: '2016-12',
  accounts: [
    {
      id: 'yen',
      name: '=Yen',
      currency: 'JPY',
      precision: 0,
      offbudget: false,
      closed: false,
    },
    {
      id: 'dinar',
      name: 'Dinar',
      currency: 'KWD',
      precision: 3,
      offbudget: true,
      closed: false,
    },
    {
      id: 'cash',
      name: 'Cash',
      currency: 'USD',
      precision: 2,
      offbudget: false,
      closed: false,
    },
  ],
  unknownAccountIds: [],
  createdMonths: { first: '2016-11', last: '2017-01' },
  months: [
    {
      month: '2016-12',
      openDate: '2016-11-30',
      closeDate: '2016-12-31',
      accounts: [yen, dinar],
      currencies: [
        { currency: 'JPY', ...totalOf(yen, []) },
        { currency: 'KWD', ...totalOf(dinar, ['dinar']) },
      ],
      budgetCurrencyFeeExpense: -200,
      total: {
        ...totalOf(dinar, ['dinar']),
        flows: 10100,
        feeExpense: -200,
      },
      onBudget: totalOf(yen, []),
      bridge: {
        budgetType: 'envelope',
        opening: 0,
        closing: 12500,
        flows: 10000,
        posted: 2500,
        broughtForward: 0,
        incomplete: false,
        contribution: 2500,
        contributionIncomplete: false,
        cell: { value: 0, incomplete: false },
        pending: true,
        accounts: [
          {
            accountId: 'yen',
            opening: 0,
            closing: 12500,
            flows: 10000,
            posted: 2500,
            broughtForward: 0,
            covers: ['2016-11-30'],
            openDate: '2016-11-30',
            openingRate: null,
            closeDate: '2016-12-31',
            rate: standing80,
            unavailableReason: null,
            stale: false,
          },
        ],
      },
      exchanges: [
        {
          id: 'x1',
          date: '2016-12-10',
          value: 10000,
          source: {
            accountId: 'cash',
            currency: null,
            native: -10000,
            fee: -200,
            feeBooked: -200,
            realized: null,
            feeRealized: null,
            referenceRate: null,
            reasons: [],
          },
          destination: {
            accountId: 'yen',
            currency: 'JPY',
            native: 10000,
            fee: 0,
            feeBooked: 0,
            realized: 0,
            feeRealized: 0,
            referenceRate: fetched100,
            reasons: [],
          },
          spread: 2500,
        },
      ],
      diagnostics: { fees: -200, spread: 2500 },
    },
  ],
} satisfies FxImpactResult;
