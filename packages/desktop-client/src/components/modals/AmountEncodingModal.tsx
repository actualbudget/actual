import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button, ButtonWithLoading } from '@actual-app/components/button';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';

import { Link } from '#components/common/Link';
import { Modal, ModalHeader } from '#components/common/Modal';
import { Checkbox } from '#components/forms';
import { useCurrencyOptions } from '#components/settings/Currency';
import { useMetadataPref } from '#hooks/useMetadataPref';

type Props = {
  enabled: boolean;
  currencyCode: string;
};

type Preflight = {
  sourceToken: string;
  source: { version: 0 | 1; currencyCode: string; precision: number };
  target: { version: 0 | 1; currencyCode: string; precision: number };
  pending: boolean;
};

export function AmountEncodingModal({ enabled, currencyCode }: Props) {
  const { t } = useTranslation();
  const currencyOptions = useCurrencyOptions();
  const [budgetId] = useMetadataPref('id');
  const [pending] = useMetadataPref('amountEncodingTransition');
  const [lastBackup, setLastBackup] = useState<string>();
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [preflight, setPreflight] = useState<Preflight>();
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retryable, setRetryable] = useState(Boolean(pending));
  const [selectedCurrencyCode, setSelectedCurrencyCode] =
    useState(currencyCode);
  const changesPrecision =
    preflight && preflight.source.precision !== preflight.target.precision;
  const pendingCurrency = pending?.targetCurrencyCode;
  const pendingMismatch =
    pendingCurrency != null && pendingCurrency !== selectedCurrencyCode;

  useEffect(() => {
    let cancelled = false;
    if (budgetId) {
      void send('backups-get', { id: budgetId }).then(
        backups => {
          if (!cancelled) {
            setLastBackup(
              backups.find(backup => backup.date)?.date ?? undefined,
            );
          }
        },
        () => setLastBackup(undefined),
      );
    }
    return () => {
      cancelled = true;
    };
  }, [budgetId]);

  useEffect(() => {
    let cancelled = false;
    setPreflight(undefined);
    setError(false);
    if (enabled && !selectedCurrencyCode) {
      return;
    }
    send('amount-encoding/preflight', {
      enabled,
      currencyCode: selectedCurrencyCode,
    }).then(
      result => {
        if (!cancelled) {
          setPreflight(result);
          setRetryable(result.pending);
        }
      },
      () => {
        if (!cancelled) setError(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [enabled, selectedCurrencyCode]);

  async function confirm(close: () => void) {
    if (pendingMismatch) return;
    setBusy(true);
    setError(false);
    try {
      const result = retryable
        ? await send('amount-encoding/retry')
        : preflight &&
          (await send('amount-encoding/transition', {
            enabled,
            currencyCode: selectedCurrencyCode,
            sourceToken: preflight.sourceToken,
          }));
      if (!result || result.error) {
        setError(true);
        setRetryable(Boolean(result?.retryable));
        return;
      }
      close();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      name="amount-encoding"
      isDismissable={!busy}
      isKeyboardDismissDisabled={busy}
    >
      {({ state }) => (
        <>
          <ModalHeader
            title={
              changesPrecision
                ? t('Change decimal precision')
                : t('Back up your budget')
            }
          />
          <View style={{ gap: 16, maxWidth: 600 }}>
            <Text>
              <Trans>
                Per-currency decimal precision is experimental. Some workflows
                are still being updated and may show incorrect amounts. Have you
                made a backup using the backup and export settings? We recommend
                a backup before continuing. You can continue without making or
                confirming a backup.
              </Trans>
            </Text>
            {(pendingMismatch || (enabled && !currencyCode)) && (
              <Select
                value={selectedCurrencyCode}
                defaultLabel={t('Select a currency')}
                onChange={setSelectedCurrencyCode}
                options={currencyOptions.filter(([code]) => code !== '')}
                disabled={busy}
                style={{ width: '100%' }}
              />
            )}
            <Link
              variant="internal"
              to="/settings/general#export-data"
              isDisabled={busy}
              onClick={() => {
                state.close();
              }}
              style={{ color: theme.pageTextLink }}
            >
              <Trans>Go to backup and export settings</Trans>
            </Link>
            {lastBackup && (
              <Text>
                <Trans>Last recorded local backup: {{ lastBackup }}</Trans>
              </Text>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Checkbox
                checked={backupConfirmed}
                onChange={event => setBackupConfirmed(event.target.checked)}
                disabled={busy}
              />
              <Trans>I have made a backup</Trans>
            </label>
            {changesPrecision &&
              (!enabled ||
                preflight.target.precision < preflight.source.precision) && (
                <Text style={{ color: theme.warningText }}>
                  <Trans>
                    Reducing precision rounds amounts and can permanently lose
                    minor units. Disabling this feature restores two decimal
                    places but cannot recover units lost by earlier rounding.
                  </Trans>
                </Text>
              )}
            {changesPrecision && !retryable && (
              <Text>
                <Trans>
                  Convert from {{ sourcePrecision: preflight.source.precision }}{' '}
                  decimal places to{' '}
                  {{ targetPrecision: preflight.target.precision }} decimal
                  places. This changes stored units, not exchange rates.
                </Trans>
              </Text>
            )}
            {(retryable || pending) && !pendingMismatch && (
              <Text role="alert">
                <Trans>
                  A precision change is unfinished. Normal editing and sync are
                  blocked until recovery completes. Reconnect and retry.
                </Trans>
              </Text>
            )}
            {pendingMismatch && (
              <Text role="alert" style={{ color: theme.errorText }}>
                <Trans>
                  Finish the {{ pendingCurrency }} change before choosing
                  another currency.
                </Trans>
              </Text>
            )}
            {error && (
              <Text role="alert" style={{ color: theme.errorText }}>
                <Trans>
                  The precision change could not complete. Check your
                  connection. If retry is unavailable, close this dialog and try
                  again to check the current budget. A currency must be selected
                  to enable decimal precision.
                </Trans>
              </Text>
            )}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <Button onPress={() => state.close()} isDisabled={busy}>
                <Trans>Cancel</Trans>
              </Button>
              <ButtonWithLoading
                variant="primary"
                isLoading={busy}
                isDisabled={
                  busy ||
                  pendingMismatch ||
                  (!retryable && (!preflight || preflight.pending || error))
                }
                onPress={() => confirm(() => state.close())}
              >
                {retryable && !pendingMismatch ? (
                  <Trans>Retry precision change</Trans>
                ) : changesPrecision ? (
                  <Trans>Confirm precision change</Trans>
                ) : (
                  <Trans>Continue</Trans>
                )}
              </ButtonWithLoading>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
