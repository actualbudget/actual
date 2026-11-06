import React from 'react';

import { generateAccount } from '@actual-app/core/mocks';
import { initServer } from '@actual-app/core/platform/client/connection';
import type { TransactionEntity } from '@actual-app/core/types/models';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Mock } from 'vitest';

import { accountQueries } from '#accounts';
import { categoryQueries } from '#budget';
import { SpreadsheetProvider } from '#hooks/useSpreadsheet';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { payeeQueries } from '#payees';
import type { QuickAddResult } from '#transactions/quickAddParser';

import { QuickAddTransactionModal } from './QuickAddTransactionModal';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

// React Query mutations don't run in this test environment, so payee
// creation is mocked like other mutation hooks in component tests.
const createdPayees: string[] = [];
vi.mock('#payees', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useCreatePayeeMutation: () => ({
    mutateAsync: async ({ name }: { name: string }) => {
      createdPayees.push(name);
      return 'payee-new';
    },
  }),
}));

// jsdom does not implement matchMedia
window.matchMedia = (query: string): MediaQueryList => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(() => false),
});

const categoryGroups = [
  {
    id: 'group-usual',
    name: 'Usual Expenses',
    categories: [
      { id: 'cat-groceries', name: 'Groceries', group: 'group-usual' },
    ],
  },
];

const parsedTargetPurchase: QuickAddResult = {
  date: { value: '2026-10-18', confidence: 'high', text: 'yesterday' },
  amount: { value: 4000, confidence: 'high', text: '$40' },
  direction: { value: 'outflow', confidence: 'high', text: 'Spent' },
  payee: {
    value: { id: 'payee-target', name: 'Target' },
    confidence: 'high',
    text: 'Target',
  },
  category: { value: 'cat-groceries', confidence: 'high', text: 'groceries' },
  isUnparsed: false,
};

describe('QuickAddTransactionModal', () => {
  let addedTransactions: TransactionEntity[][];
  let onAdded: Mock<() => void>;

  let saveError: Error | null;

  beforeEach(() => {
    saveError = null;
    addedTransactions = [];
    createdPayees.length = 0;
    onAdded = vi.fn();

    initServer({
      'rules-run': async ({ transaction }) => transaction,
      query: async () => ({ data: [], dependencies: [] }),
      'get-cell': async () => ({ name: 'cell', value: 0 }),
      'payees-get': async () => [{ id: 'payee-target', name: 'Target' }],
      'transactions-batch-update': async ({ added = [] }) => {
        if (saveError) {
          throw saveError;
        }
        addedTransactions.push(added);
        return { added: [], updated: [], deleted: [], errors: [] };
      },
    });
  });

  function renderModal(parsed: QuickAddResult, accountId: string | null) {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(payeeQueries.list().queryKey, [
      { id: 'payee-target', name: 'Target' },
    ]);
    queryClient.setQueryData(categoryQueries.list().queryKey, {
      grouped: categoryGroups,
      list: categoryGroups.flatMap(group => group.categories),
    });
    queryClient.setQueryData(accountQueries.list().queryKey, [
      { ...generateAccount('Checking'), id: 'account-checking' },
    ]);
    const store = configureTestAppStore({ queryClient });

    render(
      <TestProviders store={store} queryClient={queryClient}>
        <SpreadsheetProvider>
          <QuickAddTransactionModal
            parsed={parsed}
            accountId={accountId}
            onAdded={onAdded}
          />
        </SpreadsheetProvider>
      </TestProviders>,
    );
    return store;
  }

  it('adds the transaction through the normal save path', async () => {
    renderModal(parsedTargetPurchase, 'account-checking');

    expect(screen.getByLabelText('Payee')).toHaveValue('Target');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(onAdded).toHaveBeenCalledTimes(1));
    expect(addedTransactions).toHaveLength(1);
    expect(addedTransactions[0]).toEqual([
      expect.objectContaining({
        date: '2026-10-18',
        account: 'account-checking',
        payee: 'payee-target',
        category: 'cat-groceries',
        amount: -4000,
        cleared: false,
      }),
    ]);
    expect(createdPayees).toEqual([]);
  });

  it('creates a new payee when the name does not exist', async () => {
    renderModal(
      {
        ...parsedTargetPurchase,
        payee: {
          value: { id: null, name: 'Landlord' },
          confidence: 'low',
          text: 'Landlord',
        },
      },
      'account-checking',
    );

    expect(
      screen.getByText('A new payee will be created.'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(onAdded).toHaveBeenCalledTimes(1));
    expect(createdPayees).toEqual(['Landlord']);
    expect(addedTransactions[0][0].payee).toBe('payee-new');
  });

  it('reports a failed save and keeps the preview open', async () => {
    saveError = new Error('disk full');
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const store = renderModal(parsedTargetPurchase, 'account-checking');

    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() =>
      expect(store.getState().notifications.notifications).toEqual([
        expect.objectContaining({
          type: 'error',
          message:
            'There was an error adding the transaction. Please try again.',
          pre: 'disk full',
        }),
      ]),
    );
    expect(onAdded).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled();
    expect(consoleError).toHaveBeenCalledWith(
      'Error adding transaction:',
      saveError,
    );
    consoleError.mockRestore();
  });

  it('keeps an inflow when the amount is typed in the preview', async () => {
    renderModal(
      {
        ...parsedTargetPurchase,
        amount: { value: null, confidence: 'none' },
        direction: { value: 'inflow', confidence: 'high', text: 'received' },
      },
      'account-checking',
    );

    const amountInput = screen.getByLabelText('Amount (inflow)');
    await userEvent.type(amountInput, '500');
    await userEvent.tab();
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(onAdded).toHaveBeenCalledTimes(1));
    expect(addedTransactions[0][0].amount).toBe(50000);
  });

  it('requires an account to be picked when none is given', () => {
    renderModal(parsedTargetPurchase, null);

    expect(screen.getByText('Choose an account.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  });

  it('points out an assumed direction', () => {
    renderModal(
      {
        ...parsedTargetPurchase,
        direction: { value: 'outflow', confidence: 'low' },
      },
      'account-checking',
    );

    expect(
      screen.getByText(
        'Assumed to be money spent. Use the +/− button to change it.',
      ),
    ).toBeInTheDocument();
  });

  it('points out an unmatched category', () => {
    renderModal(
      {
        ...parsedTargetPurchase,
        payee: { value: null, confidence: 'none' },
        category: { value: null, confidence: 'none', text: 'snacks' },
      },
      'account-checking',
    );

    expect(
      screen.getByText(
        'No category named "snacks". Choose one or leave it empty.',
      ),
    ).toBeInTheDocument();
  });
});
