import type { TransactionEntity } from '@actual-app/core/types/models';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { TestProviders } from '#mocks';

import { ConfirmTransferLinkModal } from './ConfirmTransferLinkModal';

const offBudgetById: Record<string, boolean> = {
  checking: false,
  savings: false,
  investment: true,
};

vi.mock('#hooks/useAccount', () => ({
  useAccount: (id: string) => ({
    id,
    name: id,
    offbudget: offBudgetById[id],
  }),
}));

vi.mock('#hooks/usePayee', () => ({
  usePayee: () => ({ data: undefined }),
}));

function renderModal(fromAccount: string, match: Partial<TransactionEntity>) {
  render(
    <TestProviders>
      <ConfirmTransferLinkModal
        fromAccount={fromAccount}
        match={
          {
            id: 'match',
            account: 'savings',
            amount: 50000,
            date: '2026-11-10',
            reconciled: true,
            category: 'food',
            ...match,
          } satisfies Partial<TransactionEntity> as TransactionEntity
        }
        onLink={vi.fn()}
        onCreateNew={vi.fn()}
      />
    </TestProviders>,
  );
}

const clearsNote =
  'This transaction is reconciled. Linking changes its payee and clears its category.';
const payeeNote = 'This transaction is reconciled. Linking changes its payee.';

describe('ConfirmTransferLinkModal', () => {
  it('says the category is cleared between two on-budget accounts', () => {
    renderModal('checking', {});
    expect(screen.getByText(clearsNote)).toBeInTheDocument();
  });

  it('only mentions the payee when one account is off budget', () => {
    renderModal('investment', {});
    expect(screen.getByText(payeeNote)).toBeInTheDocument();
  });

  it('only mentions the payee when the match has no category', () => {
    renderModal('checking', { category: undefined });
    expect(screen.getByText(payeeNote)).toBeInTheDocument();
  });

  it('creates a new counterpart when the modal is removed without a choice', () => {
    const onCreateNew = vi.fn();
    const { unmount } = render(
      <TestProviders>
        <ConfirmTransferLinkModal
          fromAccount="checking"
          match={
            {
              id: 'match',
              account: 'savings',
              amount: 50000,
              date: '2026-11-10',
            } satisfies Partial<TransactionEntity> as TransactionEntity
          }
          onLink={vi.fn()}
          onCreateNew={onCreateNew}
        />
      </TestProviders>,
    );
    unmount();
    expect(onCreateNew).toHaveBeenCalled();
  });

  it('shows no note for an unreconciled match', () => {
    renderModal('checking', { reconciled: false });
    expect(screen.queryByText(/reconciled/)).not.toBeInTheDocument();
  });
});
