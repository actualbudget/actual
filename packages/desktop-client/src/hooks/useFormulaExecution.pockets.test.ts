import { createElement } from 'react';
import type { ReactNode } from 'react';

import {
  clearServer,
  initServer,
} from '@actual-app/core/platform/client/connection';
import type { CategoryPocketsMonth } from '@actual-app/core/server/budget/pocket-readers';
import { getCurrency } from '@actual-app/core/shared/currencies';
import { renderHook, waitFor } from '@testing-library/react';

import { createTestAppStore, TestProviders } from '#mocks';
import { an1Months, sb1Months, travelMonth } from '#mocks/fxReservations';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { useFormulaExecution } from './useFormulaExecution';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

// MC-10.3: BUDGET_QUERY reads the valued balance, the assigned bases and
// the FX contribution of categories with currency pockets.
function setup(months: Record<string, CategoryPocketsMonth>) {
  const store = createTestAppStore();
  store.dispatch(
    mergeSyncedPrefs({
      amountEncoding: JSON.stringify({
        version: 1,
        currencyCode: 'USD',
        precision: 2,
      }),
    }),
  );
  initServer({
    'formula-load-user-preferences': async () => ({
      currency: getCurrency('USD'),
      numberFormat: 'comma-dot',
      decimalPlaces: 2,
      thousandsSeparator: ',',
      decimalSeparator: '.',
      locale: 'en-US',
      currencySymbolPosition: 'before',
      currencySpaceBetweenAmountAndSymbol: false,
    }),
    'envelope-budget-month': async ({ month }) =>
      months[month] ? travelMonth(month, months[month]) : [],
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(TestProviders, { store, children });
}

afterEach(async () => {
  await clearServer();
});

it.each([
  ['budgeted', '2026-01', '2026-01', 100],
  ['spent', '2026-01', '2026-01', 0],
  ['fx_contribution', '2026-01', '2026-01', 25],
  ['balance_end', '2026-01', '2026-01', 125],
  ['balance_start', '2026-02', '2026-02', 125],
  ['balance_end', '2026-01', '2026-02', 125],
])(
  'AN1 BUDGET_QUERY %s from %s to %s is %s',
  async (dimension, start, end, expected) => {
    const wrapper = setup(an1Months);
    const { result } = renderHook(
      () =>
        useFormulaExecution(
          `=BUDGET_QUERY("${dimension}", "travel", "${start}", "${end}")`,
          {},
        ),
      { wrapper },
    );
    await waitFor(() => expect(result.current.result).toBe(expected));
  },
);

it('SB1 an out-of-range spent base is a formula error, not zero', async () => {
  const wrapper = setup(sb1Months);
  const { result } = renderHook(
    () =>
      useFormulaExecution(
        '=BUDGET_QUERY("spent", "travel", "2026-01", "2026-01")',
        {},
      ),
    { wrapper },
  );
  await waitFor(() =>
    expect(result.current.error).toBe('Formula error: VALUE'),
  );
  expect(result.current.result).toBe(null);
});

// Inspection 1, findings 4 and 5: each boundary reads only what it needs,
// and an unknown balance passes through a month without an entry.
const january = an1Months['2026-01'];
const unknownCarry = {
  '2026-01': {
    ...january,
    carryIn: null,
    fxContribution: null,
    incomplete: ['reservation-unvalued' as const],
  },
};
const unknownClose = {
  '2026-01': {
    ...january,
    carryIn: 12500,
    balance: null,
    incomplete: ['amount-out-of-range' as const],
  },
};

async function evaluate(
  months: Record<string, CategoryPocketsMonth>,
  formula: string,
) {
  const wrapper = setup(months);
  const { result } = renderHook(() => useFormulaExecution(formula, {}), {
    wrapper,
  });
  await waitFor(() =>
    expect(result.current.result !== null || result.current.error).toBeTruthy(),
  );
  return result.current;
}

it('finding 4: balance_end reads a known close despite an unknown carry-in', async () => {
  expect(
    await evaluate(
      unknownCarry,
      '=BUDGET_QUERY("balance_end", "travel", "2026-01", "2026-01")',
    ),
  ).toMatchObject({ result: 125, error: null });
});

it('finding 4: balance_start with an unknown carry-in is an error', async () => {
  expect(
    await evaluate(
      unknownCarry,
      '=BUDGET_QUERY("balance_start", "travel", "2026-01", "2026-01")',
    ),
  ).toMatchObject({ result: null, error: 'Formula error: VALUE' });
});

it('finding 4: balance_start reads a known carry-in despite an unknown close', async () => {
  expect(
    await evaluate(
      unknownClose,
      '=BUDGET_QUERY("balance_start", "travel", "2026-01", "2026-01")',
    ),
  ).toMatchObject({ result: 125, error: null });
});

it.each(['balance_start', 'balance_end'])(
  'finding 5: an unknown close carried into a month without an entry keeps %s unknown',
  async dimension => {
    expect(
      await evaluate(
        unknownClose,
        `=BUDGET_QUERY("${dimension}", "travel", "2026-02", "2026-02")`,
      ),
    ).toMatchObject({ result: null, error: 'Formula error: VALUE' });
  },
);
