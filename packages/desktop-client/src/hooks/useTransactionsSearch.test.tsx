import { q } from '@actual-app/core/shared/query';
import { act, renderHook, waitFor } from '@testing-library/react';

import { createTestAppStore, TestProviders } from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { useTransactionsSearch } from './useTransactionsSearch';

it('uses current recorded precision for every mobile search caller', async () => {
  const store = createTestAppStore();
  let query = q('transactions');
  store.dispatch(
    mergeSyncedPrefs({
      amountEncoding: JSON.stringify({
        version: 1,
        currencyCode: 'JPY',
        precision: 0,
      }),
    }),
  );
  const { result } = renderHook(
    () =>
      useTransactionsSearch({
        updateQuery: update => {
          query = update(q('transactions'));
        },
        resetQuery: () => {
          query = q('transactions');
        },
        dateFormat: 'MM/dd/yyyy',
        delayMs: 0,
      }),
    {
      wrapper: ({ children }) => (
        <TestProviders store={store}>{children}</TestProviders>
      ),
    },
  );

  act(() => result.current.search('1'));
  await waitFor(() =>
    expect(JSON.stringify(query.serialize().filterExpressions)).toContain(
      '"$eq":1',
    ),
  );

  await act(() =>
    store.dispatch(
      mergeSyncedPrefs({
        amountEncoding: JSON.stringify({
          version: 1,
          currencyCode: 'KWD',
          precision: 3,
        }),
      }),
    ),
  );
  act(() => result.current.search('1.234'));
  await waitFor(() =>
    expect(JSON.stringify(query.serialize().filterExpressions)).toContain(
      '"$eq":1234',
    ),
  );
});
