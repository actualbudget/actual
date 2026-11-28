import { initServer } from '@actual-app/core/platform/client/connection';
import { render, screen, waitFor } from '@testing-library/react';

import { createTestAppStore, TestProviders } from '#mocks';

import { PrecisionGraduationGate } from './PrecisionGraduationGate';

const loadPrefs = vi.hoisted(() => vi.fn());

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
vi.mock('#prefs/prefsSlice', async importOriginal => ({
  ...(await importOriginal()),
  loadPrefs: () => async () => loadPrefs(),
}));

beforeEach(() => loadPrefs.mockClear());

function setup(precisions: [number, number], transitionResult: object = {}) {
  const transition = vi.fn(async () => transitionResult);
  initServer({
    'amount-encoding/preflight': async () => ({
      sourceToken: 'source',
      source: { version: 0, currencyCode: 'USD', precision: precisions[0] },
      target: { version: 1, currencyCode: 'USD', precision: precisions[1] },
      pending: false,
    }),
    'amount-encoding/transition': transition,
  });
  const store = createTestAppStore();
  render(
    <TestProviders store={store}>
      <PrecisionGraduationGate currencyCode="USD" />
    </TestProviders>,
  );
  return { store, transition };
}

it('updates a same-precision budget without asking', async () => {
  const { store, transition } = setup([2, 2]);

  await waitFor(() => expect(loadPrefs).toHaveBeenCalled());
  expect(transition).toHaveBeenCalledWith({
    currencyCode: 'USD',
    sourceToken: 'source',
  });
  expect(store.getState().modals.modalStack).toEqual([]);
});

it('asks before changing stored precision', async () => {
  const { store, transition } = setup([2, 0]);

  expect(
    await screen.findByRole('button', { name: 'Continue budget update' }),
  ).toBeVisible();
  expect(transition).not.toHaveBeenCalled();
  expect(store.getState().modals.modalStack).toMatchObject([
    {
      name: 'amount-encoding',
      options: { currencyCode: 'USD', required: true },
    },
  ]);
});

it('offers retry when the update committed but did not publish', async () => {
  const { store } = setup([2, 2], {
    error: 'network-failure',
    retryable: true,
  });

  await waitFor(() => expect(loadPrefs).toHaveBeenCalled());
  expect(store.getState().modals.modalStack).toMatchObject([
    {
      name: 'amount-encoding',
      options: { currencyCode: 'USD', required: false },
    },
  ]);
});
