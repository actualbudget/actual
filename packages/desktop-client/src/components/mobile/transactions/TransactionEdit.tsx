import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation, useParams, useSearchParams } from 'react-router';

import { Button } from '@actual-app/components/button';
import { SvgSplit } from '@actual-app/components/icons/v0';
import {
  SvgAdd,
  SvgPiggyBank,
  SvgTrash,
} from '@actual-app/components/icons/v1';
import { SvgPencilWriteAlternate } from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Toggle } from '@actual-app/components/toggle';
import { View } from '@actual-app/components/view';
import {
  format as formatDate,
  isValid as isValidDate,
  parse as parseDate,
  parseISO,
} from 'date-fns';

import { send } from 'loot-core/platform/client/connection';
import * as monthUtils from 'loot-core/shared/months';
import * as Platform from 'loot-core/shared/platform';
import { q } from 'loot-core/shared/query';
import { getStatusLabel, getUpcomingDays } from 'loot-core/shared/schedules';
import {
  addSplitTransaction,
  deleteTransaction,
  makeChild,
  realizeTempTransactions,
  splitTransaction,
  ungroupTransactions,
  updateTransaction,
} from 'loot-core/shared/transactions';
import {
  amountToInteger,
  applyFindReplace,
  diffItems,
  getChangedValues,
  groupById,
  integerToAmount,
  integerToCurrency,
  titleFirst,
} from 'loot-core/shared/util';
import type {
  AccountEntity,
  CategoryEntity,
  PayeeEntity,
  TransactionEntity,
} from 'loot-core/types/models';

import { FocusableAmountInput } from './FocusableAmountInput';

import { MobileBackButton } from '@desktop-client/components/mobile/MobileBackButton';
import {
  FieldLabel,
  InputField,
  TapField,
  ToggleField,
} from '@desktop-client/components/mobile/MobileForms';
import { getPrettyPayee } from '@desktop-client/components/mobile/utils';
import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import { createSingleTimeScheduleFromTransaction } from '@desktop-client/components/transactions/TransactionList';
import { AmountInput } from '@desktop-client/components/util/AmountInput';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { useInitialMount } from '@desktop-client/hooks/useInitialMount';
import { useLocalPref } from '@desktop-client/hooks/useLocalPref';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { usePayees } from '@desktop-client/hooks/usePayees';
import {
  SingleActiveEditFormProvider,
  useSingleActiveEditForm,
} from '@desktop-client/hooks/useSingleActiveEditForm';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { aqlQuery } from '@desktop-client/queries/aqlQuery';
import { useDispatch, useSelector } from '@desktop-client/redux';
import { setLastTransaction } from '@desktop-client/transactions/transactionsSlice';

function getFieldName(transactionId: TransactionEntity['id'], field: string) {
  return `${field}-${transactionId}`;
}

function serializeTransaction(
  transaction: TransactionEntity,
  dateFormat: string,
) {
  const { date, amount } = transaction;
  return {
    ...transaction,
    date: formatDate(parseISO(date), dateFormat),
    amount: integerToAmount(amount || 0),
  };
}

function deserializeTransaction(
  transaction: TransactionEntity,
  originalTransaction: TransactionEntity | null,
  dateFormat: string,
) {
  const { amount, date: originalDate, ...realTransaction } = transaction;

  const dayMonth = monthUtils.getDayMonthRegex(dateFormat);
  let date: string | null = originalDate;
  if (dayMonth.test(date)) {
    const test = parseDate(
      date,
      monthUtils.getDayMonthFormat(dateFormat),
      new Date(),
    );
    if (isValidDate(test)) {
      date = monthUtils.dayFromDate(test);
    } else {
      date = null;
    }
  } else {
    const test = parseDate(date, dateFormat, new Date());
    // This is a quick sanity check to make sure something invalid
    // like "year 201" was entered
    if (test.getFullYear() > 2000 && isValidDate(test)) {
      date = monthUtils.dayFromDate(test);
    } else {
      date = null;
    }
  }

  if (date == null) {
    date =
      (originalTransaction && originalTransaction.date) ||
      monthUtils.currentDay();
  }

  return { ...realTransaction, date, amount: amountToInteger(amount || 0) };
}

export function lookupName(items: CategoryEntity[], id?: CategoryEntity['id']) {
  if (!id) {
    return null;
  }
  return items.find(item => item.id === id)?.name;
}

export function Status({
  status,
  isSplit = false,
}: {
  status?: string;
  isSplit?: boolean;
}) {
  const { t } = useTranslation();

  let color: string | undefined;

  switch (status) {
    case 'missed':
      color = theme.errorText;
      break;
    case 'due':
      color = theme.warningText;
      break;
    case 'upcoming':
      color = theme.tableHeaderText;
      break;
    default:
      return null;
  }

  return (
    <Text
      style={{
        fontSize: 11,
        color,
        fontStyle: 'italic',
        textAlign: 'left',
      }}
    >
      {isSplit
        ? t('{{status}} (Split)', {
            status: titleFirst(getStatusLabel(status)),
          })
        : titleFirst(getStatusLabel(status))}
    </Text>
  );
}

type FooterProps = {
  transactions: TransactionEntity[];
  isAdding: boolean;
  onAdd: () => void;
  onSave: () => void;
  onSplit: (id: TransactionEntity['id']) => void;
  onAddSplit: (id: TransactionEntity['id']) => void;
  onEmptySplitFound: (id: TransactionEntity['id']) => void;
  editingField?: string;
  onEditField: (
    id: TransactionEntity['id'],
    field: 'category' | 'payee' | 'account' | 'date' | 'amount' | 'notes',
  ) => void;
};

