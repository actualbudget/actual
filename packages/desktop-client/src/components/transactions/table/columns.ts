// Single source of truth for the transaction table's columns.
//
// Historically the column list lived in three places that had to be kept in
// sync by hand: the `TransactionHeader` JSX, the per-cell rendering in the
// `Transaction` row, and the `getFields*` helpers that feed
// `useTableNavigator`. This module replaces the hand-maintained `getFields`
// arrays (and drives the header) with a declarative model built on TanStack
// Table's `ColumnDef`, so column order, width, alignment, sorting, visibility
// and keyboard-navigation membership are all derived from one place.

import {
  isPreviewId,
  isTemporaryId,
} from '@actual-app/core/shared/transactions';
import type { TransactionEntity } from '@actual-app/core/types/models';
import type { ColumnDef, RowData } from '@tanstack/react-table';

export type TransactionColumnVisibility = {
  showAccount: boolean;
  showCategory: boolean;
  showBalance: boolean;
  showCleared: boolean;
};

type AlignItems = 'flex' | 'flex-start' | 'flex-end' | 'center';

// Metadata carried on each TanStack column. It captures everything the header
// and (eventually) the row renderer need so the visual layer stays identical
// to the legacy table.
export type TransactionColumnMeta = {
  /** Fixed pixel width, or `'flex'` to grow. */
  width: number | 'flex';
  alignItems?: AlignItems;
  marginLeft?: number;
  marginRight?: number;
  /** Sort key passed to `onSort` (e.g. `payment`/`deposit`). Omit if unsortable. */
  sortKey?: string;
  /** Default direction applied the first time this column is sorted. */
  defaultSortDirection?: 'asc' | 'desc';
  /** Visibility flag gating whether the column renders at all. */
  visibility?: keyof TransactionColumnVisibility;
  /** Whether the column appears in the header row (select/cancel/add do not). */
  hasHeader: boolean;
  /** Whether the column is a keyboard-navigable field. */
  isField: boolean;
  /** Membership in each row kind's field list (drives `useTableNavigator`). */
  inTableRow: boolean;
  inNewRow: boolean;
  inChildRow: boolean;
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
type TransactionColumnDef = ColumnDef<TransactionEntity> & {
  id: string;
  meta: TransactionColumnMeta;
};

// The ordered, canonical column model. Order here defines both the visual
// column order and the left-to-right keyboard navigation order.
export const TRANSACTION_COLUMNS: TransactionColumnDef[] = [
  {
    id: 'select',
    meta: {
      width: 20,
      hasHeader: true,
      isField: true,
      inTableRow: true,
      inNewRow: true,
      inChildRow: true,
    },
  },
  {
    id: 'date',
    meta: {
      width: 110,
      alignItems: 'flex',
      marginLeft: -5,
      sortKey: 'date',
      defaultSortDirection: 'desc',
      hasHeader: true,
      isField: true,
      inTableRow: true,
      inNewRow: true,
      inChildRow: false,
    },
  },
  {
    id: 'account',
    meta: {
      width: 'flex',
      alignItems: 'flex',
      marginLeft: -5,
      sortKey: 'account',
      defaultSortDirection: 'asc',
      visibility: 'showAccount',
      hasHeader: true,
      isField: true,
      inTableRow: true,
      inNewRow: true,
      inChildRow: false,
    },
  },
  {
    id: 'payee',
    meta: {
      width: 'flex',
      alignItems: 'flex',
      marginLeft: -5,
      sortKey: 'payee',
      defaultSortDirection: 'asc',
      hasHeader: true,
      isField: true,
      inTableRow: true,
      inNewRow: true,
      inChildRow: true,
    },
  },
  {
    id: 'notes',
    meta: {
      width: 'flex',
      alignItems: 'flex',
      marginLeft: -5,
      sortKey: 'notes',
      defaultSortDirection: 'asc',
      hasHeader: true,
      isField: true,
      inTableRow: true,
      inNewRow: true,
      inChildRow: true,
    },
  },
  {
    id: 'category',
    meta: {
      width: 'flex',
      alignItems: 'flex',
      marginLeft: -5,
      sortKey: 'category',
      defaultSortDirection: 'asc',
      visibility: 'showCategory',
      hasHeader: true,
      isField: true,
      inTableRow: true,
      inNewRow: true,
      inChildRow: true,
    },
  },
  {
    id: 'debit',
    meta: {
      width: 100,
      alignItems: 'flex-end',
      marginRight: -5,
      sortKey: 'payment',
      defaultSortDirection: 'asc',
      hasHeader: true,
      isField: true,
      inTableRow: true,
      inNewRow: true,
      inChildRow: true,
    },
  },
  {
    id: 'credit',
    meta: {
      width: 100,
      alignItems: 'flex-end',
      marginRight: -5,
      sortKey: 'deposit',
      defaultSortDirection: 'desc',
      hasHeader: true,
      isField: true,
      inTableRow: true,
      inNewRow: true,
      inChildRow: true,
    },
  },
  {
    id: 'balance',
    meta: {
      width: 103,
      alignItems: 'flex-end',
      marginRight: -5,
      visibility: 'showBalance',
      hasHeader: true,
      isField: false,
      inTableRow: false,
      inNewRow: false,
      inChildRow: false,
    },
  },
  {
    id: 'cleared',
    meta: {
      width: 38,
      alignItems: 'center',
      sortKey: 'cleared',
      defaultSortDirection: 'asc',
      visibility: 'showCleared',
      hasHeader: true,
      isField: true,
      inTableRow: true,
      inNewRow: true,
      inChildRow: false,
    },
  },
  // Split-row action buttons. They are keyboard-navigable on new transactions
  // but never appear in the header.
  {
    id: 'cancel',
    meta: {
      width: 0,
      hasHeader: false,
      isField: true,
      inTableRow: false,
      inNewRow: true,
      inChildRow: false,
    },
  },
  {
    id: 'add',
    meta: {
      width: 0,
      hasHeader: false,
      isField: true,
      inTableRow: false,
      inNewRow: true,
      inChildRow: false,
    },
  },
];

function fieldIds(predicate: (m: TransactionColumnMeta) => boolean): string[] {
  return TRANSACTION_COLUMNS.filter(
    col => col.meta.isField && predicate(col.meta),
  ).map(col => col.id);
}

// Ordered navigator field lists derived from the column model. These mirror the
// arrays that previously lived inline in `getFieldsTableTransaction`,
// `getFieldsNewTransaction` and the child branch of `getFields`.
export const TABLE_TRANSACTION_FIELDS = fieldIds(m => m.inTableRow);
export const NEW_TRANSACTION_FIELDS = fieldIds(m => m.inNewRow);
export const CHILD_TRANSACTION_FIELDS = fieldIds(m => m.inChildRow);

// Only `account` and `category` are filtered out of a row's field list based on
// visibility (matching the legacy behavior exactly — `cleared`/`balance`
// visibility affects rendering, not navigation).
function isHiddenByVisibility(
  field: string,
  visibility: TransactionColumnVisibility,
): boolean {
  if (field === 'account') return !visibility.showAccount;
  if (field === 'category') return !visibility.showCategory;
  return false;
}

/**
 * Compute the keyboard-navigable fields for a row, reproducing the legacy
 * `getFields` logic exactly:
 *  - child rows use a fixed field list (not visibility-filtered);
 *  - other rows filter the base list by account/category visibility;
 *  - preview rows expose only `select`;
 *  - temporary rows drop their leading field.
 */
export function deriveTransactionFields(
  item: TransactionEntity | undefined,
  baseFields: string[],
  visibility: TransactionColumnVisibility,
): string[] {
  let fields = item?.is_child
    ? CHILD_TRANSACTION_FIELDS
    : baseFields.filter(f => !isHiddenByVisibility(f, visibility));

  if (item?.id && isPreviewId(item.id)) {
    fields = ['select'];
  }
  if (item?.id && isTemporaryId(item.id)) {
    // You can't focus the select/delete button of temporary transactions.
    fields = fields.slice(1);
  }

  return fields;
}

export type TransactionHeaderColumn = {
  id: string;
  meta: TransactionColumnMeta;
};

/** Ordered header columns that should render for the given visibility. */
export function getVisibleHeaderColumns(
  visibility: TransactionColumnVisibility,
): TransactionHeaderColumn[] {
  return TRANSACTION_COLUMNS.filter(col => {
    const m = col.meta;
    return m.hasHeader && (!m.visibility || visibility[m.visibility]);
  }).map(col => ({ id: col.id, meta: col.meta }));
}
