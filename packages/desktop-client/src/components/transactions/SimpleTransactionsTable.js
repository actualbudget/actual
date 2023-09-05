import React, { memo, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';

import {
  format as formatDate,
  parseISO,
  isValid as isDateValid,
} from 'date-fns';

import {
  getAccountsById,
  getCategoriesById,
} from 'loot-core/src/client/reducers/queries';
import { integerToCurrency } from 'loot-core/src/shared/util';

import useCategories from '../../hooks/useCategories';
import { useSelectedItems, useSelectedDispatch } from '../../hooks/useSelected';
import ArrowsSynchronize from '../../icons/v2/ArrowsSynchronize';
import { theme, styles } from '../../style';
import { Table, Row, Field, Cell, SelectCell } from '../table';
import DisplayId from '../util/DisplayId';

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
  payees,
  categories,
  accounts,
  selected,
}) {
  // TODO: Convert these to use fetched queries
  let c = getCategoriesById(categories)[transaction.category];
  let a = getAccountsById(accounts)[transaction.account];

  let dispatchSelected = useSelectedDispatch();

  return (
    <Row style={{ color: theme.tableText }}>
      <SelectCell
        exposed={true}
        focused={false}
        onSelect={e => {
          dispatchSelected({ type: 'select', id: transaction.id, event: e });
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
                      <ArrowsSynchronize
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

export default function SimpleTransactionsTable({
  transactions,
  schedules,
  renderEmpty,
  fields = ['date', 'payee', 'amount'],
  style,
}) {
  let { grouped: categories } = useCategories();
  let { payees, accounts, dateFormat } = useSelector(state => {
    return {
      payees: state.queries.payees,
      accounts: state.queries.accounts,
      dateFormat: state.prefs.local.dateFormat || 'MM/dd/yyyy',
    };
  });
  let selectedItems = useSelectedItems();
  let dispatchSelected = useSelectedDispatch();
  let memoFields = useMemo(() => fields, [JSON.stringify(fields)]);

  let serializedTransactions = useMemo(() => {
    return transactions.map(trans => serializeTransaction(trans, dateFormat));
  }, [transactions]);

  let renderItem = useCallback(
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
            onSelect={e => dispatchSelected({ type: 'select-all', event: e })}
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
