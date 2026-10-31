import { useEffect, useState } from 'react';
import { Form } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { FormError } from '@actual-app/components/form-error';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { InlineField } from '@actual-app/components/inline-field';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { nativeToBase } from '@actual-app/core/shared/exchange-rate';
import { q } from '@actual-app/core/shared/query';

import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '#components/common/Modal';
import { Checkbox } from '#components/forms';
import { BudgetNotice } from '#components/transactions/BudgetNotice';
import { RateField, storedRate } from '#components/transactions/RateField';
import type { RateDirection } from '#components/transactions/RateField';
import { CurrencyFormatProvider } from '#hooks/currencyFormatContext';
import { useAmountPrecision } from '#hooks/useAmountPrecision';
import { useEditEffects } from '#hooks/useEditEffects';
import { useFormat } from '#hooks/useFormat';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { removeModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { aqlQuery } from '#queries/aqlQuery';
import { useDispatch } from '#redux';
import {
  confirmReconciledEdit,
  foreignEditErrorMessage,
  staleEditMessage,
} from '#util/foreign-edit';
import type { RowSnapshot } from '#util/foreign-edit';

type ForeignAmountModalProps = Extract<
  ModalType,
  { name: 'foreign-amount' }
>['options'];

type Resolution =
  | {
      status: 'resolved';
      rate: string;
      kind: string;
      source: string;
      timestamp: string | null;
      fallback: boolean;
    }
  | { status: 'unavailable' }
  | { status: 'error' };

function NativeAmount({
  amount,
  currencyCode,
  precision,
}: {
  amount: number;
  currencyCode: string;
  precision: number;
}) {
  return (
    <CurrencyFormatProvider currencyCode={currencyCode} precision={precision}>
      <NativeAmountText amount={amount} />
    </CurrencyFormatProvider>
  );
}

function NativeAmountText({ amount }: { amount: number }) {
  const format = useFormat();
  return <Text>{format(amount, 'financial')}</Text>;
}

function payeeName(
  transaction: ForeignAmountModalProps['transaction'],
): string | undefined {
  if (!('payee_name' in transaction)) return undefined;
  const name = transaction.payee_name;
  return typeof name === 'string' ? name.trim() : undefined;
}

/**
 * Previews a foreign transaction's conversion and saves it atomically: a new
 * entry, or an edit of an existing row (and its transfer counterpart). The
 * preview only reads; confirming sends exactly what was shown.
 */
export function ForeignAmountModal({
  transaction,
  currencyCode,
  nativePrecision,
  rulesApplied,
  edit,
  onPosted,
}: ForeignAmountModalProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const basePrecision = useAmountPrecision();
  const baseFormat = useFormat(basePrecision);
  const nativeFormat = useFormat(nativePrecision);
  const [draft, setDraft] = useState(transaction);
  // An edit may change the native amount in the dialog (the mobile form has
  // no amount cell of its own).
  const [nativeInput, setNativeInput] = useState(() =>
    nativeFormat.forEdit(transaction.transaction_amount),
  );
  // Keyed by date so a stale lookup never serves a newer draft date.
  const [resolved, setResolved] = useState<{
    date: string;
    result: Resolution;
  } | null>(null);
  // A base the server computed for a rate override, reviewed by the user.
  const [serverBase, setServerBase] = useState<{
    date: string;
    rate: string;
    baseAmount: number;
  } | null>(null);
  const [baseInput, setBaseInput] = useState(() =>
    edit?.baseAmount != null
      ? baseFormat.forEdit(Math.abs(edit.baseAmount))
      : '',
  );
  // A stale edit cannot be saved; the dialog must be reopened.
  const [stale, setStale] = useState(false);
  const [rateInput, setRateInput] = useState('');
  const [rateEdited, setRateEdited] = useState(false);
  const [rateDirection, setRateDirection] =
    useState<RateDirection>('foreign-per-base');
  const [budgetCurrency] = useSyncedPref('defaultCurrencyCode');
  const [message, setMessage] = useState<string | null>(null);
  const [replaceRate, setReplaceRate] = useState(false);
  const [saveStanding, setSaveStanding] = useState(
    payeeName(transaction) === 'Starting Balance',
  );
  const [standingTouched, setStandingTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void send('exchange-rates/resolve', {
      quoteCurrency: currencyCode,
      date: draft.date,
    }).then(
      result => {
        if (!cancelled) setResolved({ date: draft.date, result });
      },
      () => {
        // The explicit base amount and rate inputs still work.
        if (!cancelled) {
          setResolved({ date: draft.date, result: { status: 'error' } });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [currencyCode, draft.date]);

  // A typed rate belongs to the date it was typed for.
  useEffect(() => {
    setRateEdited(false);
  }, [draft.date]);

  useEffect(() => {
    if (standingTouched || !transaction.payee) return;
    let cancelled = false;
    void aqlQuery(
      q('payees').filter({ id: transaction.payee }).select(['name']),
    ).then(({ data }: { data: Array<{ name: string }> }) => {
      if (!cancelled && data[0]?.name === 'Starting Balance') {
        setSaveStanding(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [standingTouched, transaction.payee]);

  const typedNative = edit ? nativeFormat.fromEdit(nativeInput) : null;
  const native = edit ? (typedNative ?? 0) : draft.transaction_amount;
  const resolution = resolved?.date === draft.date ? resolved.result : null;
  // Until the user types a rate, the field shows the draft date's one-day
  // rate. It is derived from that date's lookup, so it is empty while a new
  // date resolves. Left alone, it is that date's resolved default, not a
  // typed rate: the dialog posts its reviewed base and sends no rate.
  const typedRate = rateEdited ? rateInput : '';
  const rateText = rateEdited
    ? rateInput
    : resolution?.status === 'resolved' && resolution.kind === 'dated'
      ? resolution.rate
      : '';
  const direction: RateDirection = rateEdited
    ? rateDirection
    : 'foreign-per-base';

  type Preview =
    | { kind: 'base'; baseAmount: number; rate?: string }
    | { kind: 'rate'; rate: string; baseAmount: number }
    | { kind: 'default'; baseAmount: number }
    | { kind: 'kept'; baseAmount: number }
    | { kind: 'invalid' }
    | { kind: 'loading' }
    | { kind: 'unavailable' };

  /** The conversion shown to the user, which is exactly what Save posts. */
  function preview(): Preview {
    if (edit && typedNative == null) return { kind: 'invalid' };
    // An edit that changes nothing keeps the stored pair; a prefilled rate
    // the user left alone is not a change.
    const stored =
      edit?.kind === 'transfer' ? edit.expected.leg : edit?.expected;
    if (
      stored &&
      native === stored.transaction_amount &&
      baseInput.trim() === '' &&
      typedRate.trim() === ''
    ) {
      return { kind: 'kept', baseAmount: stored.amount };
    }
    if (baseInput.trim() !== '') {
      const parsed = baseFormat.fromEdit(baseInput);
      if (parsed == null) return { kind: 'invalid' };
      // The base amount is entered as a magnitude and follows the native
      // amount's direction (outflow or inflow). A rate beside it is still
      // saved, so it must be valid too.
      let rate: string | undefined;
      if (typedRate.trim() !== '') {
        try {
          rate = storedRate(typedRate, direction);
        } catch {
          return { kind: 'invalid' };
        }
      }
      return {
        kind: 'base',
        baseAmount: native < 0 ? -Math.abs(parsed) : Math.abs(parsed),
        rate,
      };
    }
    if (typedRate.trim() !== '') {
      // A malformed rate, or one whose conversion is out of range, is
      // reported as invalid input rather than breaking the dialog.
      try {
        const rate = storedRate(typedRate, direction);
        const reviewed =
          serverBase?.date === draft.date && serverBase.rate === rate
            ? serverBase.baseAmount
            : null;
        return {
          kind: 'rate',
          rate,
          baseAmount:
            reviewed ??
            nativeToBase(native, nativePrecision, basePrecision, rate),
        };
      } catch {
        return { kind: 'invalid' };
      }
    }
    if (resolution == null) return { kind: 'loading' };
    if (resolution.status !== 'resolved') return { kind: 'unavailable' };
    try {
      return {
        kind: 'default',
        baseAmount: nativeToBase(
          native,
          nativePrecision,
          basePrecision,
          resolution.rate,
        ),
      };
    } catch {
      // A saved rate that converts out of range needs an explicit input.
      return { kind: 'unavailable' };
    }
  }

  const shown = preview();

  // The rate "Use this rate from this date" saves: a typed rate, else the
  // resolved rate shown in the conversion or the rate field. Without one
  // there is nothing to save.
  const standingRate =
    shown.kind === 'rate' || shown.kind === 'base'
      ? (shown.rate ??
        (shown.kind === 'base' &&
        resolution?.status === 'resolved' &&
        rateText !== ''
          ? resolution.rate
          : undefined))
      : shown.kind === 'default' && resolution?.status === 'resolved'
        ? resolution.rate
        : undefined;
  const persistStanding = saveStanding && standingRate !== undefined;

  // The budget notice for an edit, from the amounts shown.
  const shownBase =
    shown.kind === 'base' || shown.kind === 'rate' || shown.kind === 'default'
      ? shown.baseAmount
      : null;
  const posting = (
    row: RowSnapshot,
    amount: number,
    transferAccount: string | null,
  ) => ({
    account: row.account,
    category: row.category,
    date: row.date,
    amount,
    transferAccount,
  });
  const effects = useEditEffects(
    !edit || shownBase == null
      ? null
      : edit.kind === 'entry'
        ? [
            {
              before: posting(edit.expected, edit.expected.amount, null),
              after: posting(edit.expected, shownBase, null),
            },
          ]
        : [
            {
              before: posting(
                edit.expected.leg,
                edit.expected.leg.amount,
                edit.expected.counterpart.account,
              ),
              after: posting(
                edit.expected.leg,
                shownBase,
                edit.expected.counterpart.account,
              ),
            },
            {
              before: posting(
                edit.expected.counterpart,
                edit.expected.counterpart.amount,
                edit.expected.leg.account,
              ),
              after: posting(
                edit.expected.counterpart,
                -shownBase,
                edit.expected.leg.account,
              ),
            },
          ],
  );

  async function confirm() {
    if (shown.kind === 'kept') {
      dispatch(removeModal({ name: 'foreign-amount' }));
      return;
    }
    // A base or default posts its reviewed base. A rate goes with it only
    // when typed or when it is to be saved as standing.
    const baseRate =
      shown.kind === 'base' && shown.rate !== undefined
        ? shown.rate
        : persistStanding
          ? standingRate
          : undefined;
    const payload =
      shown.kind === 'base' || shown.kind === 'default'
        ? baseRate !== undefined
          ? {
              baseAmount: shown.baseAmount,
              rate: baseRate,
              expectedBaseAmount: shown.baseAmount,
            }
          : { baseAmount: shown.baseAmount }
        : shown.kind === 'rate'
          ? { rate: shown.rate, expectedBaseAmount: shown.baseAmount }
          : null;
    if (shown.kind === 'loading') return;
    if (payload == null) {
      setMessage(
        baseInput.trim() !== '' || typedRate.trim() !== ''
          ? t('Enter a valid base amount or rate.')
          : t('Rate unavailable. Enter a base amount or rate.'),
      );
      return;
    }
    if (
      edit &&
      !(await confirmReconciledEdit(
        dispatch,
        edit.reconciled,
        // Only the other account's leg reconciled: the linked-transfer text.
        edit.kind === 'transfer' && !edit.expected.leg.reconciled
          ? 'batchEditWithReconciledTransfer'
          : 'editReconciled',
      ))
    ) {
      return;
    }
    setBusy(true);
    try {
      const result = !edit
        ? await send('transactions/post-foreign-entry', {
            transaction: draft,
            ...payload,
            replaceRate,
            saveStanding: persistStanding,
            rulesApplied,
          })
        : edit.kind === 'entry'
          ? await send('transactions/update-foreign-entry', {
              id: edit.id,
              expected: edit.expected,
              transaction_amount: native,
              ...payload,
              replaceRate,
              saveStanding: persistStanding,
            })
          : await send('transactions/update-foreign-transfer', {
              id: edit.id,
              expected: edit.expected,
              transaction_amount: native,
              ...payload,
              replaceRate,
              saveStanding: persistStanding,
            });
      switch (result.status) {
        case 'stale':
          setStale(true);
          setMessage(staleEditMessage(t));
          return;
        case 'ok':
          // Close only this dialog: another modal may have opened above it.
          dispatch(removeModal({ name: 'foreign-amount' }));
          onPosted();
          return;
        case 'rate-confirmation-required':
          setReplaceRate(true);
          setMessage(
            t(
              'A standing rate of 1 {{base}} = {{existing}} {{currency}} is already saved from this date. Confirm again to replace it with 1 {{base}} = {{rate}} {{currency}}.',
              {
                base: budgetCurrency,
                currency: currencyCode,
                existing: result.existing.rate,
                rate: standingRate ?? '',
              },
            ),
          );
          return;
        case 'base-changed':
          if (shown.kind === 'rate') {
            setServerBase({
              date: draft.date,
              rate: shown.rate,
              baseAmount: result.baseAmount,
            });
          }
          setMessage(
            t(
              'The converted amount changed to {{amount}}. Review it and confirm again.',
              { amount: baseFormat(result.baseAmount, 'financial') },
            ),
          );
          return;
        case 'rule-account-incompatible':
          setMessage(
            t(
              'A rule would move this transaction to an account in another currency, so it was not saved.',
            ),
          );
          return;
        case 'rule-date-changed':
          // The previous date's conversion and confirmations no longer apply.
          setReplaceRate(false);
          setDraft({ ...draft, date: result.date });
          setMessage(
            t(
              'A rule changed the date to {{date}}. Review the conversion and confirm again.',
              { date: result.date },
            ),
          );
          return;
        default:
          setMessage(t('Rate unavailable. Enter a base amount or rate.'));
      }
    } catch (error) {
      // The server refused the entry; nothing was written and the draft
      // stays open for correction.
      setMessage(foreignEditErrorMessage(t, error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      name="foreign-amount"
      containerProps={{ style: { width: 420 } }}
      // A posting in flight cannot be cancelled or dismissed.
      isDismissable={!busy}
      isKeyboardDismissDisabled={busy}
    >
      {({ state }) => (
        <>
          <ModalHeader
            title={
              edit ? t('Edit foreign amount') : t('Convert to budget currency')
            }
            rightContent={
              busy ? null : <ModalCloseButton onPress={() => state.close()} />
            }
          />
          <Form
            onSubmit={event => {
              event.preventDefault();
              void confirm();
            }}
          >
            <View style={{ gap: 10 }}>
              {edit?.kind === 'transfer' && (
                <Text style={{ color: theme.pageTextSubdued }}>
                  <Trans>
                    The other account of this transfer changes to match.
                  </Trans>
                </Text>
              )}
              <InlineField label={t('Amount')} width="100%">
                {edit ? (
                  <Input
                    name="nativeAmount"
                    aria-label={t('Amount in {{currency}}', {
                      currency: currencyCode,
                    })}
                    inputMode="decimal"
                    value={nativeInput}
                    onChangeValue={value => {
                      setNativeInput(value);
                      setServerBase(null);
                    }}
                    style={{ flex: 1 }}
                  />
                ) : (
                  <NativeAmount
                    amount={native}
                    currencyCode={currencyCode}
                    precision={nativePrecision}
                  />
                )}
              </InlineField>
              {shown.kind === 'base' ? (
                <Text style={{ color: theme.pageTextSubdued }}>
                  <Trans>
                    {{ amount: baseFormat(shown.baseAmount, 'financial') }}{' '}
                    entered
                  </Trans>
                </Text>
              ) : shown.kind === 'rate' ? (
                <Text style={{ color: theme.pageTextSubdued }}>
                  <Trans>
                    {{ amount: baseFormat(shown.baseAmount, 'financial') }} at
                    the entered rate
                  </Trans>
                </Text>
              ) : shown.kind === 'default' &&
                resolution?.status === 'resolved' ? (
                <Text style={{ color: theme.pageTextSubdued }}>
                  <Trans>
                    {{ amount: baseFormat(shown.baseAmount, 'financial') }} at 1{' '}
                    {{ base: budgetCurrency }} = {{ rate: resolution.rate }}{' '}
                    {{ currency: currencyCode }} ({{ kind: resolution.kind }},{' '}
                    {{ source: resolution.source }},{' '}
                    {{ date: resolution.timestamp?.slice(0, 10) ?? '' }})
                  </Trans>
                  {resolution.fallback && (
                    <Text>
                      {' '}
                      <Trans>Nearest earlier rate used.</Trans>
                    </Text>
                  )}
                </Text>
              ) : shown.kind === 'kept' ? (
                <Text style={{ color: theme.pageTextSubdued }}>
                  <Trans>
                    {{ amount: baseFormat(shown.baseAmount, 'financial') }}{' '}
                    unchanged
                  </Trans>
                </Text>
              ) : shown.kind === 'unavailable' ? (
                <Text style={{ color: theme.warningText }}>
                  {resolution?.status === 'error' ? (
                    <Trans>
                      The rate could not be loaded. Enter a base amount or rate.
                    </Trans>
                  ) : (
                    <Trans>
                      Rate unavailable. Enter a base amount or rate.
                    </Trans>
                  )}
                </Text>
              ) : null}
              <InlineField label={t('Base amount')} width="100%">
                <InitialFocus>
                  <Input
                    name="baseAmount"
                    inputMode="decimal"
                    value={baseInput}
                    onChangeValue={value => {
                      setBaseInput(value);
                      setReplaceRate(false);
                    }}
                    style={{ flex: 1 }}
                  />
                </InitialFocus>
              </InlineField>
              <RateField
                name="rate"
                currencyCode={currencyCode}
                value={rateText}
                direction={direction}
                onChange={(value, direction) => {
                  setRateEdited(true);
                  setRateInput(value);
                  setRateDirection(direction);
                  setReplaceRate(false);
                }}
              />
              <label style={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  aria-label={t('Use this rate from this date')}
                  disabled={standingRate === undefined}
                  checked={persistStanding}
                  onChange={event => {
                    setStandingTouched(true);
                    setSaveStanding(event.currentTarget.checked);
                    setReplaceRate(false);
                  }}
                />
                <Text>
                  <Trans>Use this rate from this date</Trans>
                </Text>
              </label>
              <Text style={{ color: theme.pageTextLight, fontSize: '0.85em' }}>
                <Trans>
                  Leave the base amount and rate empty to use the converted
                  amount shown.
                </Trans>
              </Text>
              <BudgetNotice effects={effects} />
              {message && <FormError>{message}</FormError>}
            </View>
            <ModalButtons>
              <Button isDisabled={busy} onPress={() => state.close()}>
                <Trans>Cancel</Trans>
              </Button>
              <Button
                type="submit"
                variant="primary"
                isDisabled={
                  busy ||
                  stale ||
                  shown.kind === 'loading' ||
                  effects.status === 'loading'
                }
                style={{ marginLeft: 10 }}
              >
                <Trans>Save</Trans>
              </Button>
            </ModalButtons>
          </Form>
        </>
      )}
    </Modal>
  );
}
