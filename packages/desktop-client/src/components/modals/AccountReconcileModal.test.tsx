import type { ReactNode } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';

import { createTestAppStore, TestProviders } from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { AccountReconcileModal } from './AccountReconcileModal';

vi.mock('#components/common/Modal', () => ({
  Modal: ({
    children,
  }: {
    children: (state: { state: { close: () => void } }) => ReactNode;
  }) => children({ state: { close: vi.fn() } }),
  ModalHeader: () => null,
  ModalCloseButton: () => null,
}));
vi.mock('#hooks/useAccount', () => ({
  useAccount: () => ({ id: 'account', balance_current: 2345 }),
}));
vi.mock('#hooks/useSheetValue', () => ({ useSheetValue: () => 1234 }));
vi.mock('#components/mobile/transactions/AmountInput', () => ({
  AmountInput: ({
    value,
    onChange,
  }: {
    value: number;
    onChange: (value: number) => void;
  }) => (
    <input
      aria-label="Reconcile balance"
      value={value}
      onChange={event => onChange(Number(event.target.value))}
    />
  ),
}));

it.each([
  [0, false, '1234', '5678', 5678],
  [3, false, '1.234', '5.678', 5678],
  [3, true, '1.234', '5.678', 5678],
] as const)(
  'reconciles at %idp with calculator %s',
  (precision, calculator, initial, entered, expected) => {
    const store = createTestAppStore();
    store.dispatch(
      mergeSyncedPrefs({
        amountEncoding: JSON.stringify({
          version: 1,
          currencyCode: 'KWD',
          precision,
        }),
        'flags.mobileCalculator': String(calculator),
      }),
    );
    const onReconcile = vi.fn();
    render(
      <TestProviders store={store}>
        <AccountReconcileModal accountId="account" onReconcile={onReconcile} />
      </TestProviders>,
    );
    const input = screen.getByRole('textbox', { name: 'Reconcile balance' });
    expect(input).toHaveValue(initial);
    fireEvent.change(input, { target: { value: entered } });
    fireEvent.click(screen.getByRole('button', { name: 'Reconcile' }));
    expect(onReconcile).toHaveBeenCalledWith(expected);
  },
);

it('uses the last bank balance in stored units at 3dp', () => {
  const store = createTestAppStore();
  store.dispatch(
    mergeSyncedPrefs({
      amountEncoding: JSON.stringify({
        version: 1,
        currencyCode: 'KWD',
        precision: 3,
      }),
    }),
  );
  const onReconcile = vi.fn();
  render(
    <TestProviders store={store}>
      <AccountReconcileModal accountId="account" onReconcile={onReconcile} />
    </TestProviders>,
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Use last synced total' }),
  );
  expect(
    screen.getByRole('textbox', { name: 'Reconcile balance' }),
  ).toHaveValue('2.345');
  fireEvent.click(screen.getByRole('button', { name: 'Reconcile' }));
  expect(onReconcile).toHaveBeenCalledWith(2345);
});
