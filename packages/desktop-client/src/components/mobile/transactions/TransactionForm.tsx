import { useMemo, useCallback, useState, type ComponentProps } from 'react';
import { Form } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCheveronRight } from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { Label } from '@actual-app/components/label';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Toggle } from '@actual-app/components/toggle';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import {
  appendDecimals,
  currencyToInteger,
  groupById,
  integerToCurrency,
} from 'loot-core/shared/util';
import { type TransactionEntity } from 'loot-core/types/models';

import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { usePayees } from '@desktop-client/hooks/usePayees';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch, useSelector } from '@desktop-client/redux';

type TransactionFormProps = {
  transactions: ReadonlyArray<TransactionEntity>;
};

export function TransactionForm({ transactions }: TransactionFormProps) {
  const [transaction] = transactions;
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const lastTransaction = useSelector(
    state => state.transactions.lastTransaction,
  );
  const payees = usePayees();
  const payeesById = useMemo(() => groupById(payees), [payees]);
  const getPayeeName = useCallback(
    (payeeId: TransactionEntity['payee']) => {
      return payeesById[payeeId]?.name ?? null;
    },
    [payeesById],
  );

  const { list: categories } = useCategories();
  const categoriesById = useMemo(() => groupById(categories), [categories]);
  const getCategoryName = useCallback(
    (categoryId: TransactionEntity['category']) => {
      return categoriesById[categoryId]?.name ?? null;
    },
    [categoriesById],
  );

  const accounts = useAccounts();
  const accountsById = useMemo(() => groupById(accounts), [accounts]);
  const getAccountName = useCallback(
    (accountId: TransactionEntity['account']) => {
      return accountsById[accountId]?.name ?? null;
    },
    [accountsById],
  );

  const [selectedPayeeId, setSelectedPayeeId] = useState<
    TransactionEntity['payee'] | null
  >(transaction?.payee ?? null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    TransactionEntity['category'] | null
  >(transaction?.category ?? null);
  const [selectedAccountId, setSelectedAccountId] = useState<
    TransactionEntity['account'] | null
  >(transaction?.account ?? null);
  const [selectedDate, setSelectedDate] = useState<TransactionEntity['date']>(
    transaction?.date ?? null,
  );
  const [isCleared, setIsCleared] = useState<TransactionEntity['cleared']>(
    !!transaction?.cleared,
  );
  const [notes, setNotes] = useState<TransactionEntity['notes']>(
    transaction?.notes ?? '',
  );

  const onSelectPayee = () => {
    dispatch(
      pushModal({
        modal: {
          name: 'payee-autocomplete',
          options: {
            onSelect: setSelectedPayeeId,
          },
        },
      }),
    );
  };

  const onSelectCategory = () => {
    dispatch(
      pushModal({
        modal: {
          name: 'category-autocomplete',
          options: {
            onSelect: setSelectedCategoryId,
          },
        },
      }),
    );
  };

  const onSelectAccount = () => {
    dispatch(
      pushModal({
        modal: {
          name: 'account-autocomplete',
          options: {
            onSelect: setSelectedAccountId,
          },
        },
      }),
    );
  };

  const onSelectDate = (date: string) => {
    setSelectedDate(date);
  };

  const onChangeNotes = (notes: string) => {
    setNotes(notes);
  };

  if (!transaction) {
    return null;
  }

  return (
    <Form data-testid="transaction-form">
      <View style={{ padding: styles.mobileEditingPadding, gap: 40 }}>
        <View>
          <TransactionAmount transaction={transaction} />
        </View>
        <View
          className={css({
            gap: 20,
            '& .view': {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            },
            '& button,input': {
              height: styles.mobileMinHeight,
              textAlign: 'center',
              ...styles.mediumText,
            },
          })}
        >
          <View>
            <Label title={t('Payee')} />
            <Button variant="bare" onClick={onSelectPayee}>
              <View>
                {getPayeeName(selectedPayeeId ?? transaction.payee) ?? ''}
                <SvgCheveronRight
                  style={{
                    flexShrink: 0,
                    color: theme.mobileHeaderTextSubdued,
                  }}
                  width="14"
                  height="14"
                />
              </View>
            </Button>
          </View>
          <View>
            <Label title={t('Category')} />
            <Button variant="bare" onClick={onSelectCategory}>
              <View>
                {getCategoryName(selectedCategoryId ?? transaction.category) ??
                  ''}
                <SvgCheveronRight
                  style={{
                    flexShrink: 0,
                    color: theme.mobileHeaderTextSubdued,
                  }}
                  width="14"
                  height="14"
                />
              </View>
            </Button>
          </View>
          <View>
            <Label title={t('Account')} />
            <Button variant="bare" onClick={onSelectAccount}>
              <View>
                {getAccountName(selectedAccountId ?? transaction.account) ?? ''}
                <SvgCheveronRight
                  style={{
                    flexShrink: 0,
                    color: theme.mobileHeaderTextSubdued,
                  }}
                  width="14"
                  height="14"
                />
              </View>
            </Button>
          </View>
          <View>
            <Label title={t('Date')} />
            <Input
              type="date"
              value={selectedDate ?? transaction.date ?? ''}
              onChangeValue={onSelectDate}
            />
          </View>
          <View>
            <Label title={t('Cleared')} />
            <FormToggle
              id="Cleared"
              isOn={isCleared}
              onToggle={on => setIsCleared(on)}
            />
          </View>
          <View>
            <Label title={t('Notes')} />
            <Input value={transaction.notes} onChangeValue={onChangeNotes} />
          </View>
        </View>
      </View>
    </Form>
  );
}

function TransactionAmount({
  transaction,
}: {
  transaction: TransactionEntity;
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const [value, setValue] = useState(format(transaction.amount, 'financial'));

  const onChangeValue = useCallback(
    (value: string) => {
      setValue(appendDecimals(value));
    },
    [setValue],
  );

  const onUpdate = useCallback(
    (value: string) => {
      const parsedAmount = currencyToInteger(value) || 0;
      setValue(
        parsedAmount !== 0
          ? format(parsedAmount, 'financial')
          : format(0, 'financial'),
      );

      if (parsedAmount !== transaction.amount) {
        // Update DB
      }
    },
    [format],
  );

  const amountInteger = currencyToInteger(value);

  return (
    <View style={{ alignItems: 'center', gap: 10 }}>
      <Label
        style={{ textAlign: 'center', ...styles.mediumText }}
        title={t('Amount')}
      />
      <Input
        style={{
          height: '20vh',
          width: '100vw',
          textAlign: 'center',
          ...styles.veryLargeText,
          color: amountInteger > 0 ? theme.noticeText : theme.errorText,
        }}
        value={value || ''}
        onChangeValue={onChangeValue}
        onUpdate={onUpdate}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={styles.largeText}>-</Text>
        <FormToggle
          id="TransactionAmountSign"
          isOn={amountInteger > 0}
          isDisabled={amountInteger === 0}
          onToggle={() => setValue(integerToCurrency(-amountInteger))}
        />
        <Text style={styles.largeText}>+</Text>
      </View>
    </View>
  );
}

type FormToggleProps = ComponentProps<typeof Toggle>;

function FormToggle({ className, ...restProps }: FormToggleProps) {
  return (
    <Toggle
      className={css({
        '& [data-toggle-container]': {
          width: 50,
          height: 24,
        },
        '& [data-toggle]': {
          width: 20,
          height: 20,
        },
      })}
      {...restProps}
    />
  );
}
