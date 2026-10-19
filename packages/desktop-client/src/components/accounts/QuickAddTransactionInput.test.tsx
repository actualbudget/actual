import React from 'react';

import { initServer } from '@actual-app/core/platform/client/connection';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Mock } from 'vitest';

import { categoryQueries } from '#budget';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { payeeQueries } from '#payees';

import { QuickAddTransactionInput } from './QuickAddTransactionInput';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const categoryGroups = [
  {
    id: 'group-usual',
    name: 'Usual Expenses',
    categories: [
      { id: 'cat-groceries', name: 'Groceries', group: 'group-usual' },
    ],
  },
];

describe('QuickAddTransactionInput', () => {
  let store: ReturnType<typeof configureTestAppStore>;
  let onAdded: Mock<() => void>;

  function renderInput(accountId: string | null = 'account-checking') {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(payeeQueries.list().queryKey, [
      { id: 'payee-target', name: 'Target' },
    ]);
    queryClient.setQueryData(categoryQueries.list().queryKey, {
      grouped: categoryGroups,
      list: categoryGroups.flatMap(group => group.categories),
    });
    store = configureTestAppStore({ queryClient });

    render(
      <TestProviders store={store} queryClient={queryClient}>
        <QuickAddTransactionInput accountId={accountId} onAdded={onAdded} />
      </TestProviders>,
    );
    return screen.getByRole('textbox', { name: 'Quick Add' });
  }

  function openModals() {
    return store.getState().modals.modalStack;
  }

  beforeEach(() => {
    initServer({});
    onAdded = vi.fn();
  });

  it('opens the preview with the parsed fields on Enter', async () => {
    const input = renderInput();

    await userEvent.type(
      input,
      'Spent $40 at Target on groceries yesterday{Enter}',
    );

    const [modal] = openModals();
    expect(modal.name).toBe('quick-add-transaction');
    if (modal.name !== 'quick-add-transaction') {
      return;
    }
    expect(modal.options.accountId).toBe('account-checking');
    expect(modal.options.parsed.amount.value).toBe(4000);
    expect(modal.options.parsed.payee.value).toEqual({
      id: 'payee-target',
      name: 'Target',
    });
    expect(modal.options.parsed.category.value).toBe('cat-groceries');
    // Tests run with a fixed "today" of 2017-01-01
    expect(modal.options.parsed.date.value).toBe('2016-12-31');
  });

  it('does not pick an account on pages showing several accounts', async () => {
    const input = renderInput(null);

    await userEvent.type(input, 'paid 5 to Target{Enter}');

    const [modal] = openModals();
    expect(
      modal.name === 'quick-add-transaction' && modal.options.accountId,
    ).toBe(null);
  });

  it('clears the text on Escape', async () => {
    const input = renderInput();

    await userEvent.type(input, 'paid 5 to Target{Escape}');

    expect((input as HTMLInputElement).value).toBe('');
    expect(openModals()).toEqual([]);
  });

  it('does nothing when Enter is pressed with no text', async () => {
    const input = renderInput();

    await userEvent.type(input, '{Enter}');

    expect(openModals()).toEqual([]);
  });

  it('clears the text once the transaction is added', async () => {
    const input = renderInput();

    await userEvent.type(input, 'paid 5 to Target{Enter}');
    const [modal] = openModals();
    if (modal.name === 'quick-add-transaction') {
      act(() => modal.options.onAdded());
    }

    expect(onAdded).toHaveBeenCalledTimes(1);
    expect((input as HTMLInputElement).value).toBe('');
  });
});
