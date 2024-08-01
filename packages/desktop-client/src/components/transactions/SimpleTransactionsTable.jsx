import React, { memo, useMemo, useCallback } from 'react';

import {
  format as formatDate,
  isValid as isDateValid,
  parseISO,
} from 'date-fns';

import {
  getAccountsById,
  getCategoriesById,
} from 'loot-core/src/client/reducers/queries';
import { integerToCurrency } from 'loot-core/src/shared/util';

import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { useDateFormat } from '../../hooks/useDateFormat';
import { usePayees } from '../../hooks/usePayees';
import { useSelectedItems, useSelectedDispatch } from '../../hooks/useSelected';
import { SvgArrowsSynchronize } from '../../icons/v2';
import { styles, theme } from '../../style';
import { Cell, Field, Row, SelectCell, Table } from '../table';
import { DisplayId } from '../util/DisplayId';

function serializeTransaction(transaction, dateFormat) {
  let { date } = transaction;

  if (!isDateValid(parseISO(date))) {
    date = null;
  }

  return {
    ...transaction,
    date: date ? formatDate(parseISO(date), dateFormat) : null,
  };
}

const TransactionRow = memo(function TransactionRow({
  transaction,
  fields,
  categories,
  accounts,
  selected,
}) {
  // TODO: Convert these to use fetched queries
  const c = getCategoriesById(categories)[transaction.category];
  const a = getAccountsById(accounts)[transaction.account];

  const dispatchSelected = useSelectedDispatch();

  return (
    <Row style={{ color: theme.tableText }}>
      <SelectCell
        exposed={true}
        focused={false}
        onSelect={e => {
          dispatchSelected({
            type: 'select',
            id: transaction.id,
            isRangeSelect: e.shiftKey,
          });
        }}
        selected={selected}
      />
      {fields.map((field, i) => {
        switch (field) {
          case 'date':
            return (
              <Field key={i} width={100}>
                {transaction.date}
              </Field>
            );
          case 'imported_payee':
            return (
              <Field key={i} width="flex">
                {transaction.imported_payee}
              </Field>
            );
          case 'payee':
            return (
              <Cell
                key={i}
                width="flex"
                exposed={true}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                }}
              >
                {() => (
                  <>
                    {transaction.schedule && (
                      <SvgArrowsSynchronize
                        style={{
                          width: 13,
                          height: 13,
                          margin: '0 5px',
                        }}
                      />
                    )}
                    <DisplayId type="payees" id={transaction.payee} />
                  </>
                )}
              </Cell>
            );
          case 'category':
            return (
              <Field key={i} width="flex" title={c && c.name}>
                {c ? c.name : ''}
              </Field>
            );
          case 'account':
            return (
              <Field key={i} width="flex" title={a.name}>
                {a.name}
              </Field>
            );
          case 'notes':
            return (
              <Field key={i} width="flex" title={transaction.notes}>
                {transaction.notes}
              </Field>
            );
          case 'amount':
            return (
              <Field
                key={i}
                width={75}
                style={{ textAlign: 'right', ...styles.tnum }}
              >
                {integerToCurrency(transaction.amount)}
              </Field>
            );
          default:
            return null;
        }
      })}
    </Row>
  );
});

export function SimpleTransactionsTable({
  transactions,
  renderEmpty,
  fields = ['date', 'payee', 'amount'],
  style,
}) {
  const { grouped: categories } = useCategories();
  const payees = usePayees();
  const accounts = useAccounts();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const selectedItems = useSelectedItems();
  const dispatchSelected = useSelectedDispatch();
  const memoFields = useMemo(() => fields, [JSON.stringify(fields)]);

  const serializedTransactions = useMemo(() => {
    return transactions.map(trans => serializeTransaction(trans, dateFormat));
  }, [transactions]);

  const renderItem = useCallback(
    ({ item }) => {
      return (
        <TransactionRow
          transaction={item}
          payees={payees}
          categories={categories}
          accounts={accounts}
          fields={memoFields}
          selected={selectedItems && selectedItems.has(item.id)}
        />
      );
    },
    [payees, categories, memoFields, selectedItems],
  );

  return (
    <Table
      style={style}
      items={serializedTransactions}
      renderEmpty={renderEmpty}
      headers={
        <>
          <SelectCell
            exposed={true}
            focused={false}
            selected={selectedItems.size > 0}
            width={20}
            onSelect={e =>
              dispatchSelected({
                type: 'select-all',
                isRangeSelect: e.shiftKey,
              })
            }
          />
          {fields.map((field, i) => {
            switch (field) {
              case 'date':
                return (
                  <Field key={i} width={100}>
                    Date
                  </Field>
                );
              case 'imported_payee':
                return (
                  <Field key={i} width="flex">
                    Imported payee
                  </Field>
                );
              case 'payee':
                return (
                  <Field key={i} width="flex">
                    Payee
                  </Field>
                );
              case 'category':
                return (
                  <Field key={i} width="flex">
                    Category
                  </Field>
                );
              case 'account':
                return (
                  <Field key={i} width="flex">
                    Account
                  </Field>
                );
              case 'notes':
                return (
                  <Field key={i} width="flex">
                    Notes
                  </Field>
                );
              case 'amount':
                return (
                  <Field key={i} width={75} style={{ textAlign: 'right' }}>
                    Amount
                  </Field>
                );
              default:
                return null;
            }
          })}
        </>
      }
      renderItem={renderItem}
    />
  );
}
