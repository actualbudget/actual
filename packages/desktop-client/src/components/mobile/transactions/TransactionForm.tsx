import {
  useMemo,
  useCallback,
  useState,
  type ComponentProps,
  createContext,
  type ReactNode,
  useReducer,
  type Dispatch,
  useContext,
  useEffect,
} from 'react';
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

import { currentDay } from 'loot-core/shared/months';
import {
  appendDecimals,
  currencyToInteger,
  groupById,
  type IntegerAmount,
  integerToCurrency,
} from 'loot-core/shared/util';
import { type TransactionEntity } from 'loot-core/types/models';

import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { usePayees } from '@desktop-client/hooks/usePayees';
import { useTransactionBatchActions } from '@desktop-client/hooks/useTransactionBatchActions';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch, useSelector } from '@desktop-client/redux';

type TransactionFormState = {
  transactions: Record<
    TransactionEntity['id'],
    Pick<
      TransactionEntity,
      | 'id'
      | 'amount'
      | 'payee'
      | 'category'
      | 'account'
      | 'date'
      | 'cleared'
      | 'notes'
    >
  >;
  focusedTransaction: TransactionEntity['id'] | null;
  isSubmitting: boolean;
};

type TransactionFormActions =
  | {
      type: 'set-amount';
      id: TransactionEntity['id'];
      amount: TransactionEntity['amount'];
    }
  | {
      type: 'set-payee';
      id: TransactionEntity['id'];
      payee: TransactionEntity['payee'] | null;
    }
  | {
      type: 'set-category';
      id: TransactionEntity['id'];
      category: TransactionEntity['category'] | null;
    }
  | {
      type: 'set-notes';
      id: TransactionEntity['id'];
      notes: NonNullable<TransactionEntity['notes']>;
    }
  | {
      type: 'set-account';
      account: TransactionEntity['account'] | null;
    }
  | {
      type: 'set-date';
      date: NonNullable<TransactionEntity['date']>;
    }
  | {
      type: 'set-cleared';
      cleared: NonNullable<TransactionEntity['cleared']>;
    }
  | {
      type: 'split';
    }
  | {
      type: 'add-split';
    }
  | {
      type: 'focus';
      id: TransactionEntity['id'];
    }
  | {
      type: 'reset';
    }
  | {
      type: 'submit';
    };

const TransactionFormStateContext = createContext<TransactionFormState>({
  transactions: {},
  focusedTransaction: null,
  isSubmitting: false,
});

const TransactionFormDispatchContext =
  createContext<Dispatch<TransactionFormActions> | null>(null);

type TransactionFormProviderProps = {
  children: ReactNode;
  transactions: readonly TransactionEntity[];
};

