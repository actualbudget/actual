// TanStack Table column model for the transaction table.
//
// The user-facing column configuration (ids, order, visibility, column-manager
// predicates) lives in `./columns`. This module layers a typed TanStack
// `ColumnDef` model on top of it, gathering the per-column knowledge that
// otherwise lives inline in `TransactionsTable.tsx` — header cell layout
// (width, alignment, margins), sortability, and the keyboard-navigator field
// mapping — into one place so the header and the `getFields*` helpers can
// derive from it instead of maintaining their own copies.

import {
  isPreviewId,
  isTemporaryId,
} from '@actual-app/core/shared/transactions';
import type { TransactionEntity } from '@actual-app/core/types/models';
import type { ColumnDef, RowData } from '@tanstack/react-table';

import {
  isTransactionTableColumnAvailableInChildRows,
  isTransactionTableColumnDisplayOnly,
  TRANSACTION_TABLE_COLUMN_IDS,
} from './columns';
import type { TransactionTableColumnId } from './columns';

type AlignItems = 'flex' | 'flex-start' | 'flex-end' | 'center';

// Metadata carried on each TanStack column. It captures everything the header
// and the field-list derivation need so the visual layer stays identical to
// the hand-written markup.
export type TransactionColumnMeta = {
  /** Fixed pixel width, or `'flex'` to grow. */
  width: number | 'flex';
  alignItems?: AlignItems;
  marginLeft?: number;
  marginRight?: number;
  /**
   * Direction used the first time the column header is clicked; columns
   * without one aren't sortable.
   */
  sortDirection?: 'asc' | 'desc';
  /** Keyboard-navigator field id (`payment`/`deposit` map to `debit`/`credit`). */
  fieldId: string;
  /** Display-only columns render plain values and are skipped by keyboard navigation. */
  isDisplayOnly: boolean;
  /** Whether the field can be focused in child (split) rows. */
  isAvailableInChildRows: boolean;
};

// Augment TanStack's column meta so `column.columnDef.meta` is fully typed.
// The generic parameters must match TanStack's own `ColumnMeta` signature for
// declaration merging to apply.
declare module '@tanstack/react-table' {
  // Module augmentation requires `interface` for declaration merging; a `type`
  // alias would not merge into TanStack's existing `ColumnMeta` interface.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface ColumnMeta<
    TData extends RowData,
    TValue,
  > extends TransactionColumnMeta {}
}

// `ColumnDef` makes `id`/`meta` optional; the model requires both so consumers
// never need non-null assertions.
export type TransactionColumnDef = ColumnDef<TransactionEntity> & {
  id: TransactionTableColumnId;
  meta: TransactionColumnMeta;
};

/** The keyboard-navigator field id backing a column. */
export function columnIdToFieldId(id: TransactionTableColumnId): string {
  // The payment/deposit columns map to the debit/credit fields
  return id === 'payment' ? 'debit' : id === 'deposit' ? 'credit' : id;
}

// Header cell layout and sortability per column. This mirrors the legacy
// `headerConfig` in `TransactionHeader` (minus the translated labels, which
// stay in the component so the i18n extractor can find them).
const COLUMN_LAYOUT: Record<
  TransactionTableColumnId,
  Pick<
    TransactionColumnMeta,
    'width' | 'alignItems' | 'marginLeft' | 'marginRight' | 'sortDirection'
  >
> = {
  date: {
    width: 110,
    alignItems: 'flex',
    marginLeft: -5,
    sortDirection: 'desc',
  },
  account: {
    width: 'flex',
    alignItems: 'flex',
    marginLeft: -5,
    sortDirection: 'asc',
  },
  payee: {
    width: 'flex',
    alignItems: 'flex',
    marginLeft: -5,
    sortDirection: 'asc',
  },
  notes: {
    width: 'flex',
    alignItems: 'flex',
    marginLeft: -5,
    sortDirection: 'asc',
  },
  group: {
    width: 'flex',
    alignItems: 'flex',
    marginLeft: -5,
  },
  category: {
    width: 'flex',
    alignItems: 'flex',
    marginLeft: -5,
    sortDirection: 'asc',
  },
  payment: {
    width: 100,
    alignItems: 'flex-end',
    marginRight: -5,
    sortDirection: 'asc',
  },
  deposit: {
    width: 100,
    alignItems: 'flex-end',
    marginRight: -5,
    sortDirection: 'desc',
  },
  balance: {
    width: 103,
    alignItems: 'flex-end',
    marginRight: -5,
  },
  cleared: {
    width: 38,
    alignItems: 'center',
    sortDirection: 'asc',
  },
};

function buildColumnDef(id: TransactionTableColumnId): TransactionColumnDef {
  return {
    id,
    meta: {
      ...COLUMN_LAYOUT[id],
      fieldId: columnIdToFieldId(id),
      isDisplayOnly: isTransactionTableColumnDisplayOnly(id),
      isAvailableInChildRows: isTransactionTableColumnAvailableInChildRows(id),
    },
  };
}

// The canonical column model, in default order.
export const TRANSACTION_COLUMNS: TransactionColumnDef[] =
  TRANSACTION_TABLE_COLUMN_IDS.map(buildColumnDef);

const COLUMNS_BY_ID = new Map(TRANSACTION_COLUMNS.map(col => [col.id, col]));

/**
 * Resolve the user's ordered visible column ids to column defs, preserving
 * the given order.
 */
export function getOrderedColumns(
  visibleColumns: TransactionTableColumnId[],
): TransactionColumnDef[] {
  return visibleColumns.flatMap(id => {
    const col = COLUMNS_BY_ID.get(id);
    return col ? [col] : [];
  });
}

/**
 * Compute the keyboard-navigable fields for a row from the visible columns,
 * reproducing the legacy `getFields` logic exactly:
 *  - display-only columns are never focusable;
 *  - child rows keep only the fields available in child rows;
 *  - new-transaction rows append the `cancel`/`add` buttons;
 *  - preview rows expose only `select`;
 *  - temporary rows drop their leading field.
 */
export function deriveTransactionFields(
  item: TransactionEntity | undefined,
  visibleColumns: TransactionTableColumnId[],
  { isNewTransaction }: { isNewTransaction: boolean },
): string[] {
  const focusable = getOrderedColumns(visibleColumns)
    .map(col => col.meta)
    .filter(m => !m.isDisplayOnly);

  let fields = item?.is_child
    ? [
        'select',
        ...focusable.filter(m => m.isAvailableInChildRows).map(m => m.fieldId),
      ]
    : [
        'select',
        ...focusable.map(m => m.fieldId),
        ...(isNewTransaction ? ['cancel', 'add'] : []),
      ];

  if (item?.id && isPreviewId(item.id)) {
    fields = ['select'];
  }
  if (item?.id && isTemporaryId(item.id)) {
    // You can't focus the select/delete button of temporary transactions.
    fields = fields.slice(1);
  }

  return fields;
}