function Footer({
  transactions,
  isAdding,
  onAdd,
  onSave,
  onSplit,
  onAddSplit,
  onEmptySplitFound,
  editingField,
  onEditField,
}: FooterProps) {
  const [transaction, ...childTransactions] = transactions;
  const emptySplitTransaction = childTransactions.find(t => t.amount === 0);
  const onClickRemainingSplit = () => {
    if (childTransactions.length === 0) {
      onSplit(transaction.id);
    } else {
      if (!emptySplitTransaction) {
        onAddSplit(transaction.id);
      } else {
        onEmptySplitFound?.(emptySplitTransaction.id);
      }
    }
  };

  return (
    <View
      data-testid="transaction-form-footer"
      style={{
        paddingLeft: styles.mobileEditingPadding,
        paddingRight: styles.mobileEditingPadding,
        paddingTop: 10,
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
        backgroundColor: theme.tableHeaderBackground,
        borderTopWidth: 1,
        borderColor: theme.tableBorder,
      }}
    >
      {transaction.error?.type === 'SplitTransactionError' ? (
        <Button
          variant="primary"
          style={{ height: styles.mobileMinHeight }}
          isDisabled={!!editingField}
          onPress={onClickRemainingSplit}
        >
          <SvgSplit width={17} height={17} />
          <Text
            style={{
              ...styles.text,
              marginLeft: 6,
            }}
          >
            {!emptySplitTransaction ? (
              <Trans>
                Add new split -{' '}
                {{
                  amount: integerToCurrency(
                    transaction.amount > 0
                      ? transaction.error.difference
                      : -transaction.error.difference,
                  ),
                }}{' '}
                left
              </Trans>
            ) : (
              <Trans>
                Amount left:{' '}
                {{
                  amount: integerToCurrency(
                    transaction.amount > 0
                      ? transaction.error.difference
                      : -transaction.error.difference,
                  ),
                }}
              </Trans>
            )}
          </Text>
        </Button>
      ) : !transaction.account ? (
        <Button
          variant="primary"
          style={{ height: styles.mobileMinHeight }}
          isDisabled={!!editingField}
          onPress={() => onEditField(transaction.id, 'account')}
        >
          <SvgPiggyBank width={17} height={17} />
          <Text
            style={{
              ...styles.text,
              marginLeft: 6,
            }}
          >
            <Trans>Select account</Trans>
          </Text>
        </Button>
      ) : isAdding ? (
        <Button
          variant="primary"
          style={{ height: styles.mobileMinHeight }}
          isDisabled={!!editingField}
          onPress={onAdd}
        >
          <SvgAdd width={17} height={17} />
          <Text
            style={{
              ...styles.text,
              marginLeft: 5,
            }}
          >
            <Trans>Add transaction</Trans>
          </Text>
        </Button>
      ) : (
        <Button
          variant="primary"
          style={{ height: styles.mobileMinHeight }}
          isDisabled={!!editingField}
          onPress={onSave}
        >
          <SvgPencilWriteAlternate width={16} height={16} />
          <Text
            style={{
              ...styles.text,
              marginLeft: 6,
            }}
          >
            <Trans>Save changes</Trans>
          </Text>
        </Button>
      )}
    </View>
  );
}

type ChildTransactionEditProps = {
  transaction: TransactionEntity;
  amountFocused: boolean;
  amountSign: '+' | '-';
  getCategory: (transaction: TransactionEntity, isOffBudget: boolean) => string;
  getPayee: (transaction: TransactionEntity) => PayeeEntity | undefined;
  getTransferAccount: (
    transaction: TransactionEntity,
  ) => AccountEntity | undefined;
  isOffBudget: boolean;
  isBudgetTransfer: (transaction: TransactionEntity) => boolean;
  onEditField: (
    id: TransactionEntity['id'],
    field: 'category' | 'payee' | 'account' | 'date' | 'amount' | 'notes',
  ) => void;
  onUpdate: <Field extends keyof TransactionEntity>(
    transaction: TransactionEntity,
    field: Field,
    value: TransactionEntity[Field],
  ) => void;
  onDelete: (id: TransactionEntity['id']) => void;
};

const ChildTransactionEdit = forwardRef<
  HTMLDivElement,
  ChildTransactionEditProps