export function TransactionFormProvider({
  children,
  transactions,
}: TransactionFormProviderProps) {
  const unmodifiedTransactions = useMemo(() => {
    return transactions.reduce(
      (acc, transaction) => {
        acc[transaction.id] = {
          id: transaction.id,
          amount: transaction.amount,
          payee: transaction.payee,
          category: transaction.category,
          account: transaction.account,
          date: transaction.date,
          cleared: transaction.cleared,
          notes: transaction.notes,
        };
        return acc;
      },
      {} as TransactionFormState['transactions'],
    );
  }, [transactions]);

  const [state, dispatch] = useReducer(
    (state: TransactionFormState, action: TransactionFormActions) => {
      switch (action.type) {
        case 'set-amount':
          return {
            ...state,
            transactions: {
              ...state.transactions,
              [action.id]: {
                ...state.transactions[action.id],
                amount: action.amount,
              },
            },
          };
        case 'set-payee':
          return {
            ...state,
            transactions: {
              ...state.transactions,
              [action.id]: {
                ...state.transactions[action.id],
                payee: action.payee,
              },
            },
          };
        case 'set-category':
          return {
            ...state,
            transactions: {
              ...state.transactions,
              [action.id]: {
                ...state.transactions[action.id],
                category: action.category,
              },
            },
          };
        case 'set-notes':
          return {
            ...state,
            transactions: {
              ...state.transactions,
              [action.id]: {
                ...state.transactions[action.id],
                notes: action.notes,
              },
            },
          };
        case 'set-account':
          return {
            ...state,
            transactions: Object.keys(state.transactions).reduce(
              (acc, id) => ({
                ...acc,
                [id]: {
                  ...state.transactions[id],
                  account: action.account,
                },
              }),
              {} as TransactionFormState['transactions'],
            ),
          };
        case 'set-date':
          return {
            ...state,
            transactions: Object.keys(state.transactions).reduce(
              (acc, id) => ({
                ...acc,
                [id]: {
                  ...state.transactions[id],
                  date: action.date,
                },
              }),
              {} as TransactionFormState['transactions'],
            ),
          };
        case 'set-cleared':
          return {
            ...state,
            transactions: Object.keys(state.transactions).reduce(
              (acc, id) => ({
                ...acc,
                [id]: {
                  ...state.transactions[id],
                  cleared: action.cleared,
                },
              }),
              {} as TransactionFormState['transactions'],
            ),
          };
        case 'focus':
          return {
            ...state,
            focusedTransaction: action.id,
          };
        case 'reset':
          return {
            ...state,
            transactions: unmodifiedTransactions,
            isSubmitting: false,
          };
        case 'submit':
          return {
            ...state,
            isSubmitting: true,
          };
        default:
          return state;
      }
    },
    {
      transactions: unmodifiedTransactions,
      focusedTransaction: null,
      isSubmitting: false,
    } as TransactionFormState,
  );

  useEffect(() => {
    dispatch({ type: 'reset' });
  }, [unmodifiedTransactions]);

  const { onBatchSave } = useTransactionBatchActions();

  useEffect(() => {
    async function saveTransactions() {
      const transactionsToSave = Object.values(state.transactions);
      await onBatchSave({
        transactions: transactionsToSave,
        onSuccess: () => {
          dispatch({ type: 'reset' });
        },
      });
    }
    if (state.isSubmitting) {
      saveTransactions().catch(console.error);
    }
  }, [state.isSubmitting, state.transactions, onBatchSave]);

  return (
    <TransactionFormStateContext.Provider value={state}>
      <TransactionFormDispatchContext.Provider value={dispatch}>
        {children}
      </TransactionFormDispatchContext.Provider>
    </TransactionFormStateContext.Provider>
  );
}

export function useTransactionFormState() {
  const context = useContext(TransactionFormStateContext);
  if (context === null) {
    throw new Error(
      'useTransactionFormState must be used within a TransactionFormProvider',
    );
  }
  return context;
}

