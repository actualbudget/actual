import type { ReactNode } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { createTestAppStore, TestProviders } from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { CreateLocalAccountModal } from './CreateLocalAccountModal';

const mutate = vi.fn();

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

it('preselects the budget currency and keeps foreign currencies unavailable', async () => {
  renderModal({
    ...jpyBudget,
    'flags.currency': 'true',
    'flags.multicurrency': 'true',
  });
  expect(currencySelect()).toHaveTextContent('JPY - Japanese Yen');
  expect(
    screen.getByText('Accounts in other currencies are not available yet.'),
  ).toBeInTheDocument();

  const select = currencySelect();
  assert(select, 'Expected currency select');
  const user = userEvent.setup();
  await user.click(select);
  // Disabled menu items ignore selection, so the menu stays open.
  await user.click(await screen.findByText(/^USD - /));
  expect(screen.getByText(/^USD - /)).toBeInTheDocument();
  expect(select).toHaveTextContent('JPY - Japanese Yen');
  await user.keyboard('{Escape}');

  submit('Wallet', '1000');
  expect(mutate).toHaveBeenCalledWith(
    { name: 'Wallet', balance: 1000, offBudget: false, currency: 'JPY' },
    expect.anything(),
  );
});
