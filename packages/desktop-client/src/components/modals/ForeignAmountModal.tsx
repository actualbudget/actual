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
import { RateField, storedRate } from '#components/transactions/RateField';
import type { RateDirection } from '#components/transactions/RateField';
import { CurrencyFormatProvider } from '#hooks/currencyFormatContext';
import { useAmountPrecision } from '#hooks/useAmountPrecision';
import { useFormat } from '#hooks/useFormat';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { removeModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { aqlQuery } from '#queries/aqlQuery';
import { useDispatch } from '#redux';

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
  | { status: 'unavailable' };

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
 * Previews a new foreign transaction's conversion and posts it atomically.
 * The preview only reads; confirming sends exactly what was shown.
 */
export function ForeignAmountModal({
  transaction,
  currencyCode,
  nativePrecision,
  rulesApplied,
  onPosted,
}: ForeignAmountModalProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const basePrecision = useAmountPrecision();
  const baseFormat = useFormat(basePrecision);
  const [draft, setDraft] = useState(transaction);
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
  const [baseInput, setBaseInput] = useState('');
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
    }).then(result => {
      if (!cancelled) setResolved({ date: draft.date, result });
    });
    return () => {
      cancelled = true;
    };
  }, [currencyCode, draft.date]);

  useEffect(() => {
    setRateEdited(false);
  }, [draft.date]);

  useEffect(() => {
    if (rateEdited || resolved?.date !== draft.date) return;
    const result = resolved.result;
    if (result.status === 'resolved' && result.kind === 'dated') {
      setRateInput(result.rate);
      setRateDirection('foreign-per-base');
      return;
    }
    setRateInput('');
  }, [draft.date, rateEdited, resolved]);

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

  const native = draft.transaction_amount;
  const resolution = resolved?.date === draft.date ? resolved.result : null;

  type Preview =
    | { kind: 'base'; baseAmount: number }
    | { kind: 'rate'; rate: string; baseAmount: number }
    | { kind: 'default'; baseAmount: number }
    | { kind: 'invalid' }
    | { kind: 'loading' }
    | { kind: 'unavailable' };

  /** The conversion shown to the user, which is exactly what Save posts. */
  function preview(): Preview {
    if (baseInput.trim() !== '') {
      const parsed = baseFormat.fromEdit(baseInput);
      // The base amount is entered as a magnitude and follows the native
      // amount's direction (outflow or inflow).
      return parsed == null
        ? { kind: 'invalid' }
        : {
            kind: 'base',
            baseAmount: native < 0 ? -Math.abs(parsed) : Math.abs(parsed),
          };
    }
    if (rateInput.trim() !== '') {
      // A malformed rate, or one whose conversion is out of range, is
      // reported as invalid input rather than breaking the dialog.
      try {
        const rate = storedRate(rateInput, rateDirection);
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

  async function confirm() {
    const payload =
      shown.kind === 'base' || shown.kind === 'default'
        ? { baseAmount: shown.baseAmount }
        : shown.kind === 'rate'
          ? { rate: shown.rate, expectedBaseAmount: shown.baseAmount }
          : null;
    if (shown.kind === 'loading') return;
    if (payload == null) {
      setMessage(
        baseInput.trim() !== '' || rateInput.trim() !== ''
          ? t('Enter a valid base amount or rate.')
          : t('Rate unavailable. Enter a base amount or rate.'),
      );
      return;
    }
    setBusy(true);
    try {
      const result = await send('transactions/post-foreign-entry', {
        transaction: draft,
        ...payload,
        replaceRate,
        saveStanding,
        rulesApplied,
      });
      switch (result.status) {
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
                rate: shown.kind === 'rate' ? shown.rate : rateInput.trim(),
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
    } catch {
      // The server refused the entry; nothing was written and the draft
      // stays open for correction.
      setMessage(t('This transaction could not be saved.'));
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
            title={t('Convert to budget currency')}
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
              <InlineField label={t('Amount')} width="100%">
                <NativeAmount
                  amount={native}
                  currencyCode={currencyCode}
                  precision={nativePrecision}
                />
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
              ) : shown.kind === 'unavailable' ? (
                <Text style={{ color: theme.warningText }}>
                  <Trans>Rate unavailable. Enter a base amount or rate.</Trans>
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
                value={rateInput}
                direction={rateDirection}
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
                  checked={saveStanding}
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
              {message && <FormError>{message}</FormError>}
            </View>
            <ModalButtons>
              <Button isDisabled={busy} onPress={() => state.close()}>
                <Trans>Cancel</Trans>
              </Button>
              <Button
                type="submit"
                variant="primary"
                isDisabled={busy || shown.kind === 'loading'}
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
