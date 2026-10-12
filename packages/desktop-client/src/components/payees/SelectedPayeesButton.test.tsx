import React from 'react';

import type { PayeeEntity } from '@actual-app/core/types/models';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SelectedProvider, useSelected } from '#hooks/useSelected';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { SelectedPayeesButton } from './SelectedPayeesButton';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const payees = [
  { id: 'payee-1', name: 'Kroger' },
  { id: 'payee-2', name: 'Publix' },
  { id: 'payee-3', name: 'Transfer: Savings', transfer_acct: 'account-1' },
] as PayeeEntity[];

const payeesById = Object.fromEntries(payees.map(payee => [payee.id, payee]));

type HarnessProps = {
  selectedIds: string[];
  onDelete: () => void;
  onMerge: () => Promise<void>;
};

function Harness({ selectedIds, onDelete, onMerge }: HarnessProps) {
  const selected = useSelected('payees', payees, selectedIds);

  return (
    <SelectedProvider instance={selected}>
      <SelectedPayeesButton
        payeesById={payeesById}
        onDelete={onDelete}
        onMerge={onMerge}
        onFavorite={vi.fn()}
        onLearn={vi.fn()}
      />
    </SelectedProvider>
  );
}

function renderButton(
  selectedIds: string[],
  prefs: Parameters<typeof mergeSyncedPrefs>[0] = {},
) {
  const queryClient = createTestQueryClient();
  const store = configureTestAppStore({ queryClient });
  store.dispatch(mergeSyncedPrefs(prefs));
  const onDelete = vi.fn();
  const onMerge = vi.fn(() => Promise.resolve());

  render(
    <TestProviders store={store} queryClient={queryClient}>
      <Harness
        selectedIds={selectedIds}
        onDelete={onDelete}
        onMerge={onMerge}
      />
    </TestProviders>,
  );

  return { onDelete, onMerge };
}

async function openMenu() {
  await userEvent.click(screen.getByTestId('selected-payees-select-button'));
  return screen.getByTestId('selected-payees-select-tooltip');
}

describe('SelectedPayeesButton', () => {
  it('renders nothing without a selection', () => {
    renderButton([]);

    expect(
      screen.queryByTestId('selected-payees-select-button'),
    ).not.toBeInTheDocument();
  });

  it('only merges when two or more payees are selected', async () => {
    const { onMerge } = renderButton(['payee-1']);
    const menu = await openMenu();

    await userEvent.click(within(menu).getByText('Merge'));

    expect(onMerge).not.toHaveBeenCalled();
  });

  it('merges the selected payees', async () => {
    const { onMerge } = renderButton(['payee-1', 'payee-2']);
    const menu = await openMenu();

    await userEvent.click(within(menu).getByText('Merge'));

    expect(onMerge).toHaveBeenCalledTimes(1);
  });

  it('does not edit transfer payees', async () => {
    const { onDelete } = renderButton(['payee-1', 'payee-3']);
    const menu = await openMenu();

    await userEvent.click(within(menu).getByText('Delete'));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it('hides category learning when learning is off', async () => {
    renderButton(['payee-1'], { 'learn-categories': 'false' });
    const menu = await openMenu();

    expect(
      within(menu).queryByText('Category Learning'),
    ).not.toBeInTheDocument();
  });

  it('lists the selected payees', async () => {
    renderButton(['payee-1', 'payee-2']);
    const menu = await openMenu();

    expect(within(menu).getByText('Kroger, Publix')).toBeInTheDocument();
  });
});
