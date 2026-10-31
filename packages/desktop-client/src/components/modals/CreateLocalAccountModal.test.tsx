import type { ReactNode } from 'react';

import { initServer } from '@actual-app/core/platform/client/connection';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { createTestAppStore, TestProviders } from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { CreateLocalAccountModal } from './CreateLocalAccountModal';

const mutate = vi.fn();

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

vi.mock('#components/common/Modal', () => ({
  Modal: ({
    children,
  }: {
    children: (state: { state: { close: () => void } }) => ReactNode;
  }) => children({ state: { close: vi.fn() } }),
  ModalHeader: () => null,
  ModalTitle: () => null,
  ModalCloseButton: () => null,
  ModalButtons: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('#accounts', () => ({
  useCreateAccountMutation: () => ({ mutate }),
}));
vi.mock('#hooks/useAccounts', () => ({ useAccounts: () => ({ data: [] }) }));
vi.mock('#hooks/useNavigate', () => ({ useNavigate: () => vi.fn() }));
vi.mock('#hooks/useSyncServerStatus', () => ({
  useSyncServerStatus: () => 'no-server',
}));

function renderModal(prefs: Record<string, string>) {
  const store = createTestAppStore();
  store.dispatch(mergeSyncedPrefs(prefs));
  render(
    <TestProviders store={store}>
      <CreateLocalAccountModal />
    </TestProviders>,
  );
}

function input(name: string) {
  const element = document.querySelector(`input[name="${name}"]`);
  assert(element, `Expected ${name} input`);
  return element;
}

function currencySelect() {
  return document.getElementById('account-currency-select');
}

function submit(name: string, balance: string) {
  const nameInput = input('name');
  fireEvent.change(nameInput, { target: { value: name } });
  fireEvent.blur(nameInput);
  const balanceInput = input('balance');
  fireEvent.change(balanceInput, { target: { value: balance } });
  fireEvent.blur(balanceInput);
  fireEvent.click(screen.getByRole('button', { name: 'Create' }));
}

const jpyBudget = {
  defaultCurrencyCode: 'JPY',
  amountEncoding: JSON.stringify({
    version: 1,
    currencyCode: 'JPY',
    precision: 0,
  }),
};

beforeEach(() => mutate.mockReset());

it('hides the currency picker when multicurrency is unavailable', () => {
  renderModal({ ...jpyBudget, 'flags.currency': 'true' });
  expect(currencySelect()).toBeNull();
  submit('Wallet', '1000');
  expect(mutate).toHaveBeenCalledWith(
    { name: 'Wallet', balance: 1000, offBudget: false },
    expect.anything(),
  );
});

it('hides the currency picker for a legacy budget without a currency', () => {
  renderModal({ 'flags.currency': 'true', 'flags.multicurrency': 'true' });
  expect(currencySelect()).toBeNull();
});

it('creates a foreign account, asking for a base amount when no rate applies', async () => {
  initServer({
    'exchange-rates/resolve': async () => ({ status: 'unavailable' }),
  });
  renderModal({
    ...jpyBudget,
    'flags.currency': 'true',
    'flags.multicurrency': 'true',
  });
  const select = currencySelect();
  assert(select, 'Expected currency select');
  expect(select).toHaveTextContent('JPY - Japanese Yen');
  const user = userEvent.setup();
  await user.click(select);
  await user.click(await screen.findByText(/^USD - /));
  expect(select).toHaveTextContent(/^USD - /);

  submit('Dollars', '12.34');
  expect(
    await screen.findByText(/No exchange rate is saved for today/),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Create' }));
  expect(mutate).not.toHaveBeenCalled();

  fireEvent.change(input('startingBalanceBase'), { target: { value: '1800' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create' }));
  expect(mutate).toHaveBeenCalledWith(
    {
      name: 'Dollars',
      balance: 12.34,
      offBudget: false,
      currency: 'USD',
      startingBalanceBase: 1800,
    },
    expect.anything(),
  );
});

it('shows the converted starting balance when a rate is saved', async () => {
  initServer({
    'exchange-rates/resolve': async () => ({
      status: 'resolved',
      rate: '0.01',
      kind: 'standing',
      source: 'manual',
      timestamp: '2026-01-01T00:00:00.000Z',
      fallback: false,
    }),
  });
  renderModal({
    ...jpyBudget,
    'flags.currency': 'true',
    'flags.multicurrency': 'true',
  });
  const user = userEvent.setup();
  await user.click(currencySelect()!);
  await user.click(await screen.findByText(/^USD - /));
  submit('Dollars', '12');
  expect(
    await screen.findByText(/in the budget currency, at 1 JPY = 0.01 USD/),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Create' }));
  expect(mutate).toHaveBeenCalledWith(
    { name: 'Dollars', balance: 12, offBudget: false, currency: 'USD' },
    expect.anything(),
  );
});
