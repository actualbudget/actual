import React, { useEffect, useEffectEvent, useState } from 'react';
import type { FormEvent } from 'react';
import { Form } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { View } from '@actual-app/components/view';
import { getNormalisedString } from '@actual-app/core/shared/normalisation';
import { q } from '@actual-app/core/shared/query';
import type { IntegerAmount } from '@actual-app/core/shared/util';
import type {
  AccountEntity,
  CategoryEntity,
  PayeeEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

import { AccountAutocomplete } from '#components/autocomplete/AccountAutocomplete';
import { CategoryAutocomplete } from '#components/autocomplete/CategoryAutocomplete';
import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '#components/common/Modal';
import { DateSelect } from '#components/select/DateSelect';
import {
  addNewTransactions,
  applyRulesToNewTransaction,
} from '#components/transactions/TransactionList';
import { AmountInput } from '#components/util/AmountInput';
import { useDateFormat } from '#hooks/useDateFormat';
import { usePayees } from '#hooks/usePayees';
import { useSyncedPref } from '#hooks/useSyncedPref';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { addNotification } from '#notifications/notificationsSlice';
import { useCreatePayeeMutation } from '#payees';
import { aqlQuery } from '#queries/aqlQuery';
import { useDispatch } from '#redux';
import { undo } from '#undo';

import { previewHintId, QuickAddPreviewField } from './QuickAddPreviewField';

type QuickAddTransactionModalProps = Extract<
  ModalType,
  { name: 'quick-add-transaction' }
>['options'];

type CategorySource = 'parsed' | 'rule' | 'recent' | 'user' | null;

export function QuickAddTransactionModal({
  parsed,
  accountId: initialAccountId,
  onAdded,
}: QuickAddTransactionModalProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const [learnCategories = 'true'] = useSyncedPref('learn-categories');
  const { data: payees = [] } = usePayees();
  const createPayee = useCreatePayeeMutation();

  const [date, setDate] = useState(parsed.date.value);
  const [payeeName, setPayeeName] = useState(parsed.payee.value?.name ?? '');
  const [amount, setAmount] = useState<IntegerAmount>(
    (parsed.amount.value ?? 0) *
      (parsed.direction.value === 'outflow' ? -1 : 1),
  );
  const [isAmountEdited, setIsAmountEdited] = useState(false);
  const [categoryId, setCategoryId] = useState<CategoryEntity['id'] | null>(
    parsed.category.value,
  );
  const [categorySource, setCategorySource] = useState<CategorySource>(
    parsed.category.value ? 'parsed' : null,
  );
  const [accountId, setAccountId] = useState<AccountEntity['id'] | null>(
    initialAccountId,
  );
  const [isSaving, setIsSaving] = useState(false);

  const existingPayee = findPayee(payees, payeeName);
  const existingPayeeId = existingPayee?.id ?? null;

  // When the text didn't name a category, fall back to the payee's rules,
  // then to the category of the payee's most recent transaction.
  const lookUpFallbackCategory = useEffectEvent(() => {
    if (categorySource === 'parsed' || categorySource === 'user') {
      return;
    }
    if (!existingPayeeId) {
      setCategoryId(null);
      setCategorySource(null);
      return;
    }

    let isCancelled = false;
    async function run(payeeId: PayeeEntity['id']) {
      const withRules = await applyRulesToNewTransaction(
        {
          id: 'temp',
          date,
          account: accountId ?? '',
          payee: payeeId,
          amount,
          cleared: false,
        },
        dispatch,
      );
      if (withRules.category) {
        if (!isCancelled) {
          setCategoryId(withRules.category);
          setCategorySource('rule');
        }
        return;
      }

      const { data } = await aqlQuery(
        q('transactions')
          .filter({ payee: payeeId, category: { $ne: null } })
          .orderBy({ date: 'desc' })
          .select(['category'])
          .limit(1),
      );
      if (!isCancelled) {
        const recentCategory = data[0]?.category ?? null;
        setCategoryId(recentCategory);
        setCategorySource(recentCategory ? 'recent' : null);
      }
    }
    void run(existingPayeeId);

    return () => {
      isCancelled = true;
    };
  });
  // Only look up a fallback when the payee changes
  useEffect(() => lookUpFallbackCategory(), [existingPayeeId]);

  const canAdd = !!accountId && amount !== 0 && !!date && !isSaving;

  async function onSubmit(
    event: FormEvent<HTMLFormElement> | null,
    close: () => void,
  ) {
    event?.preventDefault();
    if (!canAdd || !accountId) {
      return;
    }

    setIsSaving(true);
    try {
      let payeeId = existingPayeeId;
      if (!payeeId && payeeName.trim() !== '') {
        try {
          payeeId = await createPayee.mutateAsync({ name: payeeName });
        } catch {
          // The payee mutation already shows an error notification
          return;
        }
      }

      const transaction: TransactionEntity = {
        id: 'temp',
        date,
        account: accountId,
        payee: payeeId,
        category: categoryId ?? undefined,
        amount,
        cleared: false,
      };
      // Same steps as adding a transaction in the transaction table
      const withRules = await applyRulesToNewTransaction(transaction, dispatch);
      await addNewTransactions([withRules], String(learnCategories) === 'true');

      dispatch(
        addNotification({
          notification: {
            type: 'message',
            message: t('Transaction added.'),
            button: { title: t('Undo'), action: undo },
          },
        }),
      );
      onAdded();
      close();
    } catch (error) {
      console.error('Error adding transaction:', error);
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t(
              'There was an error adding the transaction. Please try again.',
            ),
            pre: error instanceof Error ? error.message : undefined,
          },
        }),
      );
    } finally {
      setIsSaving(false);
    }
  }

  const payeeHint = !payeeName.trim()
    ? t('No payee found. You can add one or leave it empty.')
    : existingPayee
      ? parsed.payee.confidence === 'low' &&
        parsed.payee.value?.id === existingPayee.id &&
        parsed.payee.text &&
        getNormalisedString(parsed.payee.text) !==
          getNormalisedString(existingPayee.name)
        ? t('Closest existing payee to "{{text}}".', {
            text: parsed.payee.text,
          })
        : null
      : t('A new payee will be created.');

  const categoryHint =
    categorySource === 'rule'
      ? t('Category set by a rule for this payee.')
      : categorySource === 'recent'
        ? t('Category from the last transaction with this payee.')
        : !categoryId
          ? parsed.category.text && categorySource !== 'user'
            ? t('No category named "{{text}}". Choose one or leave it empty.', {
                text: parsed.category.text,
              })
            : t('No category found. Choose one or leave it empty.')
          : null;

  return (
    <Modal
      name="quick-add-transaction"
      containerProps={{ style: { width: 420 } }}
    >
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Add transaction')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <Form onSubmit={event => void onSubmit(event, () => state.close())}>
            <View style={{ gap: 12 }}>
              <QuickAddPreviewField
                label={t('Date')}
                htmlFor="quick-add-date"
                confidence={parsed.date.confidence}
                hint={
                  parsed.date.confidence === 'low' && date === parsed.date.value
                    ? t('No date found, so today is used.')
                    : null
                }
              >
                <DateSelect
                  id="quick-add-date"
                  value={date}
                  dateFormat={dateFormat}
                  inputProps={{
                    'aria-describedby': previewHintId('quick-add-date'),
                  }}
                  onSelect={setDate}
                />
              </QuickAddPreviewField>

              <QuickAddPreviewField
                label={t('Payee')}
                htmlFor="quick-add-payee"
                confidence={
                  existingPayee || !payeeName.trim() ? undefined : 'low'
                }
                hint={payeeHint}
                isMissing={!payeeName.trim()}
              >
                <Input
                  id="quick-add-payee"
                  aria-describedby={previewHintId('quick-add-payee')}
                  value={payeeName}
                  onChangeValue={setPayeeName}
                />
              </QuickAddPreviewField>

              <QuickAddPreviewField
                label={
                  amount > 0 ? t('Amount (inflow)') : t('Amount (outflow)')
                }
                htmlFor="quick-add-amount"
                isMissing={amount === 0}
                hint={
                  amount === 0
                    ? t('No amount found.')
                    : parsed.direction.confidence === 'low' && !isAmountEdited
                      ? t(
                          'Assumed to be money spent. Use the +/− button to change it.',
                        )
                      : null
                }
                confidence={
                  parsed.direction.confidence === 'low' && !isAmountEdited
                    ? 'low'
                    : undefined
                }
              >
                <AmountInput
                  id="quick-add-amount"
                  value={amount}
                  zeroSign="-"
                  onUpdate={value => {
                    setAmount(value);
                    setIsAmountEdited(true);
                  }}
                />
              </QuickAddPreviewField>

              <QuickAddPreviewField
                label={t('Category')}
                htmlFor="quick-add-category"
                isMissing={!categoryId}
                confidence={
                  categorySource === 'rule' || categorySource === 'recent'
                    ? 'low'
                    : undefined
                }
                hint={categoryHint}
              >
                <CategoryAutocomplete
                  value={categoryId}
                  // The category can be filled in after opening, from the
                  // payee's rules or last transaction
                  updateOnValueChange
                  showHiddenCategories={false}
                  inputProps={{
                    id: 'quick-add-category',
                    'aria-describedby': previewHintId('quick-add-category'),
                  }}
                  onSelect={id => {
                    setCategoryId(id || null);
                    setCategorySource('user');
                  }}
                />
              </QuickAddPreviewField>

              <QuickAddPreviewField
                label={t('Account')}
                htmlFor="quick-add-account"
                isMissing={!accountId}
                hint={accountId ? null : t('Choose an account.')}
              >
                <AccountAutocomplete
                  value={accountId}
                  updateOnValueChange
                  includeClosedAccounts={false}
                  inputProps={{
                    id: 'quick-add-account',
                    'aria-describedby': previewHintId('quick-add-account'),
                  }}
                  onSelect={id => setAccountId(id || null)}
                />
              </QuickAddPreviewField>
            </View>

            <ModalButtons>
              <Button onPress={() => state.close()}>
                <Trans>Cancel</Trans>
              </Button>
              <Button
                type="submit"
                variant="primary"
                isDisabled={!canAdd}
                style={{ marginLeft: 10 }}
              >
                <Trans>Add</Trans>
              </Button>
            </ModalButtons>
          </Form>
        </>
      )}
    </Modal>
  );
}

function findPayee(
  payees: readonly PayeeEntity[],
  name: string,
): PayeeEntity | null {
  const normalised = getNormalisedString(name.trim());
  if (normalised === '') {
    return null;
  }
  return (
    payees.find(
      payee =>
        !payee.transfer_acct && getNormalisedString(payee.name) === normalised,
    ) ?? null
  );
}
