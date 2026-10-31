import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import type { AccountEntity } from '@actual-app/core/types/models';

import { BudgetNotice } from '#components/transactions/BudgetNotice';
import {
  ExchangePanel,
  fieldGroup,
} from '#components/transactions/ExchangePanel';
import type { ExchangePostResult } from '#components/transactions/ExchangePanel';
import { useAccounts } from '#hooks/useAccounts';
import { useAmountPrecision } from '#hooks/useAmountPrecision';
import { useCategories } from '#hooks/useCategories';
import { useEditEffects } from '#hooks/useEditEffects';
import type { EditEffectsState } from '#hooks/useEditEffects';
import { useFormat } from '#hooks/useFormat';
import { useDispatch } from '#redux';
import { needsPrincipalCategory } from '#util/exchange-entry';
import type { ExchangeRequest } from '#util/exchange-entry';
import {
  confirmReconciledEdit,
  foreignEditErrorMessage,
  staleEditMessage,
} from '#util/foreign-edit';

type Family = Extract<Awaited<ReturnType<typeof getFamily>>, { status: 'ok' }>;

function getFamily(id: string) {
  return send('transactions/get-exchange-family', { id });
}

type ExchangeEditProps = {
  /** Any row of the exchange family. */
  id: string;
  onSaved?: () => void;
  /** Leaves editing, after a save or on Cancel. */
  onDone: () => void;
};

/**
 * Edits a stored exchange transfer as it is stored now: this register's
 * amount, date and notes next to the other account's side, in the same
 * panel that enters a new exchange.
 */
export function ExchangeEdit({ id, onSaved, onDone }: ExchangeEditProps) {
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
      <View style={{ ...fieldGroup, padding: '6px 20px 0' }}>
        <Text>
          <Trans>This transfer can no longer be edited here.</Trans>
        </Text>
        <View style={{ flex: 1 }} />
        <Button onPress={onDone}>
          <Trans>Close</Trans>
        </Button>
      </View>
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
      onDone={onDone}
    />
  );
}

function ExchangeEditForm({
  id,
  family,
  register,
  other,
  onSaved,
  onDone,
}: ExchangeEditProps & {
  family: Family;
  register: AccountEntity;
  other: AccountEntity;
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

  /** The handler request for what the panel shows. */
  const updateFor = (request: ExchangeRequest) => {
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
    return {
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
    };
  };

  // The rows the save would write, previewed by the handler, feed the
  // budget notice; Save waits for the current draft's notice.
  const [request, setRequest] = useState<ExchangeRequest | null>(null);
  const previewKey = request ? JSON.stringify(updateFor(request)) : null;
  // A failed preview cannot describe the save: the notice reports that the
  // check failed; a stale family locks the dialog.
  const [preview, setPreview] = useState<{
    key: string;
    postings: Family['postings'] | null;
    outcome: 'ok' | 'failed' | 'stale';
  } | null>(null);
  useEffect(() => {
    if (previewKey === null) return;
    let cancelled = false;
    void send('transactions/update-exchange-transfer', {
      ...JSON.parse(previewKey),
      preview: true,
    }).then(
      result => {
        if (!cancelled) {
          setPreview({
            key: previewKey,
            postings: result.status === 'preview' ? result.postings : null,
            outcome:
              result.status === 'preview'
                ? 'ok'
                : result.status === 'stale'
                  ? 'stale'
                  : 'failed',
          });
        }
      },
      () => {
        if (!cancelled) {
          setPreview({ key: previewKey, postings: null, outcome: 'failed' });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [previewKey]);
  const previewed = preview?.key === previewKey ? preview.postings : null;
  const ids = previewed
    ? [
        ...new Set([
          ...family.postings.map(row => row.id),
          ...previewed.map(row => row.id),
        ]),
      ]
    : [];
  const effects = useEditEffects(
    previewed
      ? ids.map(rowId => {
          const side = (row: Family['postings'][number] | undefined) => {
            if (!row) return null;
            const { id: _id, ...posting } = row;
            return posting;
          };
          return {
            before: side(family.postings.find(row => row.id === rowId)),
            after: side(previewed.find(row => row.id === rowId)),
          };
        })
      : null,
  );
  const current = preview?.key === previewKey ? preview : null;
  const previewStale = current?.outcome === 'stale';
  const shownEffects: EditEffectsState =
    current?.outcome === 'failed' ? { status: 'error' } : effects;
  const noticeLoading =
    (previewKey !== null && !current) || effects.status === 'loading';

  const onPost = async (
    request: ExchangeRequest,
  ): Promise<ExchangePostResult> => {
    if (!(await confirmReconciledEdit(dispatch, family.reconciled))) {
      return { status: 'cancelled' };
    }
    try {
      const result = await send(
        'transactions/update-exchange-transfer',
        updateFor(request),
      );
      if (result.status === 'stale') {
        return { status: 'stale', message: staleEditMessage(t) };
      }
      if (result.status === 'rate-unavailable') {
        return { status: 'rate-unavailable', currencies: result.currencies };
      }
      if (result.status !== 'ok') {
        return { status: 'message', message: foreignEditErrorMessage(t, '') };
      }
      onSaved?.();
      onDone();
      return { status: 'ok' };
    } catch (error) {
      return { status: 'message', message: foreignEditErrorMessage(t, error) };
    }
  };

  return (
    <View style={{ gap: 6 }}>
      <ExchangePanel
        leading={
          <>
            <View style={fieldGroup}>
              <Text>
                {fromSource ? (
                  <Trans>Sent from {{ account: register.name }}:</Trans>
                ) : (
                  <Trans>Received in {{ account: register.name }}:</Trans>
                )}
              </Text>
              <Input
                autoFocus
                aria-label={t('Amount')}
                inputMode="decimal"
                style={{ width: 110 }}
                value={amountInput}
                onChangeValue={setAmountInput}
              />
            </View>
            <View style={fieldGroup}>
              <Text>
                <Trans>Date:</Trans>
              </Text>
              <Input
                aria-label={t('Date')}
                type="date"
                value={date}
                onChangeValue={setDate}
              />
            </View>
            <View style={fieldGroup}>
              <Text>
                <Trans>Notes:</Trans>
              </Text>
              <Input
                aria-label={t('Notes')}
                style={{ width: 160 }}
                value={notes}
                onChangeValue={setNotes}
              />
            </View>
          </>
        }
        onCancel={onDone}
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
        onRequestChange={setRequest}
        submitDisabled={noticeLoading || previewStale}
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
      <View style={{ gap: 6, padding: '0 20px' }}>
        {categorized && !categoryEditable && (
          <Text style={{ color: theme.pageTextSubdued }}>
            <Trans>
              Category: {{ category: categoryName ?? t('None') }}. Edit it from{' '}
              {{ account: other.name }}.
            </Trans>
          </Text>
        )}
        <BudgetNotice effects={shownEffects} />
        {previewStale && (
          <Text style={{ color: theme.errorText }}>{staleEditMessage(t)}</Text>
        )}
      </View>
    </View>
  );
}
