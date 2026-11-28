import { createAsyncThunk } from '@reduxjs/toolkit';
import { QueryClient } from '@tanstack/react-query';

import { mergeLocalPrefs } from '#prefs/prefsSlice';

import { configureAppStore } from './store';

const failWith = createAsyncThunk('test/fail', async (message: string) => {
  throw new Error(message);
});

function setup() {
  const store = configureAppStore({ queryClient: new QueryClient() });
  store.dispatch(
    mergeLocalPrefs({
      amountEncodingTransition: {
        id: 'transition',
        sourceGroupId: 'group',
        sourceEncoding: null,
        targetEncoding: '{"version":1}',
        targetCurrencyCode: 'JPY',
      },
    }),
  );
  return store;
}

describe('rejected action notifications', () => {
  it('offers the retry dialog once instead of a toast for a pending transition', async () => {
    const store = setup();
    await store.dispatch(failWith('amount-encoding-transition-pending'));
    await store.dispatch(failWith('amount-encoding-transition-pending'));

    const { modals, notifications } = store.getState();
    expect(modals.modalStack).toHaveLength(1);
    expect(modals.modalStack).toMatchObject([
      {
        name: 'amount-encoding',
        options: { currencyCode: 'JPY' },
      },
    ]);
    expect(notifications.notifications).toEqual([]);
  });

  it('still reports other failures as a toast', async () => {
    const store = setup();
    await store.dispatch(failWith('something-else'));

    const { modals, notifications } = store.getState();
    expect(modals.modalStack).toEqual([]);
    expect(notifications.notifications).toMatchObject([
      { type: 'error', message: 'something-else' },
    ]);
  });
});