export function useTransactionFormDispatch() {
  const context = useContext(TransactionFormDispatchContext);
  if (context === null) {
    throw new Error(
      'useTransactionFormDispatch must be used within a TransactionFormProvider',
    );
  }
  return context;
}

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
      if (!payeeId) {
        return null;
      }
      return payeesById[payeeId]?.name ?? null;
    },
    [payeesById],
  );

  const { list: categories } = useCategories();
  const categoriesById = useMemo(() => groupById(categories), [categories]);
  const getCategoryName = useCallback(
    (categoryId: TransactionEntity['category']) => {
      if (!categoryId) {
        return null;
      }
      return categoriesById[categoryId]?.name ?? null;
    },
    [categoriesById],
  );

  const accounts = useAccounts();
  const accountsById = useMemo(() => groupById(accounts), [accounts]);
  const getAccountName = useCallback(
    (accountId: TransactionEntity['account']) => {
      if (!accountId) {
        return null;
      }
      return accountsById[accountId]?.name ?? null;
    },
    [accountsById],
  );

  const transactionFormState = useTransactionFormState();

  const getTransactionState = useCallback(
    (id: TransactionEntity['id']) => {
      if (!id) {
        return null;
      }
      return transactionFormState.transactions[id] ?? null;
    },
    [transactionFormState.transactions],
  );

  const transactionFormDispatch = useTransactionFormDispatch();

  const onSelectPayee = (id: TransactionEntity['id']) => {
    dispatch(
      pushModal({
        modal: {
          name: 'payee-autocomplete',
          options: {
            onSelect: payeeId =>
              transactionFormDispatch({
                type: 'set-payee',
                id,
                payee: payeeId,
              }),
          },
        },
      }),
    );
  };

  const onSelectCategory = (id: TransactionEntity['id']) => {
    dispatch(
      pushModal({
        modal: {
          name: 'category-autocomplete',
          options: {
            onSelect: categoryId =>
              transactionFormDispatch({
                type: 'set-category',
                id,
                category: categoryId,
              }),
          },
        },
      }),
    );
  };

  const onChangeNotes = (id: TransactionEntity['id'], notes: string) => {
    transactionFormDispatch({ type: 'set-notes', id, notes });
  };

  const onSelectAccount = () => {
    dispatch(
      pushModal({
        modal: {
          name: 'account-autocomplete',
          options: {
            onSelect: accountId =>
              transactionFormDispatch({
                type: 'set-account',
                account: accountId,
              }),
          },
        },
      }),
    );
  };

  const onSelectDate = (date: string) => {
    transactionFormDispatch({ type: 'set-date', date });
  };

  const onUpdateAmount = (
    id: TransactionEntity['id'],
    amount: IntegerAmount,
  ) => {
    console.log('onUpdateAmount', amount);
    transactionFormDispatch({ type: 'set-amount', id, amount });
  };

  const onToggleCleared = (isCleared: boolean) => {
    transactionFormDispatch({
      type: 'set-cleared',
      cleared: isCleared,
    });
  };

  if (!transaction) {
    return null;
  }

  return (
    <Form data-testid="transaction-form">
      <View style={{ padding: styles.mobileEditingPadding, gap: 40 }}>
        <View>
          <TransactionAmount
            transaction={transaction}
            onUpdate={amount => onUpdateAmount(transaction.id, amount)}
          />
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
            <Button
              variant="bare"
              onClick={() => onSelectPayee(transaction.id)}
            >
              <View>
                {getPayeeName(getTransactionState(transaction.id)?.payee)}
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
            <Button
              variant="bare"
              onClick={() => onSelectCategory(transaction.id)}
            >
              <View>
                {getCategoryName(getTransactionState(transaction.id)?.category)}
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
                {getAccountName(getTransactionState(transaction.id)?.account)}
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
              value={getTransactionState(transaction.id)?.date ?? currentDay()}
              onChangeValue={onSelectDate}
            />
          </View>
          <View>
            <Label title={t('Cleared')} />
            <FormToggle
              id="Cleared"
              isOn={getTransactionState(transaction.id)?.cleared ?? false}
              onToggle={onToggleCleared}
            />
          </View>
          <View>
            <Label title={t('Notes')} />
            <Input
              value={getTransactionState(transaction.id)?.notes ?? ''}
              onChangeValue={notes => onChangeNotes(transaction.id, notes)}
            />
          </View>
        </View>
      </View>
    </Form>
  );
}

type TransactionAmountProps = {
  transaction: TransactionEntity;
  onUpdate: (amount: IntegerAmount) => void;
};

function TransactionAmount({ transaction, onUpdate }: TransactionAmountProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const [value, setValue] = useState(format(transaction.amount, 'financial'));

  const onChangeValue = useCallback(
    (value: string) => {
      setValue(appendDecimals(value));
    },
    [setValue],
  );

  const _onUpdate = useCallback(
    (value: string) => {
      const parsedAmount = currencyToInteger(value) || 0;
      setValue(
        parsedAmount !== 0
          ? format(parsedAmount, 'financial')
          : format(0, 'financial'),
      );

      if (parsedAmount !== transaction.amount) {
        onUpdate(parsedAmount);
      }
    },
    [format],
  );

  const amountInteger = value ? (currencyToInteger(value) ?? 0) : 0;

  return (
    <View style={{ alignItems: 'center', gap: 10 }}>
      <Label
        style={{ textAlign: 'center', ...styles.mediumText }}
        title={t('Amount')}
      />
      <Input
        type="number"
        style={{
          height: '15vh',
          width: '100vw',
          textAlign: 'center',
          ...styles.veryLargeText,
          color: amountInteger > 0 ? theme.noticeText : theme.errorText,
        }}
        value={value || ''}
        onChangeValue={onChangeValue}
        onUpdate={_onUpdate}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={styles.largeText}>-</Text>
        <FormToggle
          id="TransactionAmountSign"
          isOn={amountInteger > 0}
          isDisabled={amountInteger === 0}
          onToggle={() => _onUpdate(integerToCurrency(-amountInteger))}
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
