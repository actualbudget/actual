import React, {
  memo,
  useMemo,
  useCallback,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { SvgArrowsSynchronize } from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import {
  format as formatDate,
  isValid as isDateValid,
  parseISO,
} from 'date-fns';

import * as monthUtils from 'loot-core/shared/months';
import { integerToCurrency } from 'loot-core/shared/util';
import { type TransactionEntity } from 'loot-core/types/models';

import {
  Cell,
  Field,
  Row,
  SelectCell,
  Table,
} from '@desktop-client/components/table';
import { DisplayId } from '@desktop-client/components/util/DisplayId';
import { useAccount } from '@desktop-client/hooks/useAccount';
import { useCategory } from '@desktop-client/hooks/useCategory';
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import {
  useSelectedItems,
  useSelectedDispatch,
} from '@desktop-client/hooks/useSelected';

function serializeTransaction(
  transaction: TransactionEntity,
  dateFormat: string,
): TransactionEntity {
  let { date } = transaction;

  if (!isDateValid(parseISO(date))) {
    date = monthUtils.currentDay();
  }

  return {
    ...transaction,
    date: formatDate(parseISO(date), dateFormat),
  };
}

type TransactionRowProps = {
  transaction: TransactionEntity;
  fields: string[];
  selected: boolean;
};

const TransactionRow = memo(function TransactionRow({
  transaction,
  fields,
  selected,
}: TransactionRowProps) {
  const { t } = useTranslation();

  const category = useCategory(transaction.category || '');
  const account = useAccount(transaction.account);

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
                    {transaction.payee && (
                      <DisplayId type="payees" id={transaction.payee} />
                    )}
                  </>
                )}
              </Cell>
            );
          case 'category':
            return (
              <Field key={i} width="flex" title={category?.name}>
                {category?.name || ''}
              </Field>
            );
          case 'account':
            return (
              <Field
                key={i}
                width="flex"
                title={account?.name || t('No account')}
              >
                {account?.name || t('No account')}
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

type SimpleTransactionsTableProps = {
  transactions: readonly TransactionEntity[];
  renderEmpty: ReactNode;
  fields?: string[];
  style?: CSSProperties;
};

export function SimpleTransactionsTable({
  transactions,
  renderEmpty,
  fields = ['date', 'payee', 'amount'],
  style,
}: SimpleTransactionsTableProps) {
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const selectedItems = useSelectedItems();
  const dispatchSelected = useSelectedDispatch();
  const memoFields = useMemo(() => fields, [fields]);

  const serializedTransactions = useMemo(() => {
    return transactions.map(trans => serializeTransaction(trans, dateFormat));
  }, [transactions, dateFormat]);

  const renderItem = useCallback(
    ({ item }: { item: TransactionEntity }) => {
      return (
        <TransactionRow
          transaction={item}
          fields={memoFields}
          selected={selectedItems && selectedItems.has(item.id)}
        />
      );
    },
    [memoFields, selectedItems],
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
                    <Trans>Date</Trans>
                  </Field>
                );
              case 'imported_payee':
                return (
                  <Field key={i} width="flex">
                    <Trans>Imported payee</Trans>
                  </Field>
                );
              case 'payee':
                return (
                  <Field key={i} width="flex">
                    <Trans>Payee</Trans>
                  </Field>
                );
              case 'category':
                return (
                  <Field key={i} width="flex">
                    <Trans>Category</Trans>
                  </Field>
                );
              case 'account':
                return (
                  <Field key={i} width="flex">
                    <Trans>Account</Trans>
                  </Field>
                );
              case 'notes':
                return (
                  <Field key={i} width="flex">
                    <Trans>Notes</Trans>
                  </Field>
                );
              case 'amount':
                return (
                  <Field key={i} width={75} style={{ textAlign: 'right' }}>
                    <Trans>Amount</Trans>
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
