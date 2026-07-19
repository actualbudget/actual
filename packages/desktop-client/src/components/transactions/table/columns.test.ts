import type { TransactionEntity } from '@actual-app/core/types/models';

import {
  CHILD_TRANSACTION_FIELDS,
  deriveTransactionFields,
  getVisibleHeaderColumns,
  NEW_TRANSACTION_FIELDS,
  TABLE_TRANSACTION_FIELDS,
} from './columns';
import type { TransactionColumnVisibility } from './columns';

// Verbatim copy of the legacy `getFields` logic from `TransactionsTable.tsx`.
// The new column-model-driven derivation must produce identical output.
const LEGACY_TABLE_FIELDS = [
  'select',
  'date',
  'account',
  'payee',
  'notes',
  'category',
  'debit',
  'credit',
  'cleared',
];
const LEGACY_NEW_FIELDS = [...LEGACY_TABLE_FIELDS, 'cancel', 'add'];

function legacyGetFields(
  item: TransactionEntity | undefined,
  baseFields: string[],
  showAccount: boolean,
  showCategory: boolean,
) {
  let fields = item?.is_child
    ? ['select', 'payee', 'notes', 'category', 'debit', 'credit']
    : baseFields.filter(
        f =>
          (showAccount || f !== 'account') &&
          (showCategory || f !== 'category'),
      );

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

const visibilities: TransactionColumnVisibility[] = [
  {
    showAccount: true,
    showCategory: true,
    showBalance: true,
    showCleared: true,
  },
  {
    showAccount: false,
    showCategory: true,
    showBalance: true,
    showCleared: true,
  },
  {
    showAccount: true,
    showCategory: false,
    showBalance: true,
    showCleared: true,
  },
  {
    showAccount: false,
    showCategory: false,
    showBalance: false,
    showCleared: false,
  },
];

describe('transaction column model', () => {
  it('derives the same base field lists as the legacy table', () => {
    expect(TABLE_TRANSACTION_FIELDS).toEqual(LEGACY_TABLE_FIELDS);
    expect(NEW_TRANSACTION_FIELDS).toEqual(LEGACY_NEW_FIELDS);
    expect(CHILD_TRANSACTION_FIELDS).toEqual([
      'select',
      'payee',
      'notes',
      'category',
      'debit',
      'credit',
    ]);
  });

  it('matches legacy getFields for table transactions across all row kinds', () => {
    for (const item of items) {
      for (const visibility of visibilities) {
        expect(
          deriveTransactionFields(item, TABLE_TRANSACTION_FIELDS, visibility),
        ).toEqual(
          legacyGetFields(
            item,
            LEGACY_TABLE_FIELDS,
            visibility.showAccount,
            visibility.showCategory,
          ),
        );
      }
    }
  });

  it('matches legacy getFields for new transactions across all row kinds', () => {
    for (const item of items) {
      for (const visibility of visibilities) {
        expect(
          deriveTransactionFields(item, NEW_TRANSACTION_FIELDS, visibility),
        ).toEqual(
          legacyGetFields(
            item,
            LEGACY_NEW_FIELDS,
            visibility.showAccount,
            visibility.showCategory,
          ),
        );
      }
    }
  });

  it('returns the expected visible header columns', () => {
    const allVisible = getVisibleHeaderColumns({
      showAccount: true,
      showCategory: true,
      showBalance: true,
      showCleared: true,
    });
    expect(allVisible.map(c => c.id)).toEqual([
      'select',
      'date',
      'account',
      'payee',
      'notes',
      'category',
      'debit',
      'credit',
      'balance',
      'cleared',
    ]);

    const minimal = getVisibleHeaderColumns({
      showAccount: false,
      showCategory: false,
      showBalance: false,
      showCleared: false,
    });
    expect(minimal.map(c => c.id)).toEqual([
      'select',
      'date',
      'payee',
      'notes',
      'debit',
      'credit',
    ]);
  });
});
