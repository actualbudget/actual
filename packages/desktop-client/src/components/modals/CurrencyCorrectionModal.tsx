import { useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { FormError } from '@actual-app/components/form-error';
import { InlineField } from '@actual-app/components/inline-field';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { isReviewedCurrency } from '@actual-app/core/shared/amount-encoding';
import { useQueryClient } from '@tanstack/react-query';

import { accountQueries } from '#accounts/queries';
import {
  confirmCorrection,
  correctionErrorMessage,
  CorrectionPreviewView,
  ModeChoice,
  rowRefusal,
  useCorrectionPreview,
} from '#components/accounts/CorrectionPreview';
import type { CorrectionMode } from '#components/accounts/CorrectionPreview';
import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '#components/common/Modal';
import { useCurrencyOptions } from '#components/settings/Currency';
import { useAccount } from '#hooks/useAccount';
import { invalidateStaleEncoding } from '#hooks/useStaleEncoding';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { pushModal, removeModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type CurrencyCorrectionModalProps = Extract<
  ModalType,
  { name: 'currency-correction' }
>['options'];

/**
 * Changes an account's currency across its whole history, keeping the
 * numbers (the default) or converting the amounts, after a preview of
 * everything it changes.
 */
export function CurrencyCorrectionModal({
  accountId,
}: CurrencyCorrectionModalProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const account = useAccount(accountId);
  const [budgetCurrency = ''] = useSyncedPref('defaultCurrencyCode');
  const current = account?.currency ?? budgetCurrency;
  const options = useCurrencyOptions().filter(
    ([code]) => isReviewedCurrency(code) && code !== current,
  );
  const [currency, setCurrency] = useState('');
  const [mode, setMode] = useState<CorrectionMode>('keep');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { state, refresh } = useCorrectionPreview(
    currency
      ? { kind: 'correction', account: accountId, currency, mode }
      : null,
  );

  const preview = state?.status === 'ready' ? state.preview : null;
  const refusal =
    state?.status === 'refused'
      ? state.error
      : preview
        ? rowRefusal(preview)
        : null;
  const canApply =
    !!preview && !refusal && preview.missingRateQuotes.length === 0 && !busy;

  // Taken on the first press, before the reconciled-rows check awaits, so
  // the dialog can be neither closed nor applied again until it settles.
  const submitting = useRef(false);

  async function apply() {
    if (!preview || !canApply || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      if (!(await confirmCorrection(dispatch, preview, accountId))) return;
      const result = await send('accounts/correct-currency', {
        account: accountId,
        currency,
        mode,
        fingerprint: preview.fingerprint,
      });
      if (result.status === 'ok') {
        void queryClient.invalidateQueries({
          queryKey: accountQueries.lists(),
        });
        void invalidateStaleEncoding(queryClient);
        dispatch(removeModal({ name: 'currency-correction' }));
        return;
      }
      setMessage(
        result.status === 'stale'
          ? t(
              'Something changed on this or another device; review the new preview.',
            )
          : null,
      );
      refresh();
    } catch (error) {
      setMessage(
        correctionErrorMessage(
          t,
          String((error as { message?: unknown })?.message),
        ),
      );
      // The previous preview no longer holds; show the current one.
      refresh();
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <Modal
      name="currency-correction"
      containerProps={{ style: { width: 520 } }}
      isDismissable={!busy}
      isKeyboardDismissDisabled={busy}
    >
      {({ state: modalState }) => (
        <>
          <ModalHeader
            title={t('Change currency')}
            rightContent={
              busy ? null : (
                <ModalCloseButton onPress={() => modalState.close()} />
              )
            }
          />
          <View style={{ gap: 12 }}>
            <Text>
              <Trans>
                {{ name: account?.name ?? '' }} uses {{ currency: current }}.
                Every transaction in its history changes with it.
              </Trans>
            </Text>
            <InlineField label={t('Currency')} width="100%">
              <Select
                id="correction-currency-select"
                disabled={busy}
                value={currency}
                options={[['', t('Choose a currency')], ...options]}
                onChange={value => {
                  setCurrency(value);
                  setMessage(null);
                }}
                style={{ flex: 1 }}
              />
            </InlineField>
            <ModeChoice
              disabled={busy}
              mode={mode}
              order={['keep', 'convert']}
              onChange={value => {
                setMode(value);
                setMessage(null);
              }}
            />
            {state?.status === 'loading' && (
              <Text>
                <Trans>Checking what changes…</Trans>
              </Text>
            )}
            {preview && (
              <CorrectionPreviewView
                preview={preview}
                accountId={accountId}
                onRatesSaved={refresh}
              />
            )}
            {refusal && (
              <View style={{ gap: 6 }}>
                <FormError>{correctionErrorMessage(t, refusal)}</FormError>
                {refusal === 'correction-stale-rows-pending' && (
                  <Button
                    onPress={() =>
                      dispatch(
                        pushModal({
                          modal: {
                            name: 'stale-encoding-repair',
                            options: { accountId, onRepaired: refresh },
                          },
                        }),
                      )
                    }
                  >
                    <Trans>Repair…</Trans>
                  </Button>
                )}
              </View>
            )}
            {message && <FormError>{message}</FormError>}
          </View>
          <ModalButtons>
            <Button isDisabled={busy} onPress={() => modalState.close()}>
              <Trans>Cancel</Trans>
            </Button>
            <Button
              variant="primary"
              isDisabled={!canApply}
              onPress={() => void apply()}
              style={{ marginLeft: 10 }}
            >
              <Trans>Change currency</Trans>
            </Button>
          </ModalButtons>
        </>
      )}
    </Modal>
  );
}
