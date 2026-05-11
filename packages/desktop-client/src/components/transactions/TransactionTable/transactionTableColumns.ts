import type { TransactionColumnId, VisibleTransactionColumn } from './types';

type TransactionTableVariantOptions = {
  showAccount: boolean;
  showCategory: boolean;
  showBalances: boolean;
  showCleared: boolean;
  showSelection: boolean;
};

const TRANSACTION_COLUMN_CONFIG: Record<
  TransactionColumnId,
  {
    defaultWidth: number;
    minWidth: number;
  }
> = {
  date: { defaultWidth: 110, minWidth: 90 },
  account: { defaultWidth: 180, minWidth: 120 },
  payee: { defaultWidth: 220, minWidth: 140 },
  notes: { defaultWidth: 220, minWidth: 120 },
  category: { defaultWidth: 180, minWidth: 120 },
  payment: { defaultWidth: 120, minWidth: 90 },
  deposit: { defaultWidth: 120, minWidth: 90 },
  balance: { defaultWidth: 120, minWidth: 90 },
};

export const TRANSACTION_DATA_COLUMN_ORDER: TransactionColumnId[] = [
  'date',
  'account',
  'payee',
  'notes',
  'category',
  'payment',
  'deposit',
  'balance',
];

export const TRANSACTION_SELECTION_COLUMN_WIDTH = 20;
export const TRANSACTION_CLEARED_COLUMN_WIDTH = 38;

export function getDefaultTransactionColumnWidth(
  columnId: TransactionColumnId,
) {
  return TRANSACTION_COLUMN_CONFIG[columnId].defaultWidth;
}

export function getMinTransactionColumnWidth(columnId: TransactionColumnId) {
  return TRANSACTION_COLUMN_CONFIG[columnId].minWidth;
}

export function getVisibleTransactionColumns({
  showAccount,
  showCategory,
  showBalances,
}: Pick<
  TransactionTableVariantOptions,
  'showAccount' | 'showCategory' | 'showBalances'
>): VisibleTransactionColumn[] {
  return TRANSACTION_DATA_COLUMN_ORDER.filter(columnId => {
    if (columnId === 'account') {
      return showAccount;
    }

    if (columnId === 'category') {
      return showCategory;
    }

    if (columnId === 'balance') {
      return showBalances;
    }

    return true;
  }).map(columnId => ({
    id: columnId,
    defaultWidth: getDefaultTransactionColumnWidth(columnId),
    minWidth: getMinTransactionColumnWidth(columnId),
  }));
}

export function getTransactionTableVariantKey({
  showAccount,
  showCategory,
  showBalances,
  showCleared,
  showSelection,
}: TransactionTableVariantOptions) {
  return [
    `account:${Number(showAccount)}`,
    `category:${Number(showCategory)}`,
    `balance:${Number(showBalances)}`,
    `cleared:${Number(showCleared)}`,
    `selection:${Number(showSelection)}`,
  ].join('|');
}

export function getTransactionTableUtilityWidth({
  showCleared,
  showSelection,
}: Pick<TransactionTableVariantOptions, 'showCleared' | 'showSelection'>) {
  return (
    TRANSACTION_SELECTION_COLUMN_WIDTH +
    (showCleared ? TRANSACTION_CLEARED_COLUMN_WIDTH : 0)
  );
}
