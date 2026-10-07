import { useEffect, useState } from 'react';
import { Form } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { FormError } from '@actual-app/components/form-error';
import { InlineField } from '@actual-app/components/inline-field';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import {
  baseToNative,
  nativeToBase,
} from '@actual-app/core/shared/exchange-rate';
import { q } from '@actual-app/core/shared/query';
import type {
  AccountEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '#components/common/Modal';
import { BudgetNotice } from '#components/transactions/BudgetNotice';
import {
  RateField,
  rateInDirection,
  storedRate,
} from '#components/transactions/RateField';
import type { RateDirection } from '#components/transactions/RateField';
import { useAccounts } from '#hooks/useAccounts';
import { useAmountPrecision } from '#hooks/useAmountPrecision';
import { useEditEffects } from '#hooks/useEditEffects';
import { useFormat } from '#hooks/useFormat';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { removeModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { aqlQuery } from '#queries/aqlQuery';
import { useDispatch } from '#redux';
import { encodingKey } from '#util/account-encoding';
import {
  confirmReconciledEdit,
  foreignEditErrorMessage,
  snapshotOf,
  staleEditMessage,
} from '#util/foreign-edit';

type ForeignMoveModalProps = Extract<
  ModalType,
  { name: 'foreign-move' }
>['options'];

/** Loads the stored row and its schedule's account for the move. */
export function ForeignMoveModal({
  id,
  account,
  onSaved,
}: ForeignMoveModalProps) {
  const { t } = useTranslation();
  const { data: accounts = [] } = useAccounts();
  const [loaded, setLoaded] = useState<{
    row: TransactionEntity | null;
    scheduleAccount: string | null;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await aqlQuery(
        q('transactions').filter({ id }).select('*').options({ splits: 'all' }),
      );
      const row = (data as TransactionEntity[])[0] ?? null;
      let scheduleAccount: string | null = null;
      if (row?.schedule) {
        const schedules = await aqlQuery(
          q('schedules').filter({ id: row.schedule }).select(['_account']),
        );
        scheduleAccount =
          (schedules.data as Array<{ _account: string | null }>)[0]?._account ??
          null;
      }
      if (!cancelled) setLoaded({ row, scheduleAccount });
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const source = accounts.find(a => a.id === loaded?.row?.account);
  const liveDestination = accounts.find(a => a.id === account);
  // Amounts are typed in the destination's encoding as first shown; a sync
  // that changes it (an empty account can change currency) locks the form.
  const [destination, setDestination] = useState(liveDestination);
  if (!destination && liveDestination) setDestination(liveDestination);
  const destinationChanged =
    !!destination && encodingKey(liveDestination) !== encodingKey(destination);
  return (
    <Modal name="foreign-move" containerProps={{ style: { width: 440 } }}>
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Move to {{account}}', { account: destination?.name })}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          {destinationChanged ? (
            <Text style={{ paddingBottom: 10 }}>{staleEditMessage(t)}</Text>
          ) : (
            loaded &&
            (loaded.row && source && destination ? (
              <MoveForm
                row={loaded.row}
                source={source}
                destination={destination}
                scheduleUnlinked={
                  !!loaded.row.schedule &&
                  (loaded.scheduleAccount === null ||
                    encodingKey(
                      accounts.find(a => a.id === loaded.scheduleAccount),
                    ) !== encodingKey(destination))
                }
                onClose={() => state.close()}
                onSaved={onSaved}
              />
            ) : (
              <Text style={{ paddingBottom: 10 }}>
                <Trans>This transaction can no longer be moved here.</Trans>
              </Text>
            ))
          )}
        </>
      )}
    </Modal>
  );
}

