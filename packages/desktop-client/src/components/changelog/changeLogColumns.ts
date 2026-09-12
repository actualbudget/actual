import type { ChangeLogColumn } from '@actual-app/core/server/changelog/types';

import { DEFAULT_AMOUNT_COLUMN_WIDTHS } from '#components/transactions/TransactionsTable';

/**
 * The transaction columns the change log mirrors, in register order.
 *
 * `amount` is split across two columns exactly as the register does it: a
 * negative amount is a Payment, a positive one a Deposit.
 */
export type ChangeLogColumnSpec = {
  id:
    | 'date'
    | 'account'
    | 'payee'
    | 'notes'
    | 'category'
    | 'payment'
    | 'deposit';
  /** Which snapshot field decides whether this column shows a diff. */
  field: ChangeLogColumn;
  width: number | 'flex';
  /** Only meaningful on a `flex` column, to keep a wrapped diff readable. */
  minWidth?: number;
  textAlign?: 'left' | 'right';
};

/**
 * Notes is the only elastic column: it is the one most likely to hold a long
 * `old -> new` diff, so it takes whatever width the others leave behind.
 */
export const CHANGE_LOG_COLUMNS: ChangeLogColumnSpec[] = [
  { id: 'date', field: 'date', width: 110 },
  { id: 'account', field: 'account', width: 145 },
  { id: 'payee', field: 'payee', width: 150 },
  { id: 'notes', field: 'notes', width: 'flex', minWidth: 210 },
  { id: 'category', field: 'category', width: 150 },
  {
    id: 'payment',
    field: 'amount',
    width: DEFAULT_AMOUNT_COLUMN_WIDTHS.amount,
    textAlign: 'right',
  },
  {
    id: 'deposit',
    field: 'amount',
    width: DEFAULT_AMOUNT_COLUMN_WIDTHS.amount,
    textAlign: 'right',
  },
];

/**
 * Widths of the columns that describe the change event itself rather than the
 * transaction it changed: the leading "When" and "Change type" pair and the
 * trailing "Device".
 */
export const WHEN_COLUMN_WIDTH = 110;
export const CHANGE_TYPE_COLUMN_WIDTH = 120;
export const DEVICE_COLUMN_WIDTH = 130;
