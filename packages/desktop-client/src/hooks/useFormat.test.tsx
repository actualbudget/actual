import { renderHook } from '@testing-library/react';

import { createTestAppStore, TestProviders } from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { useFormat } from './useFormat';

it.each([
  [0, '1,234'],
  [2, '12.34'],
  [3, '1.234'],
] as const)(
  'formats stored amounts at %idp by default',
  (precision, expected) => {
    const store = createTestAppStore();
    store.dispatch(
      mergeSyncedPrefs({
        amountEncoding: JSON.stringify({
          version: 1,
          currencyCode: 'KWD',
          precision,
        }),
      }),
    );
    const { result } = renderHook(() => useFormat(), {
      wrapper: ({ children }) => (
        <TestProviders store={store}>{children}</TestProviders>
      ),
    });
    expect(result.current(1234, 'financial')).toBe(expected);
    expect(result.current.precision).toBe(precision);
    expect(result.current.forEdit(1234)).toBe(expected);
    expect(result.current.fromEdit(expected)).toBe(1234);
  },
);

it('preserves hidden fractional units when editing', () => {
  const store = createTestAppStore();
  store.dispatch(
    mergeSyncedPrefs({
      hideFraction: 'true',
      amountEncoding: JSON.stringify({
        version: 1,
        currencyCode: 'KWD',
        precision: 3,
      }),
    }),
  );
  const { result } = renderHook(() => useFormat(), {
    wrapper: ({ children }) => (
      <TestProviders store={store}>{children}</TestProviders>
    ),
  });
  expect(result.current(1234, 'financial')).toBe('1');
  expect(result.current.forEdit(1234)).toBe('1.234');
  expect(result.current.fromEdit('1.234')).toBe(1234);
  expect(result.current(1234, 'financial-no-decimals')).toBe('1');
});

it('keeps empty-currency budgets at 2dp', () => {
  const { result } = renderHook(() => useFormat(), { wrapper: TestProviders });
  expect(result.current(1234, 'financial')).toBe('12.34');
});

it('uses legacy 2dp until a currency transition records a new encoding', () => {
  const store = createTestAppStore();
  store.dispatch(mergeSyncedPrefs({ defaultCurrencyCode: 'JPY' }));
  const { result } = renderHook(() => useFormat(), {
    wrapper: ({ children }) => (
      <TestProviders store={store}>{children}</TestProviders>
    ),
  });
  expect(result.current(1234, 'financial')).toContain('12');
  expect(result.current(1234, 'financial')).not.toContain('12.34');
  expect(result.current.forEdit(1234)).toBe('12.34');
  expect(result.current.fromEdit('12.34')).toBe(1234);
});