>(
  (
    {
      transaction,
      amountFocused,
      amountSign,
      getCategory,
      getPayee,
      getTransferAccount,
      isOffBudget,
      isBudgetTransfer,
      onEditField,
      onUpdate,
      onDelete,
    },
    ref,
  ) => {
    const { t } = useTranslation();
    const { editingField, onRequestActiveEdit, onClearActiveEdit } =
      useSingleActiveEditForm()!;
    const [hideFraction, _] = useSyncedPref('hideFraction');

    const prettyPayee = getPrettyPayee({
      t,
      transaction,
      payee: getPayee(transaction),
      transferAccount: getTransferAccount(transaction),
    });
    return (
      <View
        innerRef={ref}
        style={{
          backgroundColor: theme.tableBackground,
          borderColor:
            transaction.amount === 0
              ? theme.tableBorderSelected
              : theme.tableBorder,
          borderWidth: '1px',
          borderRadius: '5px',
          padding: '5px',
          margin: '10px',
        }}
      >
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flexBasis: '75%' }}>
            <FieldLabel title={t('Payee')} />
            <TapField
              isDisabled={
                !!editingField &&
                editingField !== getFieldName(transaction.id, 'payee')
              }
              value={prettyPayee}
              onPress={() => onEditField(transaction.id, 'payee')}
              data-testid={`payee-field-${transaction.id}`}
            />
          </View>
          <View
            style={{
              flexBasis: '25%',
            }}
          >
            <FieldLabel title={t('Amount')} style={{ padding: 0 }} />
            <AmountInput
              disabled={
                !!editingField &&
                editingField !== getFieldName(transaction.id, 'amount')
              }
              focused={amountFocused}
              value={amountToInteger(transaction.amount)}
              zeroSign={amountSign}
              style={{ marginRight: 8 }}
              inputStyle={{
                ...styles.smallText,
                textAlign: 'right',
                minWidth: 0,
              }}
              onFocus={() =>
                onRequestActiveEdit(getFieldName(transaction.id, 'amount'))
              }
              onUpdate={value => {
                const amount = integerToAmount(value);
                if (transaction.amount !== amount) {
                  onUpdate(transaction, 'amount', amount);
                } else {
                  onClearActiveEdit();
                }
              }}
              autoDecimals={String(hideFraction) !== 'true'}
            />
          </View>
        </View>

        <View>
          <FieldLabel title={t('Category')} />
          <TapField
            textStyle={{
              ...((isOffBudget || isBudgetTransfer(transaction)) && {
                fontStyle: 'italic',
                color: theme.pageTextSubdued,
                fontWeight: 300,
              }),
            }}
            value={getCategory(transaction, isOffBudget)}
            isDisabled={
              (!!editingField &&
                editingField !== getFieldName(transaction.id, 'category')) ||
              isOffBudget ||
              isBudgetTransfer(transaction)
            }
            onPress={() => onEditField(transaction.id, 'category')}
            data-testid={`category-field-${transaction.id}`}
          />
        </View>

        <View>
          <FieldLabel title={t('Notes')} />
          <InputField
            disabled={
              !!editingField &&
              editingField !== getFieldName(transaction.id, 'notes')
            }
            defaultValue={transaction.notes}
            onFocus={() =>
              onRequestActiveEdit(getFieldName(transaction.id, 'notes'))
            }
            onUpdate={value => onUpdate(transaction, 'notes', value)}
          />
        </View>

        <View style={{ alignItems: 'center' }}>
          <Button
            variant="bare"
            onPress={() => onDelete(transaction.id)}
            style={{
              height: 40,
              borderWidth: 0,
              marginLeft: styles.mobileEditingPadding,
              marginRight: styles.mobileEditingPadding,
              marginTop: 10,
              backgroundColor: 'transparent',
            }}
          >
            <SvgTrash
              width={17}
              height={17}
              style={{ color: theme.errorText }}
            />
            <Text
              style={{
                color: theme.errorText,
                marginLeft: 5,
                userSelect: 'none',
              }}
            >
              <Trans>Delete split</Trans>
            </Text>
          </Button>
        </View>
      </View>
    );
  },
);

ChildTransactionEdit.displayName = 'ChildTransactionEdit';

type TransactionEditInnerProps = {
  isAdding: boolean;
  accounts: AccountEntity[];
  categories: CategoryEntity[];
  payees: PayeeEntity[];
  dateFormat: string;
  transactions: TransactionEntity[];
  onSave: (transactions: TransactionEntity[]) => void;
  onUpdate: <Field extends keyof TransactionEntity>(
    transaction: TransactionEntity,
    field: Field,
    value?: TransactionEntity[Field],
  ) => void;
  onDelete: (id: TransactionEntity['id']) => void;
  onSplit: (id: TransactionEntity['id']) => void;
  onAddSplit: (id: TransactionEntity['id']) => void;
};

