import React from 'react';
import type { ReactNode } from 'react';

import { buildRateIndex } from '@actual-app/core/shared/fx/rates';
import type {
  AccountEntity,
  PayeeEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePromptTransferAmounts } from '#hooks/usePromptTransferAmounts';
import { createTestAppStore, TestProviders } from '#mocks';
import { closeModal } from '#modals/modalsSlice';
import { useSelector } from '#redux';

import { TransferAmountModal } from './TransferAmountModal';

const accounts = [
  { id: 'chequing', name: 'Chequing', currency: null },
  { id: 'us', name: 'US', currency: 'USD' },
] as AccountEntity[];
const payees = [
  { id: 'to-us', name: '', transfer_acct: 'us' },
] as PayeeEntity[];

let isMultiCurrencyEnabled = true;

vi.mock('#hooks/useMultiCurrency', () => ({
  useMultiCurrency: () => ({
    isEnabled: isMultiCurrencyEnabled,
    defaultCurrencyCode: 'CAD',
    getAccountCurrency: (account: Pick<AccountEntity, 'currency'>) =>
      account.currency || 'CAD',
  }),
}));
vi.mock('#hooks/useAccounts', () => ({
  useAccounts: () => ({ data: accounts }),
}));
vi.mock('#hooks/usePayees', () => ({
  usePayees: () => ({ data: payees }),
}));
vi.mock('#hooks/useExchangeRates', () => ({
  useExchangeRates: () => ({
    exchangeRates: [],
    rateIndex: buildRateIndex([]),
    isLoading: false,
  }),
}));

const transfer = {
  id: 'out',
  account: 'chequing',
  amount: -150000,
  date: '2026-03-15',
  payee: 'to-us',
} as TransactionEntity;

// The dialogs the prompt opens, as the app shows them
function TransferAmountModals() {
  const modalStack = useSelector(state => state.modals.modalStack);
  return modalStack.map((modal, index) =>
    modal.name === 'transfer-amount' ? (
      <TransferAmountModal key={index} {...modal.options} />
    ) : null,
  );
}

describe('usePromptTransferAmounts', () => {
  let store: ReturnType<typeof createTestAppStore>;

  function wrapper({ children }: { children: ReactNode }) {
    return <TestProviders store={store}>{children}</TestProviders>;
  }

  function renderPrompt() {
    render(<TransferAmountModals />, { wrapper });
    return renderHook(() => usePromptTransferAmounts(), { wrapper }).result
      .current;
  }

  const getModalStack = () => store.getState().modals.modalStack;

  beforeEach(() => {
    store = createTestAppStore();
    isMultiCurrencyEnabled = true;
  });

  it('opens the dialog after the save that asks, and takes its amount', async () => {
    const prompt = renderPrompt();

    // Saves can start while the transaction table renders
    const amounts = prompt([transfer]);
    expect(getModalStack()).toEqual([]);

    const input = await screen.findByLabelText('Amount in USD');
    await userEvent.clear(input);
    await userEvent.type(input, '1000');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await expect(amounts).resolves.toEqual({ out: 100000 });
    expect(getModalStack()).toEqual([]);
  });

  it('falls back to the exchange rate when the dialog is closed', async () => {
    const prompt = renderPrompt();

    const amounts = prompt([transfer]);
    await screen.findByLabelText('Amount in USD');
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    await expect(amounts).resolves.toEqual({});
  });

  it('goes on when the dialog goes away without closing', async () => {
    const prompt = renderPrompt();

    const amounts = prompt([transfer]);
    await waitFor(() => expect(getModalStack()).toHaveLength(1));
    // As when moving to another page
    act(() => {
      store.dispatch(closeModal());
    });

    await expect(amounts).resolves.toEqual({});
  });

  it('asks nothing while multiple currencies are off', async () => {
    isMultiCurrencyEnabled = false;
    const prompt = renderPrompt();

    await expect(prompt([transfer])).resolves.toEqual({});
    expect(getModalStack()).toEqual([]);
  });
});
