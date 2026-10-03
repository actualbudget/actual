import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation, useParams, useSearchParams } from 'react-router';

import { Button } from '@actual-app/components/button';
import { SvgSplit } from '@actual-app/components/icons/v0';
import {
  SvgAdd,
  SvgCalendar,
  SvgCheveronDown,
  SvgLocation,
  SvgPiggyBank,
  SvgTag,
  SvgTrash,
  SvgUser,
  SvgWallet,
} from '@actual-app/components/icons/v1';
import {
  SvgNotesPaper,
  SvgPencilWriteAlternate,
} from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { DEFAULT_MAX_DISTANCE_METERS } from '@actual-app/core/shared/constants';
import { calculateDistance } from '@actual-app/core/shared/location-utils';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import { DEFAULT_UPCOMING_SCHEDULE_DAYS } from '@actual-app/core/shared/schedules';
import {
  addSplitTransaction,
  deleteTransaction,
  makeEmptySplitSubtransactions,
  realizeTempTransactions,
  splitTransaction,
  ungroupTransactions,
  updateTransaction,
} from '@actual-app/core/shared/transactions';
import {
  amountToInteger,
  applyFindReplace,
  diffItems,
  getChangedValues,
  getNumberFormat,
  groupById,
  integerToAmount,
  integerToCurrency,
  MAX_SAFE_NUMBER,
  titleFirst,
} from '@actual-app/core/shared/util';
import type {
  AccountEntity,
  CategoryEntity,
  PayeeEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';
import {
  format as formatDate,
  isValid as isValidDate,
  parse as parseDate,
  parseISO,
} from 'date-fns';

import { toForeignDraft } from '#accounts/registerView';
import { NoteInsertHashButton } from '#components/autocomplete/NoteInsertHashButton';
import { NoteTagAutocomplete } from '#components/autocomplete/NoteTagAutocomplete';
import { MobileBackButton } from '#components/mobile/MobileBackButton';
import {
  FieldLabel,
  InputField,
  TapField,
  ToggleField,
} from '#components/mobile/MobileForms';
import { getPrettyPayee } from '#components/mobile/utils';
import { MobilePageHeader, Page } from '#components/Page';
import {
  propagateRuleChangeToSubtransactions,
  transactionForRulesFromList,
} from '#components/transactions/applyRulesToTransaction';
import {
  getClearedFieldNames,
  shouldApplyRuleChange,
  trackClearedField,
} from '#components/transactions/table/utils';
import type { ClearedFieldsByTransaction } from '#components/transactions/table/utils';
import {
  AccountCurrencyFormat,
  BudgetCurrencyFormat,
} from '#hooks/currencyFormatContext';
import { useAccounts } from '#hooks/useAccounts';
import { useAmountPrecision } from '#hooks/useAmountPrecision';
import { useCategories } from '#hooks/useCategories';
import { useDateFormat } from '#hooks/useDateFormat';
import { useFormat } from '#hooks/useFormat';
import { useLocalPref } from '#hooks/useLocalPref';
import { useLocationPermission } from '#hooks/useLocationPermission';
import { useNavigate } from '#hooks/useNavigate';
import { useNearbyPayees } from '#hooks/useNearbyPayees';
import { usePayees } from '#hooks/usePayees';
import {
  SingleActiveEditFormProvider,
  useSingleActiveEditForm,
} from '#hooks/useSingleActiveEditForm';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { pushModal } from '#modals/modalsSlice';
import { addNotification } from '#notifications/notificationsSlice';
import { useSavePayeeLocationMutation } from '#payees';
import { locationService } from '#payees/location';
import { aqlQuery } from '#queries/aqlQuery';
import { useDispatch, useSelector } from '#redux';
import { setLastTransaction } from '#transactions/transactionsSlice';
import { incompatibleAccountIds } from '#util/account-encoding';
import { getStatusLabel } from '#util/schedule';
import {
  calculateFutureTransactionInfo,
  createSingleTimeScheduleFromTransaction,
  isFutureTransaction,
} from '#util/schedule-actions';

import { AmountInput } from './AmountInput';
import { SplitAmountInput } from './SplitAmountInput';

function getFieldName(transactionId: TransactionEntity['id'], field: string) {
  return `${field}-${transactionId}`;
}

export function serializeTransaction(
  transaction: TransactionEntity,
  dateFormat: string,
  precision = 2,
) {
  const { date, amount } = transaction;
  return {
    ...transaction,
    date: formatDate(parseISO(date), dateFormat),
    amount: integerToAmount(amount || 0, precision),
  };
}

export function deserializeTransaction(
  transaction: TransactionEntity,
  originalTransaction: TransactionEntity | null,
  dateFormat: string,
  precision = 2,
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

  const encoded = amountToInteger(amount || 0, precision);
  return {
    ...realTransaction,
    date,
    amount:
      Number.isSafeInteger(encoded) && Math.abs(encoded) <= MAX_SAFE_NUMBER
        ? encoded
        : (originalTransaction?.amount ?? 0),
  };
}

export function lookupName(items: CategoryEntity[], id?: CategoryEntity['id']) {
  if (!id) {
    return null;
  }
  return items.find(item => item.id === id)?.name;
}

const dropdownChevron = (
  <SvgCheveronDown
    width={14}
    height={14}
    style={{ color: theme.pageTextSubdued, marginRight: 8 }}
  />
);

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
  isSaving: boolean;
  onAdd: () => void;
  onSave: () => void;
  onSchedule: () => void;
  onSplit: (id: TransactionEntity['id']) => void;
  onAddSplit: (id: TransactionEntity['id']) => void;
  onEmptySplitFound: (id: TransactionEntity['id']) => void;
  editingField?: string;
  isFuture: boolean;
  onEditField: (
    id: TransactionEntity['id'],
    field: 'category' | 'payee' | 'account' | 'date' | 'amount' | 'notes',
  ) => void;
};