const TransactionEditInner = memo<TransactionEditInnerProps>(
  function TransactionEditInner({
    isAdding,
    accounts,
    categories,
    payees,
    dateFormat,
    transactions: unserializedTransactions,
    onSave,
    onUpdate,
    onDelete,
    onSplit,
    onAddSplit,
  }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [showHiddenCategories] = useLocalPref('budget.showHiddenCategories');
    const [upcomingLength = '7'] = useSyncedPref(
      'upcomingScheduledTransactionLength',
    );
    const transactions = useMemo(
      () =>
        unserializedTransactions.map(t =>
          serializeTransaction(t, dateFormat),
        ) || [],
      [unserializedTransactions, dateFormat],
    );
    const { data: { grouped: categoryGroups } = { grouped: [] } } =
      useCategories();

    useEffect(() => {
      if (window.history.length === 1) {
        window.history.replaceState(null, 'Actual Budget', '/');
        window.history.pushState(null, 'Add Transaction', '/transactions/new');
      }
    }, []);

    const [transaction, ...childTransactions] = transactions;

    const { editingField, onRequestActiveEdit, onClearActiveEdit } =
      useSingleActiveEditForm()!;
    const [totalAmountFocused, setTotalAmountFocused] = useState(
      // iOS does not support automatically opening up the keyboard for the
      // total amount field. Hence we should not focus on it on page render.
      !Platform.isIOSAgent,
    );
    const childTransactionElementRefMap = useRef<
      Record<TransactionEntity['id'], HTMLDivElement | null>
    >({});
    const hasAccountChanged = useRef(false);

    const payeesById = useMemo(() => groupById(payees), [payees]);
    const accountsById = useMemo(() => groupById(accounts), [accounts]);

    const onTotalAmountEdit = useCallback(() => {
      onRequestActiveEdit?.(getFieldName(transaction.id, 'amount'), () => {
        setTotalAmountFocused(true);
        return () => setTotalAmountFocused(false);
      });
    }, [onRequestActiveEdit, transaction.id]);

    const isInitialMount = useInitialMount();

    useEffect(() => {
      if (isInitialMount && isAdding && !Platform.isIOSAgent) {
        onTotalAmountEdit();
      }
    }, [isAdding, isInitialMount, onTotalAmountEdit]);

    const getAccount = useCallback(
      (trans: TransactionEntity) => {
        return trans?.account ? accountsById?.[trans.account] : undefined;
      },
      [accountsById],
    );

    const getPayee = useCallback(
      (trans: TransactionEntity) => {
        return trans?.payee ? payeesById?.[trans.payee] : undefined;
      },
      [payeesById],
    );

    const getTransferAccount = useCallback(
      (trans: TransactionEntity) => {
        const payee = trans ? getPayee(trans) : null;
        return payee && payee?.transfer_acct
          ? accountsById?.[payee.transfer_acct]
          : undefined;
      },
      [accountsById, getPayee],
    );

    const isBudgetTransfer = useCallback(
      (trans: TransactionEntity) => {
        const transferAcct = trans ? getTransferAccount(trans) : null;
        return transferAcct ? !transferAcct.offbudget : false;
      },
      [getTransferAccount],
    );

    const getCategory = useCallback(
      (trans: TransactionEntity, isOffBudget: boolean) => {
        if (isOffBudget) {
          return t('Off budget');
        } else if (isBudgetTransfer(trans)) {
          return t('Transfer');
        } else {
          return lookupName(categories, trans.category) ?? '';
        }
      },
      [categories, isBudgetTransfer, t],
    );

    const onSaveInner = useCallback(() => {
      const [unserializedTransaction] = unserializedTransactions;

      const onConfirmSave = () => {
        let transactionsToSave = unserializedTransactions;
        if (isAdding) {
          transactionsToSave = realizeTempTransactions(
            unserializedTransactions,
          );
        }

        onSave(transactionsToSave);
        navigate(-1);
      };

      const today = monthUtils.currentDay();
      const isFuture = unserializedTransaction.date > today;
      const isLinkedToSchedule = !!unserializedTransaction.schedule;

      if (isFuture && !isLinkedToSchedule) {
        const upcomingDays = getUpcomingDays(upcomingLength, today);
        const daysUntilTransaction = monthUtils.differenceInCalendarDays(
          unserializedTransaction.date,
          today,
        );
        const isBeyondWindow = daysUntilTransaction > upcomingDays;

        dispatch(
          pushModal({
            modal: {
              name: 'convert-to-schedule',
              options: {
                isBeyondWindow,
                daysUntilTransaction,
                upcomingDays,
                onConfirm: async () => {
                  if (
                    !isAdding &&
                    unserializedTransaction.id &&
                    !unserializedTransaction.id.startsWith('temp')
                  ) {
                    await send('transaction-delete', {
                      id: unserializedTransaction.id,
                    });
                  }

                  const transactionForSchedule =
                    unserializedTransaction.is_parent
                      ? {
                          ...unserializedTransaction,
                          subtransactions: unserializedTransactions.filter(
                            t =>
                              t.is_child &&
                              t.parent_id === unserializedTransaction.id,
                          ),
                        }
                      : unserializedTransaction;

                  await createSingleTimeScheduleFromTransaction(
                    transactionForSchedule,
                  );

                  dispatch(
                    addNotification({
                      notification: {
                        type: 'message',
                        message: t('Schedule created successfully'),
                      },
                    }),
                  );
                  navigate(-1);
                },
                onCancel: onConfirmSave,
              },
            },
          }),
        );
        return;
      }

      if (unserializedTransaction.reconciled) {
        // On mobile any save gives the warning.
        // On the web only certain changes trigger a warning.
        // Should we bring that here as well? Or does the nature of the editing form
        // make this more appropriate?
        dispatch(
          pushModal({
            modal: {
              name: 'confirm-transaction-edit',
              options: {
                onConfirm: onConfirmSave,
                confirmReason: 'editReconciled',
              },
            },
          }),
        );
      } else {
        onConfirmSave();
      }
    }, [
      isAdding,
      dispatch,
      navigate,
      onSave,
      unserializedTransactions,
      upcomingLength,
      t,
    ]);

    const onUpdateInner = useCallback(
      async <Field extends keyof TransactionEntity>(
        serializedTransaction: TransactionEntity,
        name: Field,
        value: TransactionEntity[Field],
      ) => {
        const newTransaction = { ...serializedTransaction, [name]: value };
        await onUpdate(newTransaction, name);
        onClearActiveEdit();

        if (name === 'account') {
          hasAccountChanged.current = serializedTransaction.account !== value;
        }
      },
      [onClearActiveEdit, onUpdate],
    );

    const onTotalAmountUpdate = useCallback(
      (value: number) => {
        if (transaction.amount !== value) {
          onUpdateInner(transaction, 'amount', value);
        }
      },
      [onUpdateInner, transaction],
    );

    const onEditFieldInner = useCallback(
      (
        transactionId: TransactionEntity['id'],
        name: 'category' | 'payee' | 'account' | 'date' | 'amount' | 'notes',
      ) => {
        onRequestActiveEdit?.(getFieldName(transaction.id, name), () => {
          const transactionToEdit = transactions.find(
            t => t.id === transactionId,
          );
          const unserializedTransaction = unserializedTransactions.find(
            t => t.id === transactionId,
          );

          if (!unserializedTransaction || !transactionToEdit) {
            throw new Error(`Transaction ${transactionId} not found`);
          }

          switch (name) {
            case 'category':
              dispatch(
                pushModal({
                  modal: {
                    name: 'category-autocomplete',
                    options: {
                      categoryGroups,
                      showHiddenCategories,
                      month: monthUtils.monthFromDate(
                        unserializedTransaction.date,
                      ),
                      onSelect: categoryId => {
                        onUpdateInner(transactionToEdit, name, categoryId);
                      },
                      onClose: () => {
                        onClearActiveEdit();
                      },
                    },
                  },
                }),
              );
              break;
            case 'account':
              dispatch(
                pushModal({
                  modal: {
                    name: 'account-autocomplete',
                    options: {
                      onSelect: accountId => {
                        onUpdateInner(transactionToEdit, name, accountId);
                      },
                      onClose: () => {
                        onClearActiveEdit();
                      },
                    },
                  },
                }),
              );
              break;
            case 'payee':
              dispatch(
                pushModal({
                  modal: {
                    name: 'payee-autocomplete',
                    options: {
                      onSelect: payeeId => {
                        onUpdateInner(transactionToEdit, name, payeeId);
                      },
                      onClose: () => {
                        onClearActiveEdit();
                      },
                    },
                  },
                }),
              );
              break;
            default:
              dispatch(
                pushModal({
                  modal: {
                    name: 'edit-field',
                    options: {
                      name,
                      onSubmit: (name, value) => {
                        if (typeof value === 'object' && 'useRegex' in value) {
                          onUpdateInner(
                            transactionToEdit,
                            name,
                            applyFindReplace(
                              transactionToEdit.notes,
                              value.find,
                              value.replace,
                              value.useRegex,
                            ),
                          );
                        } else {
                          onUpdateInner(transactionToEdit, name, value);
                        }
                      },
                      onClose: () => {
                        onClearActiveEdit();
                      },
                    },
                  },
                }),
              );
              break;
          }
        });
      },
      [
        categoryGroups,
        dispatch,
        onUpdateInner,
        onClearActiveEdit,
        onRequestActiveEdit,
        transaction.id,
        transactions,
        unserializedTransactions,
        showHiddenCategories,
      ],
    );

    const onDeleteInner = useCallback(
      (id: TransactionEntity['id']) => {
        const [unserializedTransaction] = unserializedTransactions;

        const onConfirmDelete = () => {
          dispatch(
            pushModal({
              modal: {
                name: 'confirm-delete',
                options: {
                  message: t(
                    'Are you sure you want to delete the transaction?',
                  ),
                  onConfirm: () => {
                    onDelete(id);

                    if (unserializedTransaction.id !== id) {
                      // Only a child transaction was deleted.
                      onClearActiveEdit();
                      return;
                    }

                    navigate(-1);
                  },
                },
              },
            }),
          );
        };

        if (unserializedTransaction.reconciled) {
          dispatch(
            pushModal({
              modal: {
                name: 'confirm-transaction-edit',
                options: {
                  onConfirm: onConfirmDelete,
                  confirmReason: 'deleteReconciled',
                },
              },
            }),
          );
        } else {
          onConfirmDelete();
        }
      },
      [
        dispatch,
        navigate,
        onClearActiveEdit,
        onDelete,
        unserializedTransactions,
        t,
      ],
    );

    const scrollChildTransactionIntoView = useCallback(
      (id: TransactionEntity['id']) => {
        const childTransactionEditElement =
          childTransactionElementRefMap.current?.[id];
        childTransactionEditElement?.scrollIntoView({
          behavior: 'smooth',
        });
      },
      [],
    );

    const onEmptySplitFound = useCallback(
      (id: TransactionEntity['id']) => {
        scrollChildTransactionIntoView(id);
      },
      [scrollChildTransactionIntoView],
    );

    // Child transactions should always default to the signage
    // of the parent transaction
    const childAmountSign = transaction.amount <= 0 ? '-' : '+';

    const account = getAccount(transaction);
    const isOffBudget = account ? !!account.offbudget : false;
    const title = getPrettyPayee({
      t,
      transaction,
      payee: getPayee(transaction),
      transferAccount: getTransferAccount(transaction),
    });

    const transactionDate = parseDate(transaction.date, dateFormat, new Date());
    const dateDefaultValue = monthUtils.dayFromDate(transactionDate);

    return (
      <Page
        header={
          <MobilePageHeader
            title={
              transaction.payee == null
                ? isAdding
                  ? t('New Transaction')
                  : t('Transaction')
                : title
            }
            leftContent={<MobileBackButton />}
          />
        }
        footer={
          <Footer
            transactions={transactions}
            isAdding={isAdding}
            onAdd={onSaveInner}
            onSave={onSaveInner}
            onSplit={onSplit}
            onAddSplit={onAddSplit}
            onEmptySplitFound={onEmptySplitFound}
            editingField={editingField}
            onEditField={onEditFieldInner}
          />
        }
        padding={0}
      >
        <View
          data-testid="transaction-form"
          style={{ flexShrink: 0, marginTop: 20, marginBottom: 20 }}
        >
          <View
            style={{
              alignItems: 'center',
            }}
          >
            <FieldLabel title={t('Amount')} flush style={{ marginBottom: 0 }} />
            <FocusableAmountInput
              value={transaction.amount}
              zeroSign="-"
              focused={totalAmountFocused}
              onFocus={onTotalAmountEdit}
              onBlur={() => onClearActiveEdit()}
              onUpdateAmount={onTotalAmountUpdate}
              focusedStyle={{
                width: 'auto',
                padding: '5px',
                paddingLeft: '20px',
                paddingRight: '20px',
                minWidth: '100%',
              }}
              textStyle={{ ...styles.veryLargeText, textAlign: 'center' }}
            />
          </View>

          <View>
            <FieldLabel title={t('Payee')} />
            <TapField
              textStyle={{
                ...(transaction.is_parent && {
                  fontStyle: 'italic',
                  fontWeight: 300,
                }),
              }}
              value={title}
              isDisabled={
                !!editingField &&
                editingField !== getFieldName(transaction.id, 'payee')
              }
              onPress={() => onEditFieldInner(transaction.id, 'payee')}
              data-testid="payee-field"
            />
          </View>

          {!transaction.is_parent && (
            <View>
              <FieldLabel title={t('Category')} />
              <TapField
                style={{
                  ...((isOffBudget || isBudgetTransfer(transaction)) && {
                    fontStyle: 'italic',
                    color: theme.pageTextSubdued,
                    fontWeight: 300,
                  }),
                }}
                value={getCategory(transaction, isOffBudget)}
                isDisabled={
                  (!!editingField &&
                    editingField !==
                      getFieldName(transaction.id, 'category')) ||
                  isOffBudget ||
                  isBudgetTransfer(transaction)
                }
                onPress={() => onEditFieldInner(transaction.id, 'category')}
                data-testid="category-field"
              />
            </View>
          )}

          {childTransactions.map((childTrans, i, arr) => (
            <ChildTransactionEdit
              key={childTrans.id}
              transaction={childTrans}
              amountFocused={arr.findIndex(c => c.amount === 0) === i}
              amountSign={childAmountSign}
              ref={r => {
                childTransactionElementRefMap.current = {
                  ...childTransactionElementRefMap.current,
                  [childTrans.id]: r,
                };
              }}
              isOffBudget={isOffBudget}
              getCategory={getCategory}
              getPayee={getPayee}
              getTransferAccount={getTransferAccount}
              isBudgetTransfer={isBudgetTransfer}
              onUpdate={onUpdateInner}
              onEditField={onEditFieldInner}
              onDelete={onDeleteInner}
            />
          ))}

          {transaction.amount !== 0 && childTransactions.length === 0 && (
            <View style={{ alignItems: 'center' }}>
              <Button
                variant="bare"
                isDisabled={!!editingField}
                style={{
                  height: 40,
                  borderWidth: 0,
                  marginLeft: styles.mobileEditingPadding,
                  marginRight: styles.mobileEditingPadding,
                  marginTop: 10,
                  backgroundColor: 'transparent',
                }}
                onPress={() => onSplit(transaction.id)}
              >
                <SvgSplit
                  width={17}
                  height={17}
                  style={{ color: theme.formLabelText }}
                />
                <Text
                  style={{
                    marginLeft: 5,
                    userSelect: 'none',
                    color: theme.formLabelText,
                  }}
                >
                  <Trans>Split</Trans>
                </Text>
              </Button>
            </View>
          )}

          <View>
            <FieldLabel title={t('Account')} />
            <TapField
              isDisabled={
                !!editingField &&
                editingField !== getFieldName(transaction.id, 'account')
              }
              value={account?.name}
              onPress={() => onEditFieldInner(transaction.id, 'account')}
              data-testid="account-field"
            />
          </View>

          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1 }}>
              <FieldLabel title={t('Date')} />
              <InputField
                type="date"
                disabled={
                  !!editingField &&
                  editingField !== getFieldName(transaction.id, 'date')
                }
                required
                style={{
                  color: theme.tableText,
                  minWidth: '150px',
                  appearance: 'none',
                }}
                defaultValue={dateDefaultValue}
                onBlur={() => onClearActiveEdit()}
                onFocus={() =>
                  onRequestActiveEdit(getFieldName(transaction.id, 'date'))
                }
                onChange={event =>
                  onUpdateInner(
                    transaction,
                    'date',
                    formatDate(parseISO(event.target.value), dateFormat),
                  )
                }
              />
            </View>
            {transaction.reconciled ? (
              <View style={{ alignItems: 'center' }}>
                <FieldLabel title={t('Reconciled')} />
                <Toggle id="Reconciled" isOn isDisabled />
              </View>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <FieldLabel title={t('Cleared')} />
                <ToggleField
                  id="cleared"
                  isOn={!!transaction.cleared}
                  onToggle={on => onUpdateInner(transaction, 'cleared', on)}
                />
              </View>
            )}
          </View>

          <View>
            <FieldLabel title={t('Notes')} />
            <InputField
              disabled={
                !!editingField &&
                editingField !== getFieldName(transaction.id, 'notes')
              }
              defaultValue={transaction.notes}
              onFocus={() => {
                onRequestActiveEdit(getFieldName(transaction.id, 'notes'));
              }}
              onBlur={() => onClearActiveEdit()}
              onChange={event =>
                onUpdateInner(transaction, 'notes', event.target.value)
              }
            />
          </View>

          {!isAdding && (
            <View style={{ alignItems: 'center' }}>
              <Button
                variant="bare"
                onPress={() => onDeleteInner(transaction.id)}
                style={{
                  height: 40,
                  borderWidth: 0,
                  marginLeft: styles.mobileEditingPadding,
                  marginRight: styles.mobileEditingPadding,
                  marginTop: 10,
                  backgroundColor: 'transparent',
                }}
              >
                <SvgTrash
                  width={17}
                  height={17}
                  style={{ color: theme.errorText }}
                />
                <Text
                  style={{
                    color: theme.errorText,
                    marginLeft: 5,
                    userSelect: 'none',
                  }}
                >
                  <Trans>Delete transaction</Trans>
                </Text>
              </Button>
            </View>
          )}
        </View>
      </Page>
    );
  },
);

