import type { TransactionEntity } from '@actual-app/core/types/models';

import {
  columnIdToFieldId,
  deriveTransactionFields,
  getOrderedColumns,
  getTransactionColumnWidth,
  TRANSACTION_COLUMNS,
} from './columnModel';
import {
  isTransactionTableColumnAvailableInChildRows,
  isTransactionTableColumnDisplayOnly,
  TRANSACTION_TABLE_COLUMN_IDS,
} from './columns';
import type { TransactionTableColumnId } from './columns';

// Verbatim copy of the legacy `getFields`/`getFocusableFields` logic from
// `TransactionsTable.tsx`. The new column-model-driven derivation must produce
// identical output.
function legacyColumnToField(columnId: TransactionTableColumnId) {
  return columnId === 'payment'
    ? 'debit'
    : columnId === 'deposit'
      ? 'credit'
      : columnId;
}

function legacyGetFields(
  item: TransactionEntity | undefined,
  visibleColumns: TransactionTableColumnId[],
  isNewTransaction: boolean,
) {
  const focusableFields = visibleColumns
    .filter(columnId => !isTransactionTableColumnDisplayOnly(columnId))
    .map(legacyColumnToField);

  let fields = isNewTransaction
    ? ['select', ...focusableFields, 'cancel', 'add']
    : ['select', ...focusableFields];

  fields = item?.is_child
    ? [
        'select',
        ...visibleColumns
          .filter(
            columnId =>
              isTransactionTableColumnAvailableInChildRows(columnId) &&
              !isTransactionTableColumnDisplayOnly(columnId),
          )
          .map(legacyColumnToField),
      ]
    : fields;

  if (item?.id && item.id.indexOf('preview/') !== -1) {
    fields = ['select'];
  }
  if (item?.id && item.id.indexOf('temp') !== -1) {
    fields = fields.slice(1);
  }

  return fields;
}

const items: Array<TransactionEntity | undefined> = [
  undefined,
  { id: 'normal-1', is_child: false } as TransactionEntity,
  { id: 'child-1', is_child: true } as TransactionEntity,
  { id: 'preview/abc', is_child: false } as TransactionEntity,
  { id: 'temp-1', is_child: false } as TransactionEntity,
  { id: 'temp-child-1', is_child: true } as TransactionEntity,
  { id: 'preview/child', is_child: true } as TransactionEntity,
];

const columnSets: TransactionTableColumnId[][] = [
  // Default order, everything visible
  [...TRANSACTION_TABLE_COLUMN_IDS],
  // Typical account view: no account/group/balance columns
  ['date', 'payee', 'notes', 'category', 'payment', 'deposit', 'cleared'],
  // User-reordered columns
  ['date', 'payment', 'deposit', 'payee', 'category', 'notes'],
  // Display-only columns mixed in
  ['date', 'group', 'payee', 'balance', 'deposit'],
  // Minimal
  ['date', 'payment', 'deposit'],
];

describe('transaction column model', () => {
  it('covers every column id in the default order', () => {
    expect(TRANSACTION_COLUMNS.map(col => col.id)).toEqual([
      ...TRANSACTION_TABLE_COLUMN_IDS,
    ]);
  });

  it('keeps the legacy column widths', () => {
    // These widths are shared by the header and the row cells in BOTH the
    // legacy and v2 rendering paths, so changing them changes the table's
    // layout for everyone.
    const legacyWidths: Record<TransactionTableColumnId, number | 'flex'> = {
      date: 110,
      account: 'flex',
      payee: 'flex',
      notes: 'flex',
      group: 'flex',
      category: 'flex',
      payment: 100,
      deposit: 100,
      balance: 103,
      cleared: 38,
    };
    for (const id of TRANSACTION_TABLE_COLUMN_IDS) {
      expect(getTransactionColumnWidth(id)).toBe(legacyWidths[id]);
    }
  });

  it('maps payment/deposit columns to the debit/credit fields', () => {
    expect(columnIdToFieldId('payment')).toBe('debit');
    expect(columnIdToFieldId('deposit')).toBe('credit');
    expect(columnIdToFieldId('date')).toBe('date');
  });

  it('mirrors the column-manager predicates in the column meta', () => {
    for (const col of TRANSACTION_COLUMNS) {
      expect(col.meta.isDisplayOnly).toBe(
        isTransactionTableColumnDisplayOnly(col.id),
      );
      expect(col.meta.isAvailableInChildRows).toBe(
        isTransactionTableColumnAvailableInChildRows(col.id),
      );
    }
  });

  it('preserves the given column order', () => {
    const reordered: TransactionTableColumnId[] = ['cleared', 'payee', 'date'];
    expect(getOrderedColumns(reordered).map(col => col.id)).toEqual(reordered);
  });

  it('matches the legacy getFields for table transactions', () => {
    for (const item of items) {
      for (const visibleColumns of columnSets) {
        expect(
          deriveTransactionFields(item, visibleColumns, {
            isNewTransaction: false,
          }),
        ).toEqual(legacyGetFields(item, visibleColumns, false));
      }
    }
  });

  it('matches the legacy getFields for new transactions', () => {
    for (const item of items) {
      for (const visibleColumns of columnSets) {
        expect(
          deriveTransactionFields(item, visibleColumns, {
            isNewTransaction: true,
          }),
        ).toEqual(legacyGetFields(item, visibleColumns, true));
      }
    }
  });
});
