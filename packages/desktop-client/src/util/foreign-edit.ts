import { q } from '@actual-app/core/shared/query';
import type {
  AccountEntity,
  PayeeEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';
import type { TFunction } from 'i18next';

import { toForeignDraft } from '#accounts/registerView';
import { pushModal } from '#modals/modalsSlice';
import type { Modal } from '#modals/modalsSlice';
import { aqlQuery } from '#queries/aqlQuery';
import type { AppDispatch, RootState } from '#redux/store';

import { exchangeOtherAccount } from './exchange-entry';

/**
 * Opens an edit dialog unless one of its kind is already open: a register
 * cell can report one edit twice (on commit and on blur).
 */
export function pushEditModal(dispatch: AppDispatch, modal: Modal) {
  dispatch((innerDispatch: AppDispatch, getState: () => RootState) => {
    if (!getState().modals.modalStack.some(open => open.name === modal.name)) {
      innerDispatch(pushModal({ modal }));
    }
  });
}

/** A row as an edit dialog read it, sent back as the handler's `expected`. */
export type RowSnapshot = {
  account: string;
  amount: number;
  transaction_amount: number | null;
  date: string;
  /**
   * The category (as the app shows it) and reconciled state, which the
   * budget notice and the reconciled confirmation depend on; a later change
   * makes the save stale.
   */
  category: string | null;
  reconciled: boolean;
};

/** An existing row the foreign amount dialog saves instead of posting. */
export type ForeignAmountEdit = {
  id: string;
  /** Whether any row the save changes is reconciled. */
  reconciled: boolean;
  /** A base amount to start from (a valuation edit in a base register). */
  baseAmount?: number;
} & (
  | { kind: 'entry'; expected: RowSnapshot }
  | {
      kind: 'transfer';
      expected: { leg: RowSnapshot; counterpart: RowSnapshot };
    }
);

export function snapshotOf(row: {
  account: string;
  amount: number;
  transaction_amount?: number | null;
  date: string;
  category?: string | null;
  reconciled?: boolean;
  is_parent?: boolean;
}): RowSnapshot {
  return {
    account: row.account,
    amount: row.amount,
    transaction_amount: row.transaction_amount ?? null,
    date: row.date,
    category: row.is_parent ? null : (row.category ?? null),
    reconciled: !!row.reconciled,
  };
}

/**
 * Asks before a save that changes a reconciled row, with the register's
 * reconciled-edit confirmation. Resolves true when the save may go ahead.
 */
export function confirmReconciledEdit(
  dispatch: AppDispatch,
  reconciled: boolean,
  /** A linked transfer's reconciled counterpart has its own wording. */
  reason:
    | 'editReconciled'
    | 'batchEditWithReconciledTransfer' = 'editReconciled',
): Promise<boolean> {
  if (!reconciled) return Promise.resolve(true);
  return new Promise(resolve => {
    dispatch(
      pushModal({
        modal: {
          name: 'confirm-transaction-edit',
          options: {
            confirmReason: reason,
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false),
          },
        },
      }),
    );
  });
}

export function staleEditMessage(t: TFunction) {
  return t(
    'This transaction changed since you opened it. Close and reopen it to edit the latest values.',
  );
}

/** A translated message for an error a foreign edit handler threw. */
export function foreignEditErrorMessage(t: TFunction, error: unknown) {
  // Handler errors cross the connection as plain objects with the thrown
  // message (and any code), not as Error instances.
  const field = (name: 'message' | 'code') => {
    const value =
      typeof error === 'object' && error !== null
        ? (error as Record<string, unknown>)[name]
        : undefined;
    return typeof value === 'string' ? value : undefined;
  };
  const code = field('message') ?? field('code') ?? String(error);
  switch (code) {
    case 'foreign-split-unbalanced':
      return t('The split amounts must add up to the total.');
    case 'foreign-split-unavailable':
      return t('Transfers between currencies cannot be split.');
    case 'foreign-transfer-edit-unavailable':
      return t('Transfers cannot be part of a split in this account.');
    case 'foreign-import-identity-conflict':
      return t(
        'This fee was imported from your bank, so it cannot be removed.',
      );
    case 'exchange-fee-invalid':
      return t('The fee must be smaller than the amount transferred.');
    case 'date-invalid':
      return t('Enter a valid date.');
    default:
      return t('This transaction could not be saved.');
  }
}