function isTemporary(transaction: TransactionEntity) {
  return transaction.id.indexOf('temp') === 0;
}

type TransactionEditUnconnectedProps = {
  categories: CategoryEntity[];
  accounts: AccountEntity[];
  payees: PayeeEntity[];
  lastTransaction: TransactionEntity | null;
  dateFormat: string;
};

function TransactionEditUnconnected({
  categories,
  accounts,
  payees,
  lastTransaction,
  dateFormat,
}: TransactionEditUnconnectedProps) {
  const { t } = useTranslation();
  const { transactionId } = useParams();
  const { state: locationState } = useLocation();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<TransactionEntity[]>([]);
  const [fetchedTransactions, setFetchedTransactions] = useState<
    TransactionEntity[]
  >([]);
  const isAdding = useRef(false);
  const isDeleted = useRef(false);

  const searchParamCategory = useMemo(
    () => categories.find(c => c.name === searchParams.get('category'))?.id,
    [categories, searchParams],
  );
  const searchParamAccount = useMemo(
    () => accounts.find(a => a.name === searchParams.get('account'))?.id,
    [accounts, searchParams],
  );
  const searchParamPayee = useMemo(
    () => payees.find(p => p.name === searchParams.get('payee'))?.id,
    [payees, searchParams],
  );

  useEffect(() => {
    let unmounted = false;

    async function fetchTransaction() {
      // Query for the transaction based on the ID with grouped splits.
      //
      // This means if the transaction in question is a split transaction, its
      // subtransactions will be returned in the `substransactions` property on
      // the parent transaction.
      //
      // The edit item components expect to work with a flat array of
      // transactions when handling splits, so we call ungroupTransactions to
      // flatten parent and children into one array.
      const { data } = await aqlQuery(
        q('transactions')
          .filter({ id: transactionId })
          .select('*')
          .options({ splits: 'grouped' }),
      );

      if (!unmounted) {
        const fetchedTransactions = ungroupTransactions(data);
        setTransactions(fetchedTransactions);
        setFetchedTransactions(fetchedTransactions);
      }
    }
    if (transactionId !== 'new') {
      fetchTransaction();
    } else {
      isAdding.current = true;
    }

    return () => {
      unmounted = true;
    };
  }, [transactionId]);

  useEffect(() => {
    if (isAdding.current) {
      setTransactions([
        {
          id: 'temp',
          date: (() => {
            const dateParam = searchParams.get('date') || '';
            if (!isNaN(Date.parse(dateParam))) {
              return dateParam;
            }
            return lastTransaction?.date || monthUtils.currentDay();
          })(),
          payee: searchParamPayee,
          account:
            searchParamAccount ||
            locationState?.accountId ||
            lastTransaction?.account ||
            null,
          category: searchParamCategory || locationState?.categoryId || null,
          amount: -amountToInteger(
            parseFloat(searchParams.get('amount') || '') || 0,
          ),
          cleared: searchParams.get('cleared') === 'true',
          notes: searchParams.get('notes') || '',
        },
      ]);
    }
  }, [
    locationState?.accountId,
    locationState?.categoryId,
    lastTransaction,
    searchParamAccount,
    searchParamCategory,
    searchParamPayee,
    searchParams,
  ]);

  const onUpdate = useCallback(
    async (
      serializedTransaction: TransactionEntity,
      updatedField: keyof TransactionEntity,
    ) => {
      const transaction = deserializeTransaction(
        serializedTransaction,
        null,
        dateFormat,
      );

      // Run the rules to auto-fill in any data. Right now we only do
      // this on new transactions because that's how desktop works.
      const newTransaction = { ...transaction };
      if (isTemporary(newTransaction)) {
        const afterRules = await send('rules-run', {
          transaction: newTransaction,
        });
        const diff = getChangedValues(newTransaction, afterRules);

        if (diff) {
          Object.keys(diff).forEach(key => {
            const field = key as keyof TransactionEntity;
            if (
              newTransaction[field] == null ||
              newTransaction[field] === '' ||
              newTransaction[field] === 0 ||
              newTransaction[field] === false
            ) {
              (newTransaction as Record<string, unknown>)[field] = diff[field];
            }
          });

          // When a rule updates a parent transaction, overwrite all changes to the current field in subtransactions.
          if (
            newTransaction.is_parent &&
            diff.subtransactions !== undefined &&
            updatedField !== null
          ) {
            newTransaction.subtransactions = diff.subtransactions.map(
              (st, idx) => ({
                ...(newTransaction.subtransactions?.[idx] || st),
                ...(st[updatedField] != null && {
                  [updatedField]: st[updatedField],
                }),
              }),
            );
          }
        }
      }

      const { data: newTransactions } = updateTransaction(
        transactions,
        newTransaction,
      );
      setTransactions(newTransactions);
    },
    [dateFormat, transactions],
  );

  const onSave = useCallback(
    async (newTransactions: TransactionEntity[]) => {
      if (isDeleted.current) {
        return;
      }

      const changes = diffItems(fetchedTransactions || [], newTransactions);
      if (
        changes.added.length > 0 ||
        changes.updated.length > 0 ||
        changes.deleted.length
      ) {
        const _remoteUpdates = await send('transactions-batch-update', {
          added: changes.added,
          deleted: changes.deleted,
          updated: changes.updated,
        });

        // if (onTransactionsChange) {
        //   onTransactionsChange({
        //     ...changes,
        //     updated: changes.updated.concat(remoteUpdates),
        //   });
        // }
      }

      if (isAdding.current) {
        // The first one is always the "parent" and the only one we care
        // about
        dispatch(setLastTransaction({ transaction: newTransactions[0] }));
      }
    },
    [dispatch, fetchedTransactions],
  );

  const onDelete = useCallback(
    async (id: TransactionEntity['id']) => {
      const changes = deleteTransaction(transactions, id);

      if (isAdding.current) {
        // Adding a new transactions, this disables saving when the component unmounts
        isDeleted.current = true;
      } else {
        const _remoteUpdates = await send('transactions-batch-update', {
          deleted: changes.diff.deleted,
        });

        // if (onTransactionsChange) {
        //   onTransactionsChange({ ...changes, updated: remoteUpdates });
        // }
      }

      setTransactions(changes.data);
    },
    [transactions],
  );

  const onAddSplit = useCallback(
    (id: TransactionEntity['id']) => {
      const changes = addSplitTransaction(transactions, id);
      setTransactions(changes.data);
    },
    [transactions],
  );

  const onSplit = useCallback(
    (id: TransactionEntity['id']) => {
      const changes = splitTransaction(transactions, id, parent => [
        makeChild(parent),
        makeChild(parent),
      ]);

      setTransactions(changes.data);
    },
    [transactions],
  );

  if (accounts.length === 0) {
    return (
      <Page
        header={
          <MobilePageHeader
            title={t('New Transaction')}
            leftContent={<MobileBackButton />}
          />
        }
        padding={0}
      >
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            backgroundColor: theme.mobilePageBackground,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              textAlign: 'center',
              marginBottom: 20,
              lineHeight: '1.5em',
            }}
          >
            <Trans>
              To add a transaction, you need to{' '}
              <strong>create an account first</strong>. You can add an account
              from the accounts page.
            </Trans>
          </Text>
          <Button
            variant="primary"
            onPress={() => {
              dispatch(
                pushModal({
                  modal: { name: 'add-account', options: {} },
                }),
              );
            }}
          >
            <Trans>Add account</Trans>
          </Button>
        </View>
      </Page>
    );
  }

  if (categories.length === 0) {
    return (
      <Page
        header={
          <MobilePageHeader
            title={t('New Transaction')}
            leftContent={<MobileBackButton />}
          />
        }
        padding={0}
      >
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            backgroundColor: theme.mobilePageBackground,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              textAlign: 'center',
              marginBottom: 20,
              lineHeight: '1.5em',
            }}
          >
            <Trans>
              To add a transaction, you need to{' '}
              <strong>create a category first</strong>. You can add categories
              from the budget page.
            </Trans>
          </Text>
          <Button
            variant="primary"
            onPress={() => {
              navigate('/budget');
            }}
          >
            <Trans>Go to budget</Trans>
          </Button>
        </View>
      </Page>
    );
  }

  // This check ensures the component only renders after the transaction state
  // has been properly initialized. When creating a new transaction (transactionId === 'new'),
  // the transaction is created in a useEffect that runs after the component mounts.
  // Returning null here acts as a loading state until that initialization completes.
  if (transactions.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.pageBackground,
      }}
    >
      <TransactionEditInner
        transactions={transactions}
        isAdding={isAdding.current}
        categories={categories}
        accounts={accounts}
        payees={payees}
        dateFormat={dateFormat}
        onUpdate={onUpdate}
        onSave={onSave}
        onDelete={onDelete}
        onSplit={onSplit}
        onAddSplit={onAddSplit}
      />
    </View>
  );
}

type TransactionEditProps = Omit<
  TransactionEditUnconnectedProps,
  'categories' | 'accounts' | 'payees' | 'lastTransaction' | 'dateFormat'
>;

export const TransactionEdit = (props: TransactionEditProps) => {
  const { data: { list: categories } = { list: [] } } = useCategories();
  const payees = usePayees();
  const lastTransaction = useSelector(
    state => state.transactions.lastTransaction,
  );
  const accounts = useAccounts();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';

  return (
    <SingleActiveEditFormProvider formName="mobile-transaction">
      <TransactionEditUnconnected
        {...props}
        categories={categories}
        payees={payees}
        lastTransaction={lastTransaction}
        accounts={accounts}
        dateFormat={dateFormat}
      />
    </SingleActiveEditFormProvider>
  );
};
