import React, { type ComponentProps, useMemo } from 'react';

import { SvgDownAndRightArrow } from '@actual-app/components/icons/v2';
import { Stack } from '@actual-app/components/stack';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';

import { amountToCurrency } from 'loot-core/shared/util';
import { type CategoryEntity } from 'loot-core/types/models';

import { ParsedDate } from './ParsedDate';
import {
  applyFieldMappings,
  type FieldMapping,
  formatDate,
  type ImportTransaction,
  parseAmountFields,
} from './utils';

import { Checkbox } from '@desktop-client/components/forms';
import { Row, Field } from '@desktop-client/components/table';

type TransactionProps = {
  transaction: ImportTransaction;
  fieldMappings: FieldMapping;
  showParsed: boolean;
  parseDateFormat: ComponentProps<typeof ParsedDate>['parseDateFormat'];
  dateFormat: ComponentProps<typeof ParsedDate>['dateFormat'];
  splitMode: boolean;
  inOutMode: boolean;
  outValue: string;
  flipAmount: boolean;
  multiplierAmount: string;
  categories: CategoryEntity[];
  onCheckTransaction: (transactionId: string) => void;
  reconcile: boolean;
};

export function Transaction({
  transaction: rawTransaction,
  fieldMappings,
  showParsed,
  parseDateFormat,
  dateFormat,
  splitMode,
  inOutMode,
  outValue,
  flipAmount,
  multiplierAmount,
  categories,
  onCheckTransaction,
  reconcile,
}: TransactionProps) {
  const categoryList = categories.map(category => category.name);
  const transaction = useMemo(
    () =>
      fieldMappings && !rawTransaction.isMatchedTransaction
        ? applyFieldMappings(rawTransaction, fieldMappings)
        : rawTransaction,
    [rawTransaction, fieldMappings],
  );

  const { amount, outflow, inflow } = useMemo(() => {
    if (rawTransaction.isMatchedTransaction) {
      const amount = rawTransaction.amount;

      return {
        amount,
        outflow: splitMode ? (amount < 0 ? -amount : 0) : null,
        inflow: splitMode ? (amount > 0 ? amount : 0) : null,
      };
    }

    return parseAmountFields(
      transaction,
      splitMode,
      inOutMode,
      outValue,
      flipAmount,
      multiplierAmount,
    );
  }, [
    rawTransaction,
    transaction,
    splitMode,
    inOutMode,
    outValue,
    flipAmount,
    multiplierAmount,
  ]);

  return (
    <Row
      style={{
        backgroundColor: theme.tableBackground,
        color:
          (transaction.isMatchedTransaction && !transaction.selected_merge) ||
          !transaction.selected
            ? theme.tableTextInactive
            : theme.tableText,
      }}
    >
      {reconcile && (
        <Field width={31}>
          {!transaction.isMatchedTransaction && (
            <Tooltip
              content={
                !transaction.existing && !transaction.ignored
                  ? 'New transaction. You can import it, or skip it.'
                  : transaction.ignored
                    ? 'Already imported transaction. You can skip it, or import it again.'
                    : transaction.existing
                      ? 'Updated transaction. You can update it, import it again, or skip it.'
                      : ''
              }
              placement="right top"
            >
              <Checkbox
                checked={transaction.selected}
                onChange={() => onCheckTransaction(transaction.trx_id)}
                style={
                  transaction.selected_merge
                    ? {
                        ':checked': {
                          '::after': {
                            background:
                              theme.checkboxBackgroundSelected +
                              // update sign from packages/desktop-client/src/icons/v1/layer.svg
                              // eslint-disable-next-line actual/typography
                              ' url(\'data:image/svg+xml; utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="white" d="M10 1l10 6-10 6L0 7l10-6zm6.67 10L20 13l-10 6-10-6 3.33-2L10 15l6.67-4z" /></svg>\') 9px 9px',
                          },
                        },
                      }
                    : {
                        '&': {
                          border:
                            '1px solid ' + theme.buttonNormalDisabledBorder,
                          backgroundColor: theme.buttonNormalDisabledBorder,
                          '::after': {
                            display: 'block',
                            background:
                              theme.buttonNormalDisabledBorder +
                              // minus sign adapted from packages/desktop-client/src/icons/v1/add.svg
                              // eslint-disable-next-line actual/typography
                              ' url(\'data:image/svg+xml; utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="white" className="path" d="M23,11.5 L23,11.5 L23,11.5 C23,12.3284271 22.3284271,13 21.5,13 L1.5,13 L1.5,13 C0.671572875,13 1.01453063e-16,12.3284271 0,11.5 L0,11.5 L0,11.5 C-1.01453063e-16,10.6715729 0.671572875,10 1.5,10 L21.5,10 L21.5,10 C22.3284271,10 23,10.6715729 23,11.5 Z" /></svg>\') 9px 9px',
                            width: 9,
                            height: 9,
                            // eslint-disable-next-line actual/typography
                            content: '" "',
                          },
                        },
                        ':checked': {
                          border: '1px solid ' + theme.checkboxBorderSelected,
                          backgroundColor: theme.checkboxBackgroundSelected,
                          '::after': {
                            background:
                              theme.checkboxBackgroundSelected +
                              // plus sign from packages/desktop-client/src/icons/v1/add.svg
                              // eslint-disable-next-line actual/typography
                              ' url(\'data:image/svg+xml; utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="white" className="path" d="M23,11.5 L23,11.5 L23,11.5 C23,12.3284271 22.3284271,13 21.5,13 L1.5,13 L1.5,13 C0.671572875,13 1.01453063e-16,12.3284271 0,11.5 L0,11.5 L0,11.5 C-1.01453063e-16,10.6715729 0.671572875,10 1.5,10 L21.5,10 L21.5,10 C22.3284271,10 23,10.6715729 23,11.5 Z" /><path fill="white" className="path" d="M11.5,23 C10.6715729,23 10,22.3284271 10,21.5 L10,1.5 C10,0.671572875 10.6715729,1.52179594e-16 11.5,0 C12.3284271,-1.52179594e-16 13,0.671572875 13,1.5 L13,21.5 C13,22.3284271 12.3284271,23 11.5,23 Z" /></svg>\') 9px 9px',
                          },
                        },
                      }
                }
              />
            </Tooltip>
          )}
        </Field>
      )}
      <Field width={200}>
        {transaction.isMatchedTransaction ? (
          <View>
            <Stack direction="row" align="flex-start">
              <View>
                <SvgDownAndRightArrow width={16} height={16} />
              </View>
              <View>{formatDate(transaction.date, dateFormat)}</View>
            </Stack>
          </View>
        ) : showParsed ? (
          <ParsedDate
            parseDateFormat={parseDateFormat}
            dateFormat={dateFormat}
            date={transaction.date}
          />
        ) : (
          formatDate(transaction.date, dateFormat)
        )}
      </Field>
      <Field
        width="flex"
        title={transaction.imported_payee || transaction.payee_name}
      >
        {transaction.payee_name}
      </Field>
      <Field width="flex" title={transaction.notes}>
        {transaction.notes}
      </Field>
      <Field
        width="flex"
        title={
          categoryList.includes(transaction.category)
            ? transaction.category
            : undefined
        }
      >
        {categoryList.includes(transaction.category) && transaction.category}
      </Field>
      {inOutMode && (
        <Field
          width={90}
          contentStyle={{ textAlign: 'left', ...styles.tnum }}
          title={
            transaction.inOut === undefined
              ? undefined
              : String(transaction.inOut)
          }
        >
          {transaction.inOut}
        </Field>
      )}
      {splitMode ? (
        <>
          <Field
            width={90}
            contentStyle={{
              textAlign: 'right',
              ...styles.tnum,
              ...(inflow === null && outflow === null
                ? { color: theme.errorText }
                : {}),
            }}
            title={
              outflow === null
                ? 'Invalid: unable to parse the value'
                : amountToCurrency(outflow)
            }
          >
            {amountToCurrency(outflow || 0)}
          </Field>
          <Field
            width={90}
            contentStyle={{
              textAlign: 'right',
              ...styles.tnum,
              ...(inflow === null && outflow === null
                ? { color: theme.errorText }
                : {}),
            }}
            title={
              inflow === null
                ? 'Invalid: unable to parse the value'
                : amountToCurrency(inflow)
            }
          >
            {amountToCurrency(inflow || 0)}
          </Field>
        </>
      ) : (
        <Field
          width={90}
          contentStyle={{
            textAlign: 'right',
            ...styles.tnum,
            ...(amount === null ? { color: theme.errorText } : {}),
          }}
          title={
            amount === null
              ? `Invalid: unable to parse the value (${transaction.amount})`
              : amountToCurrency(amount)
          }
        >
          {amountToCurrency(amount || 0)}
        </Field>
      )}
    </Row>
  );
}