type FamilyRow = {
  id: string;
  account: string;
  payee?: string | null;
  transfer_id?: string | null;
  is_parent?: boolean;
  is_child?: boolean;
  parent_id?: string | null;
};

/**
 * Whether a row belongs to an exchange family: a leg linked to an account in
 * another encoding, or a fee parent or fee child whose family holds one.
 */
export function isExchangeRow(
  row: FamilyRow,
  rows: readonly FamilyRow[],
  payees: Parameters<typeof exchangeOtherAccount>[1],
  accounts: Parameters<typeof exchangeOtherAccount>[2],
) {
  const isLeg = (r: FamilyRow) =>
    !!r.transfer_id && exchangeOtherAccount(r, payees, accounts) !== null;
  if (isLeg(row)) return true;
  const parentId = row.is_parent ? row.id : row.is_child ? row.parent_id : null;
  return !!parentId && rows.some(r => r.parent_id === parentId && isLeg(r));
}

type InlineExchangeEdit = (id: string, onSaved: () => void) => void;

let inlineExchangeEdit: InlineExchangeEdit | null = null;

/**
 * Lets the desktop register edit exchange transfers inline, in place of the
 * exchange dialog, while it is shown. Returns the function that removes it.
 */
export function setInlineExchangeEdit(handler: InlineExchangeEdit) {
  inlineExchangeEdit = handler;
  return () => {
    if (inlineExchangeEdit === handler) inlineExchangeEdit = null;
  };
}

/**
 * Opens the editor for a stored row's amounts: the register's inline
 * exchange editor (or the exchange dialog without one) for any exchange row,
 * the split dialog for a foreign split, or the foreign amount dialog for a
 * single foreign row or same-encoding transfer leg.
 * `native` is a typed native amount; `baseAmount` a typed base value (a
 * valuation edit). Returns false when the row needs no dialog.
 */
export async function openForeignEditDialog(
  dispatch: AppDispatch,
  {
    row,
    rows,
    payees,
    accounts,
    native,
    baseAmount,
    onSaved,
  }: {
    /** The stored row: `amount` is its base, `transaction_amount` native. */
    row: TransactionEntity;
    /** The row's family as loaded, to recognize exchange fee rows. */
    rows: readonly TransactionEntity[];
    payees: readonly PayeeEntity[];
    accounts: readonly AccountEntity[];
    native?: number;
    baseAmount?: number;
    onSaved: () => void;
  },
): Promise<boolean> {
  if (isExchangeRow(row, rows, payees, accounts)) {
    if (inlineExchangeEdit) {
      inlineExchangeEdit(row.id, onSaved);
      return true;
    }
    pushEditModal(dispatch, {
      name: 'exchange-transfer',
      options: { edit: { id: row.id, onSaved } },
    });
    return true;
  }
  const account = accounts.find(a => a.id === row.account);
  if (!account?.currency || account.currency_precision == null) return false;
  if (row.is_parent || row.is_child) {
    pushEditModal(dispatch, {
      name: 'foreign-split',
      options: {
        id: row.is_child && row.parent_id ? row.parent_id : row.id,
        onSaved,
      },
    });
    return true;
  }
  const snapshot = snapshotOf(row);
  const start = baseAmount !== undefined ? { baseAmount } : {};
  let edit: ForeignAmountEdit;
  if (row.transfer_id) {
    const { data } = await aqlQuery(
      q('transactions')
        .filter({ id: row.transfer_id })
        .select([
          'id',
          'account',
          'amount',
          'transaction_amount',
          'date',
          'reconciled',
          'category',
        ])
        .options({ splits: 'all' }),
    );
    const counterpart = (data as TransactionEntity[])[0];
    if (!counterpart) return false;
    edit = {
      kind: 'transfer',
      id: row.id,
      expected: { leg: snapshot, counterpart: snapshotOf(counterpart) },
      reconciled: !!row.reconciled || !!counterpart.reconciled,
      ...start,
    };
  } else {
    edit = {
      kind: 'entry',
      id: row.id,
      expected: snapshot,
      reconciled: !!row.reconciled,
      ...start,
    };
  }
  pushEditModal(dispatch, {
    name: 'foreign-amount',
    options: {
      transaction: toForeignDraft({
        ...row,
        amount: native ?? row.transaction_amount ?? 0,
      }),
      currencyCode: account.currency,
      nativePrecision: account.currency_precision,
      edit,
      onPosted: onSaved,
    },
  });
  return true;
}
