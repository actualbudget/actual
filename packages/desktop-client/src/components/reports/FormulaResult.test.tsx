import { render, screen } from '@testing-library/react';

import { createTestAppStore, TestProviders } from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { FormulaResult } from './FormulaResult';

it('formats formula amounts using recorded units', () => {
  const store = createTestAppStore();
  store.dispatch(
    mergeSyncedPrefs({
      defaultCurrencyCode: 'RSD',
      amountEncoding: JSON.stringify({
        version: 1,
        currencyCode: 'RSD',
        precision: 0,
      }),
    }),
  );
  render(
    <TestProviders store={store}>
      <FormulaResult value={1234} loading={false} fontSizeMode="static" />
    </TestProviders>,
  );
  expect(screen.getByLabelText(/1,234/)).toBeVisible();
});