function Footer({
  transactions,
  isAdding,
  isSaving,
  onAdd,
  onSave,
  onSchedule,
  onSplit,
  onAddSplit,
  onEmptySplitFound,
  editingField,
  onEditField,
  isFuture,
}: FooterProps) {
  const precision = useAmountPrecision();
  const formatter = getNumberFormat({ decimalPlaces: precision }).formatter;
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
        gap: 8,
      }}
    >
      {isFuture && (
        <Button
          variant="normal"
          style={{ height: styles.mobileMinHeight }}
          isDisabled={!!editingField}
          onPress={onSchedule}
        >
          <SvgCalendar width={17} height={17} />
          <Text
            style={{
              ...styles.text,
              marginLeft: 6,
            }}
          >
            <Trans>Schedule</Trans>
          </Text>
        </Button>
      )}
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
                    formatter,
                    precision,
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
                    formatter,
                    precision,
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
          isDisabled={!!editingField || isSaving}
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
          isDisabled={!!editingField || isSaving}
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
  keyboardHeader: ReactNode;
  transaction: TransactionEntity;
  negate: boolean;
  amountFocused: boolean;
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
      negate,
      amountFocused,
      getCategory,
      getPayee,
      getTransferAccount,
      isOffBudget,
      isBudgetTransfer,
      onEditField,
      onUpdate,
      onDelete,
      keyboardHeader,
    },
    ref,
  ) => {
    const { t } = useTranslation();
    const { editingField, onRequestActiveEdit, onClearActiveEdit } =
      useSingleActiveEditForm()!;
    const noteRef = useRef<HTMLInputElement | null>(null);

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
              icon={<SvgUser width={17} height={17} />}
              placeholder={
                transaction.amount > 0
                  ? t('Who paid you?')
                  : t('Who did you pay?')
              }
              rightContent={dropdownChevron}
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
            <SplitAmountInput
              keyboardHeader={keyboardHeader}
              disabled={
                !!editingField &&
                editingField !== getFieldName(transaction.id, 'amount')
              }
              value={transaction.amount}
              negate={negate}
              autoFocus={amountFocused}
              onFocus={event => {
                onRequestActiveEdit(getFieldName(transaction.id, 'amount'));

                const input = event.currentTarget as HTMLInputElement;
                input.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              onBlur={() => onClearActiveEdit()}
              onChange={amount => {
                onUpdate(transaction, 'amount', amount);
              }}
            />
          </View>
        </View>

        <View>
          <FieldLabel title={t('Category')} />
          <TapField
            icon={<SvgTag width={17} height={17} />}
            placeholder={t('Select a category')}
            rightContent={dropdownChevron}
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
            ref={noteRef}
            iconStart={<SvgNotesPaper width={17} height={17} />}
            iconEnd={<NoteInsertHashButton inputRef={noteRef} />}
            placeholder={t('Add a note (optional)')}
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
          <NoteTagAutocomplete inputRef={noteRef} />
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

/** An existing foreign amount: native in its currency, base beneath. */
function FrozenForeignAmount({
  transaction,
}: {
  transaction: TransactionEntity;
}) {
  const format = useFormat();
  return (
    <View style={{ alignItems: 'center', gap: 4, paddingTop: 8 }}>
      <Text style={{ fontSize: 30, ...styles.tnum }}>
        {format(transaction.transaction_amount ?? 0, 'financial')}
      </Text>
      <BudgetCurrencyFormat>
        <BaseAmountText amount={transaction.amount} />
      </BudgetCurrencyFormat>
      <Text style={{ color: theme.pageTextSubdued, fontSize: 13 }}>
        <Trans>Editing foreign amounts is not available yet</Trans>
      </Text>
    </View>
  );
}

function BaseAmountText({ amount }: { amount: number }) {
  const format = useFormat();
  return (
    <Text style={{ color: theme.pageTextSubdued, ...styles.tnum }}>
      {format(amount, 'financial')}
    </Text>
  );
}

type TransactionEditInnerProps = {
  isAdding: boolean;
  accounts: AccountEntity[];
  categories: CategoryEntity[];
  payees: PayeeEntity[];
  dateFormat: string;
  transactions: TransactionEntity[];
  /** A save is in flight; saving again is refused. */
  isSaving: boolean;
  /** Resolves true when the editor may close. */
  onSave: (transactions: TransactionEntity[]) => Promise<boolean>;
  onUpdate: <Field extends keyof TransactionEntity>(
    transaction: TransactionEntity,
    field: Field,
    value?: TransactionEntity[Field],
  ) => void;
  onDelete: (id: TransactionEntity['id']) => void;
  onSplit: (id: TransactionEntity['id']) => void;
  onAddSplit: (id: TransactionEntity['id']) => void;
  shouldShowSaveLocation?: boolean;
  onSaveLocation?: () => void;
  onSelectNearestPayee?: () => void;
  onRequestLocation?: () => void;
  nearestPayee?: PayeeEntity | null;
};

const TransactionEditInner = memo<TransactionEditInnerProps>(
  function TransactionEditInner({
    isAdding,
    isSaving,
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
    shouldShowSaveLocation,
    onSaveLocation,
    onSelectNearestPayee,
    onRequestLocation,
    nearestPayee,
  }) {
    const { t } = useTranslation();
    const precision = useAmountPrecision();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [showHiddenCategories] = useLocalPref('budget.showHiddenCategories');
    const [upcomingLength = DEFAULT_UPCOMING_SCHEDULE_DAYS] = useSyncedPref(
      'upcomingScheduledTransactionLength',
    );
    const transactions = useMemo(
      () =>
        unserializedTransactions.map(t =>
          serializeTransaction(t, dateFormat, precision),
        ) || [],
      [unserializedTransactions, dateFormat, precision],
    );
    const { data: { grouped: categoryGroups } = { grouped: [] } } =
      useCategories();
    const noteRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
      if (window.history.length === 1) {
        window.history.replaceState(null, 'Actual Budget', '/');
        window.history.pushState(null, 'Add Transaction', '/transactions/new');
      }
    }, []);

    const [transaction, ...childTransactions] = transactions;

    const isFuture =
      unserializedTransactions.length > 0 &&
      isFutureTransaction(unserializedTransactions[0]);

    const { editingField, onRequestActiveEdit, onClearActiveEdit } =
      useSingleActiveEditForm()!;
    const childTransactionElementRefMap = useRef<
      Record<TransactionEntity['id'], HTMLDivElement | null>
    >({});
    const hasAccountChanged = useRef(false);

    const payeesById = useMemo(() => groupById(payees), [payees]);
    const accountsById = useMemo(() => groupById(accounts), [accounts]);

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

    const storedParent = unserializedTransactions[0];
    const isForeignTransaction = !!getAccount(storedParent)?.currency;
    // Existing foreign amounts are frozen until foreign edits are supported.
    const isAmountFrozen = isForeignTransaction && !isAdding;

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

    const onSaveInner = useCallback(async () => {
      const onConfirmSave = () => {
        let transactionsToSave = unserializedTransactions;
        if (isAdding) {
          transactionsToSave = realizeTempTransactions(
            unserializedTransactions,
          );
        }

        void onSave(transactionsToSave).then(canClose => {
          if (canClose) {
            void navigate(-1);
          }
        });
      };

      if (unserializedTransactions.some(t => t.reconciled)) {
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
        const transferIds = unserializedTransactions
          .map(t => t.transfer_id)
          .filter((id): id is string => id != null);

        if (transferIds.length > 0) {
          const { data } = await aqlQuery(
            q('transactions')
              .filter({
                id: { $oneof: transferIds },
                reconciled: true,
              })
              .select('id'),
          );
          if ((data as TransactionEntity[]).length > 0) {
            dispatch(
              pushModal({
                modal: {
                  name: 'confirm-transaction-edit',
                  options: {
                    onConfirm: onConfirmSave,
                    confirmReason: 'batchEditWithReconciledTransfer',
                  },
                },
              }),
            );
          } else {
            onConfirmSave();
          }
        } else {
          onConfirmSave();
        }
      }
    }, [isAdding, dispatch, navigate, onSave, unserializedTransactions]);

    const onSchedule = useCallback(async () => {
      const [unserializedTransaction] = unserializedTransactions;

      if (!unserializedTransaction.account) {
        dispatch(
          addNotification({
            notification: {
              type: 'error',
              message: t('Account is a required field'),
            },
          }),
        );
        return;
      }

      // Already linked to a schedule; keep it as a transaction.
      if (unserializedTransaction.schedule) {
        return;
      }

      const transactionForSchedule = unserializedTransaction.is_parent
        ? {
            ...unserializedTransaction,
            subtransactions: unserializedTransactions.filter(
              t => t.is_child && t.parent_id === unserializedTransaction.id,
            ),
          }
        : unserializedTransaction;

      const createSchedule = async () => {
        try {
          await createSingleTimeScheduleFromTransaction(transactionForSchedule);
        } catch {
          dispatch(
            addNotification({
              notification: {
                type: 'error',
                message: t('Failed to create schedule'),
              },
            }),
          );
          return;
        }

        try {
          if (
            !isAdding &&
            unserializedTransaction.id &&
            !unserializedTransaction.id.startsWith('temp')
          ) {
            await send('transaction-delete', {
              id: unserializedTransaction.id,
            });
          }
        } catch {
          dispatch(
            addNotification({
              notification: {
                type: 'error',
                message: t(
                  'Schedule created, but the original transaction could not be deleted',
                ),
              },
            }),
          );
          void navigate(-1);
          return;
        }

        dispatch(
          addNotification({
            notification: {
              type: 'message',
              message: t('Schedule created successfully'),
            },
          }),
        );
        void navigate(-1);
      };

      const { isBeyondWindow, daysUntilTransaction, upcomingDays } =
        calculateFutureTransactionInfo(transactionForSchedule, upcomingLength);

      if (isBeyondWindow) {
        dispatch(
          pushModal({
            modal: {
              name: 'convert-to-schedule',
              options: {
                daysUntilTransaction,
                upcomingDays,
                onConfirm: createSchedule,
              },
            },
          }),
        );
      } else {
        await createSchedule();
      }
    }, [
      isAdding,
      dispatch,
      navigate,
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
        onUpdate(newTransaction, name);
        onClearActiveEdit();

        if (name === 'account') {
          hasAccountChanged.current = serializedTransaction.account !== value;
        }
      },
      [onClearActiveEdit, onUpdate],
    );

    const onUnlockReconciledInner = useCallback(
      (serializedTransaction: TransactionEntity) => {
        dispatch(
          pushModal({
            modal: {
              name: 'confirm-transaction-edit',
              options: {
                confirmReason: 'unlockReconciled',
                onConfirm: () => {
                  void onUpdateInner(
                    serializedTransaction,
                    'reconciled',
                    false,
                  );
                },
              },
            },
          }),
        );
      },
      [dispatch, onUpdateInner],
    );

    const onTotalAmountUpdate = useCallback(
      (value: number) => {
        if (transaction.amount !== value) {
          void onUpdateInner(transaction, 'amount', value);
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
                      showNoneOption: true,
                      month: monthUtils.monthFromDate(
                        unserializedTransaction.date,
                      ),
                      onSelect: categoryId => {
                        void onUpdateInner(
                          transactionToEdit,
                          name,
                          categoryId as TransactionEntity['category'],
                        );
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
                      // A saved transaction keeps its recorded encoding, and a
                      // split draft cannot become foreign (splits arrive with
                      // foreign edits).
                      hiddenAccounts: editorHiddenAccounts({
                        isAdding,
                        accounts,
                        account: getAccount(unserializedTransaction),
                        hasSplits: childTransactions.length > 0,
                      }),
                      onSelect: accountId => {
                        void onUpdateInner(transactionToEdit, name, accountId);
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
                      showNoneOption: !!transactionToEdit.payee,
                      // A new foreign entry creates a typed payee when it posts.
                      deferNewPayee: isAdding && isForeignTransaction,
                      onSelect: payeeId => {
                        void onUpdateInner(transactionToEdit, name, payeeId);
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
                          void onUpdateInner(
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
                          void onUpdateInner(transactionToEdit, name, value);
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
        isAdding,
        getAccount,
        childTransactions.length,
        accounts,
        isForeignTransaction,
      ],
    );

    const onDeleteInner = useCallback(
      async (id: TransactionEntity['id']) => {
        const [parentTransaction] = unserializedTransactions;
        const targetTransaction =
          unserializedTransactions.find(t => t.id === id) ?? parentTransaction;

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

                    if (parentTransaction.id !== id) {
                      // Only a child transaction was deleted.
                      onClearActiveEdit();
                      return;
                    }

                    void navigate(-1);
                  },
                },
              },
            }),
          );
        };

        if (targetTransaction.reconciled) {
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
        } else if (targetTransaction.transfer_id) {
          const { data } = await aqlQuery(
            q('transactions')
              .filter({
                id: targetTransaction.transfer_id,
                reconciled: true,
              })
              .select('id'),
          );
          if ((data as TransactionEntity[]).length > 0) {
            dispatch(
              pushModal({
                modal: {
                  name: 'confirm-transaction-edit',
                  options: {
                    onConfirm: onConfirmDelete,
                    confirmReason: 'batchDeleteWithReconciledTransfer',
                  },
                },
              }),
            );
          } else {
            onConfirmDelete();
          }
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

    const account = getAccount(transaction);
    const isOffBudget = account ? !!account.offbudget : false;
    // A new foreign entry shows a typed payee that is created when it posts.
    const title = transaction.payee?.startsWith('new:')
      ? transaction.payee.slice('new:'.length)
      : getPrettyPayee({
          t,
          transaction,
          payee: getPayee(transaction),
          transferAccount: getTransferAccount(transaction),
        });

    const [referenceDate] = useState(() => new Date());
    const transactionDate = parseDate(
      transaction.date,
      dateFormat,
      referenceDate,
    );
    const dateDefaultValue = monthUtils.dayFromDate(transactionDate);

    const remaining = transaction.error?.difference ?? 0;

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
            isSaving={isSaving}
            onAdd={onSaveInner}
            onSave={onSaveInner}
            onSchedule={onSchedule}
            onSplit={onSplit}
            onAddSplit={onAddSplit}
            onEmptySplitFound={onEmptySplitFound}
            editingField={editingField}
            // Schedules for accounts in other currencies arrive later.
            isFuture={isFuture && !isForeignTransaction}
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
            {isAmountFrozen ? (
              <FrozenForeignAmount transaction={storedParent} />
            ) : (
              <AmountInput
                value={transaction.amount}
                negate
                disabled={
                  !!editingField &&
                  editingField !== getFieldName(transaction.id, 'amount')
                }
                autoFocus={isAdding}
                disableNativeAutoFocusOnIOS
                onFocus={() => {
                  onRequestActiveEdit(getFieldName(transaction.id, 'amount'));
                }}
                onBlur={() => onClearActiveEdit()}
                onChange={onTotalAmountUpdate}
                variant="large"
              />
            )}
          </View>

          <View>
            <FieldLabel title={t('Payee')} />
            <TapField
              icon={<SvgUser width={17} height={17} />}
              placeholder={
                transaction.amount > 0
                  ? t('Who paid you?')
                  : t('Who did you pay?')
              }
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
              alwaysShowRightContent={
                (!!nearestPayee || !!onRequestLocation) &&
                !transaction.payee &&
                !shouldShowSaveLocation
              }
              rightContent={
                shouldShowSaveLocation ? (
                  <Button
                    variant="bare"
                    onPress={onSaveLocation}
                    style={{
                      backgroundColor: theme.buttonNormalBackground,
                      border: `1px solid ${theme.buttonNormalBorder}`,
                      color: theme.buttonNormalText,
                      fontSize: '11px',
                      padding: '4px 8px',
                      borderRadius: 3,
                      height: 'auto',
                      minHeight: 'auto',
                    }}
                  >
                    <Trans>Save</Trans>
                    <SvgLocation
                      width={10}
                      height={10}
                      style={{ marginLeft: 4 }}
                    />
                  </Button>
                ) : nearestPayee && !transaction.payee ? (
                  <Button
                    variant="bare"
                    onPress={onSelectNearestPayee}
                    style={{
                      backgroundColor: theme.buttonNormalBackground,
                      border: `1px solid ${theme.buttonNormalBorder}`,
                      color: theme.buttonNormalText,
                      fontSize: '11px',
                      padding: '4px 8px',
                      borderRadius: 3,
                      height: 'auto',
                      minHeight: 'auto',
                    }}
                  >
                    <Trans>Nearby</Trans>
                    <SvgLocation
                      width={10}
                      height={10}
                      style={{ marginLeft: 4 }}
                    />
                  </Button>
                ) : onRequestLocation && !transaction.payee ? (
                  <Button
                    variant="bare"
                    onPress={onRequestLocation}
                    style={{
                      backgroundColor: theme.buttonNormalBackground,
                      border: `1px solid ${theme.buttonNormalBorder}`,
                      color: theme.buttonNormalText,
                      fontSize: '11px',
                      padding: '4px 8px',
                      borderRadius: 3,
                      height: 'auto',
                      minHeight: 'auto',
                    }}
                  >
                    <Trans>Request Location</Trans>
                    <SvgLocation
                      width={10}
                      height={10}
                      style={{ marginLeft: 4 }}
                    />
                  </Button>
                ) : (
                  dropdownChevron
                )
              }
            />
          </View>

          {!transaction.is_parent && (
            <View>
              <FieldLabel title={t('Category')} />
              <TapField
                icon={<SvgTag width={17} height={17} />}
                placeholder={t('Select a category')}
                rightContent={dropdownChevron}
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
              negate={transaction.amount <= 0}
              amountFocused={arr.findIndex(c => c.amount === 0) === i}
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
              keyboardHeader={
                <FillRemainingButton
                  remaining={remaining}
                  onPress={() => {
                    void onUpdateInner(
                      childTrans,
                      'amount',
                      integerToAmount(remaining, precision),
                    );
                  }}
                />
              }
            />
          ))}

          {transaction.amount !== 0 &&
            childTransactions.length === 0 &&
            !isForeignTransaction && (
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
              icon={<SvgWallet width={17} height={17} />}
              placeholder={t('Select an account')}
              rightContent={dropdownChevron}
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
                iconStart={<SvgCalendar width={17} height={17} />}
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
                <ToggleField
                  id="reconciled"
                  isOn
                  onToggle={() => onUnlockReconciledInner(transaction)}
                />
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
              ref={noteRef}
              iconStart={<SvgNotesPaper width={17} height={17} />}
              iconEnd={<NoteInsertHashButton inputRef={noteRef} />}
              placeholder={t('Add a note (optional)')}
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
            <NoteTagAutocomplete inputRef={noteRef} />
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

/** An existing foreign transaction's patch never carries its stored pair. */
export function editableForeignPatch(change: Partial<TransactionEntity>) {
  const {
    amount: _amount,
    transaction_amount: _transactionAmount,
    ...editable
  } = change;
  return editable;
}

/**
 * Accounts the editor's account picker hides: a saved transaction keeps its
 * recorded encoding, and a split draft cannot become foreign (splits arrive
 * with foreign edits).
 */
export function editorHiddenAccounts({
  isAdding,
  accounts,
  account,
  hasSplits,
}: {
  isAdding: boolean;
  accounts: AccountEntity[];
  account: AccountEntity | undefined;
  hasSplits: boolean;
}) {
  if (!isAdding) {
    return incompatibleAccountIds(accounts, [account]);
  }
  return hasSplits
    ? accounts.filter(other => other.currency).map(other => other.id)
    : [];
}

/**
 * Fields a rule preview may apply: never a field edited (by the user or a
 * newer preview) after it started, nor an account the draft cannot move to.
 */
export function rulePreviewFields({
  transaction,
  diff,
  updatedField,
  startedAt,
  fieldEditedAt,
  clearedFields,
  isAccountAllowed = () => true,
}: {
  transaction: TransactionEntity;
  diff: Partial<TransactionEntity>;
  updatedField: keyof TransactionEntity;
  startedAt: number;
  fieldEditedAt: ReadonlyMap<string, number>;
  clearedFields?: ClearedFieldsByTransaction;
  isAccountAllowed?: (accountId: AccountEntity['id'] | null) => boolean;
}) {
  const clearedOnThisRow = getClearedFieldNames(clearedFields, transaction.id);
  const ruleFields = new Set<keyof TransactionEntity>();
  const ruled = { ...transaction };
  Object.keys(diff).forEach(key => {
    const field = key as keyof TransactionEntity;
    if ((fieldEditedAt.get(field) ?? 0) > startedAt) {
      return;
    }
    if (field === 'account' && !isAccountAllowed(diff.account ?? null)) {
      return;
    }
    // Apply rule changes to "empty" fields and append/prepend notes rules
    // (see shouldApplyRuleChange).
    // Or update all fields if the payee changes (assists location-based entry by
    // applying rules to prefill category, notes, etc. based on the selected payee)
    // except fields the user explicitly cleared, which must stay empty.
    if (
      !clearedOnThisRow.includes(field) &&
      (updatedField === 'payee' ||
        shouldApplyRuleChange(
          field,
          Reflect.get(transaction, field),
          diff[field],
        ))
    ) {
      (ruled as Record<string, unknown>)[field] = diff[field];
      ruleFields.add(field);
    }
  });

  if ((fieldEditedAt.get('subtransactions') ?? 0) > startedAt) {
    return { ruleFields, ruled };
  }
  const subtransactions = propagateRuleChangeToSubtransactions(
    ruled,
    diff.subtransactions,
    updatedField,
    clearedFields,
  );
  if (subtransactions) {
    ruled.subtransactions = subtransactions;
    ruleFields.add('subtransactions');
  } else if (
    diff.subtransactions &&
    (updatedField === 'payee' ||
      shouldApplyRuleChange(
        'subtransactions',
        transaction.subtransactions,
        diff.subtransactions,
      ))
  ) {
    // First time a split rule converts this row into a parent.
    ruled.subtransactions = diff.subtransactions;
    ruleFields.add('subtransactions');
  }
  return { ruleFields, ruled };
}

/**
 * Merges only the changed fields onto the latest state, since updates can be
 * in flight at the same time (e.g. an amount blur racing a nearby payee
 * press).
 */
function mergeTransactionFields(
  prevTransactions: TransactionEntity[],
  source: TransactionEntity,
  fields: ReadonlySet<keyof TransactionEntity>,
) {
  const latestTransaction = prevTransactions.find(t => t.id === source.id);
  if (!latestTransaction) {
    // The transaction was deleted while this update was in flight.
    return prevTransactions;
  }
  const merged = { ...latestTransaction };
  for (const field of fields) {
    (merged as Record<string, unknown>)[field] = source[field];
  }

  // When editing a split parent without a fresh subtransactions payload
  // from rules, re-attach the latest children so updateTransaction keeps
  // the existing split structure.
  if (
    !merged.subtransactions &&
    (merged.is_parent || latestTransaction.is_parent)
  ) {
    const children = prevTransactions.filter(
      t => t.is_child && t.parent_id === merged.id,
    );
    merged.subtransactions = children;
    merged.is_parent = true;

    const updated = updateTransaction(prevTransactions, merged).data;
    // updateTransaction → makeChild clears child.error; restore any that
    // were already on the flat list so split-error UI stays correct.
    const childErrors = new Map(
      children.filter(c => c.error != null).map(c => [c.id, c.error!] as const),
    );
    if (childErrors.size === 0) {
      return updated;
    }
    return updated.map(t => {
      const error = childErrors.get(t.id);
      return error !== undefined ? { ...t, error } : t;
    });
  }

  return updateTransaction(prevTransactions, merged).data;
}

/** Amounts are entered in the precision of the transaction's account. */
function precisionOf(
  accountsById: Record<string, AccountEntity>,
  budgetPrecision: number,
  accountId: AccountEntity['id'] | null | undefined,
) {
  const account = accountId ? accountsById[accountId] : undefined;
  return account?.currency && account.currency_precision != null
    ? account.currency_precision
    : budgetPrecision;
}

function encodingOf(
  accountsById: Record<string, AccountEntity>,
  budgetPrecision: number,
  accountId: AccountEntity['id'] | null | undefined,
) {
  const currency = (accountId && accountsById[accountId]?.currency) || '';
  return `${currency}:${precisionOf(accountsById, budgetPrecision, accountId)}`;
}

/**
 * Re-encodes an amount for another precision when the value is exactly
 * representable there and within the amount limits; otherwise null.
 */
export function reencodeAmount(
  amount: number,
  fromPrecision: number,
  toPrecision: number,
) {
  const reencoded = amountToInteger(
    integerToAmount(amount, fromPrecision),
    toPrecision,
  );
  return Number.isSafeInteger(reencoded) &&
    Math.abs(reencoded) <= MAX_SAFE_NUMBER &&
    amountToInteger(integerToAmount(reencoded, toPrecision), fromPrecision) ===
      amount
    ? reencoded
    : null;
}

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
  const precision = useAmountPrecision();
  const { transactionId } = useParams();
  const { state: locationState } = useLocation();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const updatePayeeLocationMutation = useSavePayeeLocationMutation();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<TransactionEntity[]>([]);
  const [fetchedTransactions, setFetchedTransactions] = useState<
    TransactionEntity[]
  >([]);
  const transactionsRef = useRef(transactions);
  useLayoutEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);
  const isAdding = useRef(false);
  const isDeleted = useRef(false);
  const [learnCategories = 'true'] = useSyncedPref('learn-categories');
  const isLearnCategoriesEnabled = String(learnCategories) === 'true';
  const isDraftInitialized = useRef(false);
  const accountsById = useMemo(() => groupById(accounts), [accounts]);

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

  const {
    isGranted: isLocationGranted,
    isPending: shouldPromptLocation,
    requestPermission,
  } = useLocationPermission();
  const { data: nearbyPayees = [] } = useNearbyPayees({
    enabled: isLocationGranted,
  });
  const [shouldShowSaveLocation, setShouldShowSaveLocation] = useState(false);
  const nearestPayee = nearbyPayees[0]?.payee ?? null;

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
      void fetchTransaction();
    } else {
      isAdding.current = true;
    }

    return () => {
      unmounted = true;
    };
  }, [transactionId]);

  useEffect(() => {
    if (!isLocationGranted) {
      setShouldShowSaveLocation(false);
    }
  }, [isLocationGranted]);

  useEffect(() => {
    // Create the new draft once, after accounts load; later account or
    // preference refreshes must not reset the user's edits.
    const isReady =
      accounts.length > 0 &&
      (!searchParams.get('category') || categories.length > 0) &&
      (!searchParams.get('payee') || payees.length > 0);
    if (isAdding.current && !isDraftInitialized.current && isReady) {
      isDraftInitialized.current = true;
      const initialAccount =
        searchParamAccount ||
        locationState?.accountId ||
        lastTransaction?.account ||
        null;
      const requestedAmount = amountToInteger(
        parseFloat(searchParams.get('amount') || '') || 0,
        precisionOf(accountsById, precision, initialAccount),
      );
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
          account: initialAccount,
          category: searchParamCategory || locationState?.categoryId || null,
          amount:
            Number.isSafeInteger(requestedAmount) &&
            Math.abs(requestedAmount) <= MAX_SAFE_NUMBER
              ? -requestedAmount
              : 0,
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
    precision,
    accountsById,
    accounts.length,
    categories.length,
    payees.length,
  ]);

  // Fields the user explicitly emptied while entering the new transaction,
  // tracked per transaction row so a clear on one split row doesn't affect
  // its siblings. Rules re-run on every field commit, and they may not
  // re-fill these (e.g. a cleared pre-assigned category must stay cleared).
  const clearedFields = useRef(new Map<TransactionEntity['id'], Set<string>>());

  // Each user edit gets a generation; rule previews skip fields edited after
  // they started.
  const editGeneration = useRef(0);
  const fieldEditGeneration = useRef(new Map<string, number>());

  const onUpdate = useCallback(
    async (
      serializedTransaction: TransactionEntity,
      updatedField: keyof TransactionEntity,
    ) => {
      const previous = transactionsRef.current.find(
        t => t.id === serializedTransaction.id,
      );
      // The editor serialized this amount at the previous account's precision.
      const transaction = deserializeTransaction(
        serializedTransaction,
        null,
        dateFormat,
        precisionOf(
          accountsById,
          precision,
          previous?.account ?? serializedTransaction.account,
        ),
      );
      const changedFields = new Set<keyof TransactionEntity>([updatedField]);

      if (
        updatedField === 'account' &&
        previous &&
        isTemporary(transaction) &&
        encodingOf(accountsById, precision, previous.account) !==
          encodingOf(accountsById, precision, transaction.account)
      ) {
        // A new draft keeps the typed number when the target currency can
        // represent it exactly.
        const reencoded = reencodeAmount(
          transaction.amount,
          precisionOf(accountsById, precision, previous.account),
          precisionOf(accountsById, precision, transaction.account),
        );
        if (reencoded == null) {
          dispatch(
            addNotification({
              notification: {
                type: 'error',
                message: t(
                  "This amount has more decimal places than the selected account's currency allows, or is too large.",
                ),
              },
            }),
          );
          return;
        }
        transaction.amount = reencoded;
        changedFields.add('amount');
      }

      if (isTemporary(transaction)) {
        trackClearedField(clearedFields.current, transaction, updatedField);
      }

      const generation = ++editGeneration.current;
      for (const field of changedFields) {
        fieldEditGeneration.current.set(field, generation);
      }
      const startEncoding = encodingOf(
        accountsById,
        precision,
        transaction.account,
      );
      // Group a split before the update below changes the latest state.
      const transactionForRules = transactionForRulesFromList(
        transactionsRef.current,
        transaction,
      );

      // Apply the user's edit now so a slower rule preview cannot overwrite it.
      setTransactions(prevTransactions =>
        mergeTransactionFields(prevTransactions, transaction, changedFields),
      );

      // Run the rules to auto-fill in any data. Right now we only do
      // this on new transactions because that's how desktop works. A
      // foreign draft is ruled on its completed pair when it posts.
      const account = transaction.account
        ? accountsById[transaction.account]
        : undefined;
      if (isTemporary(transaction) && !account?.currency) {
        const afterRules = await send('rules-run', {
          transaction: transactionForRules,
        });
        const diff = getChangedValues(transactionForRules, afterRules);
        const latest = transactionsRef.current.find(
          t => t.id === transaction.id,
        );
        // A preview is stale once the draft's encoding or payee moved on.
        if (
          diff &&
          latest &&
          latest.payee === transaction.payee &&
          encodingOf(accountsById, precision, latest.account) === startEncoding
        ) {
          const { ruleFields, ruled } = rulePreviewFields({
            transaction: transactionForRules,
            diff,
            updatedField,
            startedAt: generation,
            fieldEditedAt: fieldEditGeneration.current,
            clearedFields: clearedFields.current,
            // The amount was entered for this encoding, so a rule cannot
            // move the draft to an account with another one.
            isAccountAllowed: accountId =>
              encodingOf(accountsById, precision, accountId) === startEncoding,
          });
          // Older previews never replace fields this one set.
          for (const field of ruleFields) {
            fieldEditGeneration.current.set(
              field,
              Math.max(fieldEditGeneration.current.get(field) ?? 0, generation),
            );
          }

          if (ruleFields.size > 0) {
            setTransactions(prevTransactions =>
              mergeTransactionFields(prevTransactions, ruled, ruleFields),
            );
          }
        }
      }

      if (updatedField === 'payee') {
        setShouldShowSaveLocation(false);

        if (
          transaction.payee &&
          !transaction.payee.startsWith('new:') &&
          isLocationGranted
        ) {
          const payeeLocations = await locationService.getPayeeLocations(
            transaction.payee,
          );
          if (payeeLocations.length === 0) {
            setShouldShowSaveLocation(true);
          } else {
            const currentPosition = await locationService.getCurrentPosition();
            const hasNearby = payeeLocations.some(
              loc =>
                calculateDistance(currentPosition, {
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                }) <= DEFAULT_MAX_DISTANCE_METERS,
            );
            if (!hasNearby) {
              setShouldShowSaveLocation(true);
            }
          }
        }
      }
    },
    [dateFormat, isLocationGranted, accountsById, dispatch, t, precision],
  );

  const [shouldCloseWhenModalsClear, setShouldCloseWhenModalsClear] =
    useState(false);

  /** Saves the edit; resolves true when the editor may close. */
  const saveTransactions = useCallback(
    async (newTransactions: TransactionEntity[]): Promise<boolean> => {
      if (isDeleted.current) {
        return true;
      }

      const [parent] = newTransactions;
      const parentAccount = parent?.account
        ? accountsById[parent.account]
        : undefined;
      const onPosted = () => {
        dispatch(setLastTransaction({ transaction: parent }));
        // Leave once any other open dialog is closed; navigating clears them.
        setShouldCloseWhenModalsClear(true);
      };

      // A new foreign entry posts atomically through the conversion dialog.
      if (
        isAdding.current &&
        parentAccount?.currency &&
        parentAccount.currency_precision != null
      ) {
        const draft = toForeignDraft(parent);
        const amount = draft.transaction_amount;
        if (amount === 0) {
          const result = await send('transactions/post-foreign-entry', {
            transaction: draft,
          });
          if (result.status === 'ok') {
            dispatch(setLastTransaction({ transaction: parent }));
            return true;
          }
        }
        dispatch(
          pushModal({
            modal: {
              name: 'foreign-amount',
              options: {
                transaction: draft,
                currencyCode: parentAccount.currency,
                nativePrecision: parentAccount.currency_precision,
                onPosted,
              },
            },
          }),
        );
        return false;
      }

      // A draft that kept a deferred new payee after moving to a base
      // account creates it now, once per name, and keeps the id in the draft
      // so a retry reuses it.
      const createdPayees = new Map<string, string>();
      for (const trans of newTransactions) {
        const name = trans.payee?.startsWith('new:')
          ? trans.payee.slice('new:'.length)
          : null;
        if (name != null && !createdPayees.has(name)) {
          createdPayees.set(name, await send('payee-create', { name }));
        }
      }
      const withPayee = (trans: TransactionEntity) => {
        const name = trans.payee?.startsWith('new:')
          ? trans.payee.slice('new:'.length)
          : null;
        return name != null
          ? { ...trans, payee: createdPayees.get(name) ?? null }
          : trans;
      };
      const resolvedTransactions = newTransactions.map(withPayee);
      if (createdPayees.size > 0) {
        setTransactions(prev => prev.map(withPayee));
      }
      const changes = diffItems(
        fetchedTransactions || [],
        resolvedTransactions,
      );
      // Existing foreign amounts are frozen; their patches never carry the
      // stored pair.
      const updated = changes.updated.map(change => {
        const stored = fetchedTransactions.find(t => t.id === change.id);
        if (!stored?.account || !accountsById[stored.account]?.currency) {
          return change;
        }
        return editableForeignPatch(change);
      });
      if (
        changes.added.length > 0 ||
        updated.length > 0 ||
        changes.deleted.length
      ) {
        try {
          await send('transactions-batch-update', {
            added: changes.added,
            deleted: changes.deleted,
            updated,
            learnCategories: isLearnCategoriesEnabled,
          });
        } catch {
          dispatch(
            addNotification({
              notification: {
                type: 'error',
                message: t('This transaction could not be saved.'),
              },
            }),
          );
          return false;
        }
      }

      if (isAdding.current) {
        // The first one is always the "parent" and the only one we care
        // about
        dispatch(setLastTransaction({ transaction: newTransactions[0] }));
      }
      return true;
    },
    [dispatch, fetchedTransactions, accountsById, t, isLearnCategoriesEnabled],
  );

  // The save guard lives here so it survives the editor remounting (for
  // example when the account's currency format changes mid-save).
  const isSavingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const onSave = useCallback(
    async (newTransactions: TransactionEntity[]) => {
      // One save at a time: a second tap must not post a second copy.
      if (isSavingRef.current) {
        return false;
      }
      isSavingRef.current = true;
      setIsSaving(true);
      try {
        return await saveTransactions(newTransactions);
      } catch {
        dispatch(
          addNotification({
            notification: {
              type: 'error',
              message: t('This transaction could not be saved.'),
            },
          }),
        );
        return false;
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);
      }
    },
    [saveTransactions, dispatch, t],
  );

  const openModalCount = useSelector(state => state.modals.modalStack.length);
  useEffect(() => {
    if (shouldCloseWhenModalsClear && openModalCount === 0) {
      setShouldCloseWhenModalsClear(false);
      void navigate(-1);
    }
  }, [shouldCloseWhenModalsClear, openModalCount, navigate]);

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
      const changes = splitTransaction(
        transactions,
        id,
        makeEmptySplitSubtransactions,
      );

      setTransactions(changes.data);
    },
    [transactions],
  );

  const onSaveLocation = useCallback(async () => {
    try {
      const [transaction] = transactions;
      if (transaction.payee) {
        await updatePayeeLocationMutation.mutateAsync(transaction.payee);
        setShouldShowSaveLocation(false);
      }
    } catch (error) {
      console.error('Failed to save location', { error });
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t('Failed to save location'),
          },
        }),
      );
    }
  }, [t, transactions, dispatch, updatePayeeLocationMutation]);

  const onSelectNearestPayee = useCallback(() => {
    const transaction = transactions[0];
    if (!nearestPayee || !transaction || transaction.payee) {
      return;
    }

    const updated = {
      ...serializeTransaction(transaction, dateFormat, precision),
      payee: nearestPayee.id,
    };
    void onUpdate(updated, 'payee');
  }, [transactions, nearestPayee, onUpdate, dateFormat, precision]);

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
              void navigate('/budget');
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
      {/* Amounts display in the selected account's currency. */}
      <AccountCurrencyFormat
        account={accounts.find(
          account => account.id === transactions[0].account,
        )}
      >
        <TransactionEditInner
          transactions={transactions}
          isSaving={isSaving}
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
          shouldShowSaveLocation={shouldShowSaveLocation}
          onSaveLocation={onSaveLocation}
          onSelectNearestPayee={onSelectNearestPayee}
          nearestPayee={isLocationGranted ? nearestPayee : null}
          onRequestLocation={
            shouldPromptLocation ? requestPermission : undefined
          }
        />
      </AccountCurrencyFormat>
    </View>
  );
}