function MoveForm({
  row,
  source,
  destination,
  scheduleUnlinked,
  onClose,
  onSaved,
}: {
  row: TransactionEntity;
  source: AccountEntity;
  destination: AccountEntity;
  scheduleUnlinked: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const basePrecision = useAmountPrecision();
  const baseFormat = useFormat(basePrecision);
  const [defaultCurrency] = useSyncedPref('defaultCurrencyCode');
  const foreignDestination = !!destination.currency;
  const destinationPrecision = destination.currency_precision ?? basePrecision;
  const destinationFormat = useFormat(destinationPrecision);
  const sourceFormat = useFormat(source.currency_precision ?? basePrecision);
  const [savedRate, setSavedRate] = useState<string | null | undefined>(
    foreignDestination ? undefined : null,
  );
  useEffect(() => {
    if (!destination.currency) return;
    let cancelled = false;
    void send('exchange-rates/resolve', {
      quoteCurrency: destination.currency,
      date: row.date,
    }).then(result => {
      if (!cancelled) {
        setSavedRate(result.status === 'resolved' ? result.rate : null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [destination.currency, row.date]);

  const [amountInput, setAmountInput] = useState('');
  const [baseInput, setBaseInput] = useState('');
  const [rateInput, setRateInput] = useState('');
  const [rateDirection, setRateDirection] =
    useState<RateDirection>('foreign-per-base');
  const [replaceRate, setReplaceRate] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reviewedBase, setReviewedBase] = useState<{
    rate: string;
    baseAmount: number;
  } | null>(null);

  // The destination amount suggested from the row's base: the base itself
  // for a budget-currency account, else the base at the saved rate.
  let estimate: number | null = null;
  try {
    estimate = !foreignDestination
      ? row.amount
      : savedRate
        ? baseToNative(
            row.amount,
            basePrecision,
            destinationPrecision,
            savedRate,
          )
        : null;
  } catch {
    estimate = null;
  }
  const typedAmount =
    amountInput.trim() === '' ? null : destinationFormat.fromEdit(amountInput);
  const amountInvalid = amountInput.trim() !== '' && typedAmount == null;
  // Typed as magnitudes, keeping the row's direction: its native amount's
  // when it has one (a small native amount's base can round to zero).
  const outflow = (row.transaction_amount || row.amount) < 0;
  const signed = (value: number) =>
    outflow ? -Math.abs(value) : Math.abs(value);
  const amount = typedAmount != null ? signed(typedAmount) : estimate;

  let typedRate: string | null = null;
  try {
    typedRate =
      rateInput.trim() === '' ? null : storedRate(rateInput, rateDirection);
  } catch {
    typedRate = null;
  }
  const typedBase = baseFormat.fromEdit(baseInput);
  const conversionInvalid =
    foreignDestination &&
    ((rateInput.trim() !== '' && typedRate == null) ||
      (baseInput.trim() !== '' && typedBase == null));

  // The base after the move, as shown; Save sends exactly this.
  let baseAfter: number | null = null;
  if (amount != null) {
    if (!foreignDestination) {
      baseAfter = amount;
    } else if (baseInput.trim() !== '' && typedBase != null) {
      baseAfter = signed(typedBase);
    } else {
      try {
        const rate = typedRate ?? savedRate;
        baseAfter =
          typedRate && reviewedBase?.rate === typedRate
            ? reviewedBase.baseAmount
            : rate
              ? nativeToBase(amount, destinationPrecision, basePrecision, rate)
              : null;
      } catch {
        baseAfter = null;
      }
    }
  }

  const ready =
    amount != null && baseAfter != null && !amountInvalid && !conversionInvalid;
  const category = destination.offbudget ? null : (row.category ?? null);
  const effects = useEditEffects(
    ready
      ? [
          {
            before: {
              account: row.account,
              category: row.category ?? null,
              date: row.date,
              amount: row.amount,
            },
            after: {
              account: destination.id,
              category,
              date: row.date,
              amount: baseAfter!,
            },
          },
        ]
      : null,
  );

  async function save() {
    if (!ready) {
      setMessage(t('Rate unavailable. Enter a base amount or rate.'));
      return;
    }
    if (!(await confirmReconciledEdit(dispatch, !!row.reconciled))) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await send('transactions/move-foreign-entry', {
        id: row.id,
        account: destination.id,
        expected: snapshotOf(row),
        transaction_amount: amount!,
        destinationEncoding: foreignDestination
          ? {
              currency: destination.currency!,
              precision: destination.currency_precision ?? null,
            }
          : { currency: null, precision: null },
        ...(!foreignDestination
          ? {}
          : typedRate && baseInput.trim() === ''
            ? { rate: typedRate, replaceRate, expectedBaseAmount: baseAfter! }
            : { baseAmount: baseAfter! }),
      });
      switch (result.status) {
        case 'ok':
          dispatch(removeModal({ name: 'foreign-move' }));
          onSaved?.();
          return;
        case 'stale':
          setStale(true);
          setMessage(staleEditMessage(t));
          return;
        case 'rate-confirmation-required':
          setReplaceRate(true);
          setMessage(
            t(
              'A rate of 1 {{base}} = {{existing}} {{currency}} is already saved for this day. Confirm again to replace it with 1 {{base}} = {{rate}} {{currency}}.',
              {
                base: defaultCurrency,
                currency: destination.currency,
                existing: result.existing.rate,
                rate: typedRate,
              },
            ),
          );
          return;
        case 'base-changed':
          if (typedRate) {
            setReviewedBase({ rate: typedRate, baseAmount: result.baseAmount });
          }
          setMessage(
            t(
              'The converted amount changed to {{amount}}. Review it and confirm again.',
              { amount: baseFormat(result.baseAmount, 'financial') },
            ),
          );
          return;
        default:
          setMessage(t('Rate unavailable. Enter a base amount or rate.'));
      }
    } catch (error) {
      setMessage(foreignEditErrorMessage(t, error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Form
      onSubmit={event => {
        event.preventDefault();
        void save();
      }}
    >
      <View style={{ gap: 10 }}>
        <Text>
          <Trans>
            Now{' '}
            {{
              amount: sourceFormat.forEdit(
                row.transaction_amount ?? row.amount,
              ),
            }}{' '}
            {{ currency: source.currency ?? defaultCurrency ?? '' }} in{' '}
            {{ account: source.name }} (
            {{ base: baseFormat(row.amount, 'financial') }}).
          </Trans>
        </Text>
        <InlineField
          label={t('Amount ({{currency}})', {
            currency: destination.currency ?? defaultCurrency ?? '',
          })}
          width="100%"
        >
          <Input
            aria-label={t('Amount in {{account}}', {
              account: destination.name,
            })}
            inputMode="decimal"
            value={amountInput}
            placeholder={
              estimate != null
                ? destinationFormat.forEdit(Math.abs(estimate))
                : undefined
            }
            onChangeValue={setAmountInput}
            style={{ flex: 1 }}
          />
        </InlineField>
        {typedAmount == null && estimate != null && foreignDestination && (
          <Text style={{ color: theme.pageTextSubdued }}>
            <Trans>
              Estimated from the saved rate 1 {{ base: defaultCurrency }} ={' '}
              {{ rate: savedRate }} {{ currency: destination.currency }}. Enter
              the amount the account shows.
            </Trans>
          </Text>
        )}
        {foreignDestination && (
          <>
            <InlineField label={t('Base amount')} width="100%">
              <Input
                aria-label={t('Base amount')}
                inputMode="decimal"
                value={baseInput}
                onChangeValue={value => {
                  setBaseInput(value);
                  setReplaceRate(false);
                }}
                style={{ flex: 1 }}
              />
            </InlineField>
            <RateField
              name="rate"
              currencyCode={destination.currency ?? ''}
              value={rateInput}
              placeholder={
                savedRate
                  ? rateInDirection(savedRate, rateDirection)
                  : undefined
              }
              direction={rateDirection}
              onChange={(value, direction) => {
                setRateInput(value);
                setRateDirection(direction);
                setReplaceRate(false);
              }}
            />
          </>
        )}
        {baseAfter != null && (
          <Text style={{ color: theme.pageTextSubdued }}>
            <Trans>
              Base amount after the move:{' '}
              {{ amount: baseFormat(baseAfter, 'financial') }}
            </Trans>
          </Text>
        )}
        {scheduleUnlinked && (
          <Text style={{ color: theme.warningText }}>
            <Trans>
              This transaction will no longer be linked to its schedule.
            </Trans>
          </Text>
        )}
        <BudgetNotice effects={effects} />
        {message && <FormError>{message}</FormError>}
      </View>
      <ModalButtons>
        <Button isDisabled={busy} onPress={onClose}>
          <Trans>Cancel</Trans>
        </Button>
        <Button
          type="submit"
          variant="primary"
          isDisabled={
            busy ||
            stale ||
            amountInvalid ||
            conversionInvalid ||
            effects.status === 'loading'
          }
          style={{ marginLeft: 10 }}
        >
          <Trans>Move</Trans>
        </Button>
      </ModalButtons>
    </Form>
  );
}
