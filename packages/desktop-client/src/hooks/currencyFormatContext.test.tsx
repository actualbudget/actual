import type { ReactNode } from 'react';

import { renderHook } from '@testing-library/react';

import { createTestAppStore, TestProviders } from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import {
  BudgetCurrencyFormat,
  CurrencyFormatProvider,
} from './currencyFormatContext';
import { useAmountPrecision } from './useAmountPrecision';
import { useFormat } from './useFormat';

function wrapper(inner?: (children: ReactNode) => ReactNode) {
  const store = createTestAppStore();
  store.dispatch(
    mergeSyncedPrefs({
      defaultCurrencyCode: 'USD',
      amountEncoding: JSON.stringify({
        version: 1,
        currencyCode: 'USD',
        precision: 2,
      }),
    }),
  );
  return ({ children }: { children: ReactNode }) => (
    <TestProviders store={store}>
      {inner ? inner(children) : children}
    </TestProviders>
  );
}

function useBoth() {
  const format = useFormat();
  return {
    precision: useAmountPrecision(),
    display: format(150000, 'financial'),
    edit: format.fromEdit('1500'),
  };
}

describe('currency format context', () => {
  it('uses the budget currency without a provider', () => {
    const { result } = renderHook(useBoth, { wrapper: wrapper() });
    expect(result.current.precision).toBe(2);
    expect(result.current.display).toContain('$');
    expect(result.current.display).toContain('1,500.00');
    expect(result.current.edit).toBe(150000);
  });

  it.each([
    ['JPY', 0, '¥', '150,000', 1500],
    ['KWD', 3, 'KWD', '150.000', 1500000],
  ])(
    'formats inside a %s provider',
    (currencyCode, precision, symbol, shown, edited) => {
      const { result } = renderHook(useBoth, {
        wrapper: wrapper(children => (
          <CurrencyFormatProvider
            currencyCode={currencyCode}
            precision={precision}
          >
            {children}
          </CurrencyFormatProvider>
        )),
      });
      expect(result.current.precision).toBe(precision);
      expect(result.current.display).toContain(symbol);
      expect(result.current.display).toContain(shown);
      expect(result.current.edit).toBe(edited);
    },
  );

  it('restores budget formatting inside a budget boundary', () => {
    const { result } = renderHook(useBoth, {
      wrapper: wrapper(children => (
        <CurrencyFormatProvider currencyCode="JPY" precision={0}>
          <BudgetCurrencyFormat>{children}</BudgetCurrencyFormat>
        </CurrencyFormatProvider>
      )),
    });
    expect(result.current.precision).toBe(2);
    expect(result.current.display).toContain('$');
  });
});
