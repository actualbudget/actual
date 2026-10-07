import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { InlineField } from '@actual-app/components/inline-field';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { format as monthUtilFormat } from '@actual-app/core/shared/months';
import type { AccountEntity } from '@actual-app/core/types/models';

import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { ExchangePanel } from '#components/transactions/ExchangePanel';
import type { ExchangePostResult } from '#components/transactions/ExchangePanel';
import { CurrencyFormatProvider } from '#hooks/currencyFormatContext';
import { useAccounts } from '#hooks/useAccounts';
import { useAmountPrecision } from '#hooks/useAmountPrecision';
import { useCategories } from '#hooks/useCategories';
import { useDateFormat } from '#hooks/useDateFormat';
import { useFormat } from '#hooks/useFormat';
import { removeModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { useDispatch } from '#redux';
import { needsPrincipalCategory } from '#util/exchange-entry';
import type { ExchangeRequest } from '#util/exchange-entry';
import {
  confirmReconciledEdit,
  foreignEditErrorMessage,
  staleEditMessage,
} from '#util/foreign-edit';

type ExchangeTransferModalProps = Extract<
  ModalType,
  { name: 'exchange-transfer' }
>['options'];

type Occurrence = NonNullable<ExchangeTransferModalProps['occurrence']>;

type Family = Extract<Awaited<ReturnType<typeof getFamily>>, { status: 'ok' }>;

function getFamily(id: string) {
  return send('transactions/get-exchange-family', { id });
}

function ScheduleAmount({ amount }: { amount: number }) {
  const format = useFormat();
  return <Text>{format(amount, 'financial')}</Text>;
}

/**
 * Completes a scheduled exchange occurrence that has no estimate, or edits
 * an existing exchange transfer.
 */
export function ExchangeTransferModal(props: ExchangeTransferModalProps) {
  const { t } = useTranslation();
  return (
    <Modal name="exchange-transfer" containerProps={{ style: { width: 640 } }}>
      {({ state }) => (
        <>
          <ModalHeader
            title={
              props.edit ? t('Edit transfer') : t('Post scheduled transfer')
            }
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          {props.edit ? (
            <ExchangeEdit id={props.edit.id} onSaved={props.edit.onSaved} />
          ) : (
            <ScheduledExchange occurrence={props.occurrence} />
          )}
        </>
      )}
    </Modal>
  );
}

/**
 * The schedule's own amount is fixed, and the other account's side is
 * entered as in the register.
 */
function ScheduledExchange({ occurrence }: { occurrence: Occurrence }) {
  const dispatch = useDispatch();
  const { data: accounts = [] } = useAccounts();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const date = monthUtilFormat(occurrence.date, dateFormat);
  const register = accounts.find(a => a.id === occurrence.account);
  const other = accounts.find(a => a.id === occurrence.other);

  const transaction = {
    date: occurrence.date,
    amount: occurrence.amount,
    notes: occurrence.notes ?? undefined,
    cleared: occurrence.cleared,
    category: occurrence.category ?? undefined,
  };

  const onPost = async (
    request: ExchangeRequest,
  ): Promise<ExchangePostResult> => {
    try {
      const result = await send('transactions/post-exchange-transfer', {
        ...request,
        schedule: occurrence.schedule,
      });
      if (result.status !== 'ok') {
        return { status: 'rate-unavailable', currencies: result.currencies };
      }
      dispatch(removeModal({ name: 'exchange-transfer' }));
      return { status: 'ok' };
    } catch (err) {
      return {
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  };

  return register && other ? (
    <View style={{ gap: 10, paddingBottom: 10 }}>
      <Text>
        <Trans>
          {{ account: register.name }} on {{ date }}:
        </Trans>{' '}
        {register.currency ? (
          <CurrencyFormatProvider
            currencyCode={register.currency}
            precision={register.currency_precision ?? 0}
          >
            <ScheduleAmount amount={occurrence.amount} />
          </CurrencyFormatProvider>
        ) : (
          <ScheduleAmount amount={occurrence.amount} />
        )}
      </Text>
      <ExchangePanel
        transaction={transaction}
        register={register}
        other={other}
        onPost={onPost}
        feeNeedsOtherAmount
      />
    </View>
  ) : (
    <Text>
      <Trans>The accounts of this schedule were not found.</Trans>
    </Text>
  );
}

/** Loads the exchange family the dialog edits, as stored now. */
function ExchangeEdit({ id, onSaved }: { id: string; onSaved?: () => void }) {
  const { data: accounts = [] } = useAccounts();
  const [family, setFamily] = useState<Family | 'loading' | 'unavailable'>(
    'loading',
  );
  useEffect(() => {
    let cancelled = false;
    void getFamily(id).then(result => {
      if (!cancelled) {
        setFamily(result.status === 'ok' ? result : 'unavailable');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (family === 'loading') return null;
  const byId = (accountId: string) => accounts.find(a => a.id === accountId);
  const source = family === 'unavailable' ? null : byId(family.sourceAccount);
  const destination =
    family === 'unavailable' ? null : byId(family.destinationAccount);
  if (family === 'unavailable' || !source || !destination) {
    return (
      <Text style={{ paddingBottom: 10 }}>
        <Trans>This transfer can no longer be edited here.</Trans>
      </Text>
    );
  }
  const [register, other] =
    family.selectedSide === 'source'
      ? [source, destination]
      : [destination, source];
  return (
    <ExchangeEditForm
      id={id}
      family={family}
      register={register}
      other={other}
      onSaved={onSaved}
    />
  );
}

function ExchangeEditForm({
  id,
  family,
  register,
  other,
  onSaved,
}: {
  id: string;
  family: Family;
  register: AccountEntity;
  other: AccountEntity;
  onSaved?: () => void;
}) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const budgetPrecision = useAmountPrecision();
  const registerFormat = useFormat(
    register.currency_precision ?? budgetPrecision,
  );
  const otherFormat = useFormat(other.currency_precision ?? budgetPrecision);
  const baseFormat = useFormat(budgetPrecision);
  const { data: categories } = useCategories();
  const fromSource = family.selectedSide === 'source';
  const registerTotal = fromSource
    ? family.sourceAmount
    : family.destinationAmount;
  const otherTotal = fromSource
    ? family.destinationAmount
    : family.sourceAmount;
  const [amountInput, setAmountInput] = useState(
    registerFormat.forEdit(registerTotal),
  );
  const [date, setDate] = useState(family.date);
  const [notes, setNotes] = useState(family.notes ?? '');
  const typedAmount = registerFormat.fromEdit(amountInput);
  // The register side keeps its direction: a payment stays a payment.
  const registerAmount =
    typedAmount == null
      ? 0
      : fromSource
        ? -Math.abs(typedAmount)
        : Math.abs(typedAmount);

  const registerFee = fromSource ? family.sourceFee : family.destinationFee;
  const otherFee = fromSource ? family.destinationFee : family.sourceFee;
  const categorized = needsPrincipalCategory({ register, other });
  // The principal category belongs to the on-budget leg; it is edited from
  // that side only.
  const categoryEditable = categorized && !register.offbudget;
  const categoryName = family.category
    ? categories?.list.find(category => category.id === family.category)?.name
    : null;
  const feeSideBefore =
    family.sourceFee > 0
      ? 'source'
      : family.destinationFee > 0
        ? 'destination'
        : null;

  const onPost = async (
    request: ExchangeRequest,
  ): Promise<ExchangePostResult> => {
    if (!(await confirmReconciledEdit(dispatch, family.reconciled))) {
      return { status: 'cancelled' };
    }
    const feeSideNow = request.sourceFee
      ? 'source'
      : request.destinationFee
        ? 'destination'
        : null;
    // A fee child the save creates takes the displayed category; a kept one
    // changes only when the user changed it.
    const createsFeeChild = feeSideNow !== null && feeSideNow !== feeSideBefore;
    const feeCategory = request.feeCategory ?? null;
    const category = request.category ?? null;
    try {
      const result = await send('transactions/update-exchange-transfer', {
        id,
        expected: family.expected,
        sourceAmount: request.sourceAmount,
        destinationAmount: request.destinationAmount,
        sourceFee: request.sourceFee ?? 0,
        destinationFee: request.destinationFee ?? 0,
        ...(request.baseAmount !== undefined && {
          baseAmount: request.baseAmount,
        }),
        ...(categoryEditable && category !== family.category && { category }),
        ...(feeSideNow !== null &&
          (createsFeeChild || feeCategory !== family.feeCategory) && {
            feeCategory,
          }),
        ...(notes !== (family.notes ?? '') && { notes: notes || null }),
        ...(date !== family.date && { date }),
      });
      if (result.status === 'stale') {
        return { status: 'stale', message: staleEditMessage(t) };
      }
      if (result.status === 'rate-unavailable') {
        return { status: 'rate-unavailable', currencies: result.currencies };
      }
      dispatch(removeModal({ name: 'exchange-transfer' }));
      onSaved?.();
      return { status: 'ok' };
    } catch (error) {
      return { status: 'message', message: foreignEditErrorMessage(t, error) };
    }
  };

  return (
    <View style={{ gap: 10, paddingBottom: 10 }}>
      <InlineField
        label={
          fromSource
            ? t('Sent from {{account}}', { account: register.name })
            : t('Received in {{account}}', { account: register.name })
        }
        width="100%"
      >
        <Input
          aria-label={t('Amount')}
          inputMode="decimal"
          value={amountInput}
          onChangeValue={setAmountInput}
          style={{ flex: 1 }}
        />
      </InlineField>
      <InlineField label={t('Date')} width="100%">
        <Input
          aria-label={t('Date')}
          type="date"
          value={date}
          onChangeValue={setDate}
          style={{ flex: 1 }}
        />
      </InlineField>
      <InlineField label={t('Notes')} width="100%">
        <Input
          aria-label={t('Notes')}
          value={notes}
          onChangeValue={setNotes}
          style={{ flex: 1 }}
        />
      </InlineField>
      {categorized && !categoryEditable && (
        <Text style={{ color: theme.pageTextSubdued }}>
          <Trans>
            Category: {{ category: categoryName ?? t('None') }}. Edit it from{' '}
            {{ account: other.name }}.
          </Trans>
        </Text>
      )}
      <ExchangePanel
        transaction={{
          date,
          amount: registerAmount,
          notes,
          cleared: false,
          category: family.category ?? undefined,
        }}
        register={register}
        other={other}
        onPost={onPost}
        submitLabel={t('Save')}
        initial={{
          otherInput: otherFormat.forEdit(otherTotal),
          feeInput:
            registerFee > 0
              ? registerFormat.forEdit(registerFee)
              : otherFee > 0
                ? otherFormat.forEdit(otherFee)
                : '',
          feeSide: otherFee > 0 ? 'other' : 'register',
          baseInput:
            register.currency && other.currency
              ? baseFormat.forEdit(family.baseAmount)
              : '',
          category: family.category ?? '',
          feeCategory: family.feeCategory ?? '',
          categoryEditable,
        }}
      />
    </View>
  );
}