export const TransactionEdit = () => {
  const { data: { list: categories } = { list: [] } } = useCategories();
  const { data: payees = [] } = usePayees();
  const lastTransaction = useSelector(
    state => state.transactions.lastTransaction,
  );
  const { data: accounts = [] } = useAccounts();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';

  return (
    <SingleActiveEditFormProvider formName="mobile-transaction">
      <TransactionEditUnconnected
        categories={categories}
        payees={payees}
        lastTransaction={lastTransaction}
        accounts={accounts}
        dateFormat={dateFormat}
      />
    </SingleActiveEditFormProvider>
  );
};

function FillRemainingButton({
  remaining,
  onPress,
}: {
  readonly remaining: number;
  readonly onPress: () => void;
}) {
  const precision = useAmountPrecision();
  return (
    <Button
      variant="primary"
      style={{ height: styles.mobileMinHeight }}
      onPress={onPress}
      isDisabled={remaining === 0}
    >
      <SvgSplit width={17} height={17} />
      <Text
        style={{
          ...styles.text,
          marginLeft: 6,
        }}
      >
        <Trans>
          Use remaining:{' '}
          {{
            amount: integerToCurrency(
              Math.abs(remaining),
              getNumberFormat({ decimalPlaces: precision }).formatter,
              precision,
            ),
          }}
        </Trans>
      </Text>
    </Button>
  );
}
