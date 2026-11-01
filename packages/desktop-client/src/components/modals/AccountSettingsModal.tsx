import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Menu } from '@actual-app/components/menu';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { getEffectiveCurrency } from '@actual-app/core/shared/fx/currency';
import { q } from '@actual-app/core/shared/query';
import type { AccountEntity } from '@actual-app/core/types/models';

import { useUpdateAccountMutation } from '#accounts';
import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '#components/common/Modal';
import { CurrencySelect } from '#components/currency/CurrencySelect';
import {
  DEFAULT_CURRENCY_DISPLAY_MODE,
  parseCurrencyDisplayMode,
  useCurrencyDisplayModeOptions,
} from '#components/currency/displayMode';
import { useAccount } from '#hooks/useAccount';
import { useMultiCurrency } from '#hooks/useMultiCurrency';
import { useQuery } from '#hooks/useQuery';
import { useSyncedPref } from '#hooks/useSyncedPref';

const BUDGET_DISPLAY_MODE_VALUE = '__budget__';

type AccountSettingsModalProps = {
  accountId: AccountEntity['id'];
};

export function AccountSettingsModal({ accountId }: AccountSettingsModalProps) {
  const { t } = useTranslation();
  const account = useAccount(accountId);
  const { defaultCurrencyCode } = useMultiCurrency();
  const updateAccount = useUpdateAccountMutation();
  const displayModeOptions = useCurrencyDisplayModeOptions();

  const [budgetDisplayModePref] = useSyncedPref('currency-display-mode');
  const [accountDisplayModePref, setAccountDisplayModePref] = useSyncedPref(
    `currency-display-mode-${accountId}`,
  );
  const budgetDisplayMode =
    parseCurrencyDisplayMode(budgetDisplayModePref) ??
    DEFAULT_CURRENCY_DISPLAY_MODE;

  const { data: firstTransaction, isLoading: isCheckingTransactions } =
    useQuery<{ id: string }>(
      () =>
        q('transactions').filter({ account: accountId }).select('id').limit(1),
      [accountId],
    );
  const hasTransactions = (firstTransaction?.length ?? 0) > 0;

  // `undefined` means the value hasn't been touched in this dialog
  const [pendingCurrency, setPendingCurrency] = useState<
    string | null | undefined
  >(undefined);
  const [pendingDisplayMode, setPendingDisplayMode] = useState<
    string | undefined
  >(undefined);
  const [isConfirming, setIsConfirming] = useState(false);

  if (!account) {
    return null;
  }

  const savedCurrency = account.currency;
  const selectedCurrency =
    pendingCurrency === undefined ? savedCurrency : pendingCurrency;
  const fromCode = getEffectiveCurrency(savedCurrency, defaultCurrencyCode);
  const toCode = getEffectiveCurrency(selectedCurrency, defaultCurrencyCode);

  const isCurrencyChanged = selectedCurrency !== savedCurrency;
  const needsConfirmation =
    isCurrencyChanged && hasTransactions && fromCode !== toCode;
  const isForeignOnBudget =
    !account.offbudget && toCode !== defaultCurrencyCode;

  const selectedDisplayMode =
    pendingDisplayMode === undefined
      ? (parseCurrencyDisplayMode(accountDisplayModePref) ??
        BUDGET_DISPLAY_MODE_VALUE)
      : pendingDisplayMode;

  const save = (close: () => void) => {
    if (isCurrencyChanged && needsConfirmation && !isConfirming) {
      setIsConfirming(true);
      return;
    }
    if (pendingDisplayMode !== undefined) {
      setAccountDisplayModePref(
        pendingDisplayMode === BUDGET_DISPLAY_MODE_VALUE
          ? ''
          : pendingDisplayMode,
      );
    }
    if (!isCurrencyChanged) {
      close();
      return;
    }
    updateAccount.mutate(
      { account: { id: accountId, currency: selectedCurrency } },
      { onSuccess: close },
    );
  };

  return (
    <Modal name="account-settings">
      {({ state }) => (
        <>
          <ModalHeader
            title={
              <ModalTitle
                title={t('{{name}} settings', { name: account.name })}
                shrinkOnOverflow
              />
            }
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ gap: 15, maxWidth: 500 }}>
            <View style={{ gap: 5 }}>
              <label htmlFor="account-settings-currency">
                <Text style={{ fontWeight: 600 }}>
                  <Trans>Currency</Trans>
                </Text>
              </label>
              <CurrencySelect
                id="account-settings-currency"
                value={selectedCurrency}
                savedValue={savedCurrency}
                defaultCurrencyCode={defaultCurrencyCode}
                onChange={currency => {
                  setPendingCurrency(currency);
                  setIsConfirming(false);
                }}
              />
              <Text style={{ color: theme.pageTextSubdued, lineHeight: 1.5 }}>
                <Trans>
                  The currency the amounts of this account are recorded in.
                  Totals such as net worth convert it into the budget&apos;s
                  default currency using your exchange rates.
                </Trans>
              </Text>
            </View>

            {isConfirming && (
              <Text style={{ color: theme.warningText, lineHeight: 1.5 }}>
                <Trans>
                  This account already has transactions. Their amounts will be
                  shown as {{ to: toCode }} instead of {{ from: fromCode }};
                  they are not converted.
                </Trans>
              </Text>
            )}
            {isForeignOnBudget && (
              <Text style={{ color: theme.pageTextSubdued, lineHeight: 1.5 }}>
                <Trans>
                  This account is on budget. Category budgets convert its
                  amounts with the exchange rate on each transaction&apos;s
                  date.
                </Trans>
              </Text>
            )}

            <View style={{ gap: 5 }}>
              <label htmlFor="account-settings-display-mode">
                <Text style={{ fontWeight: 600 }}>
                  <Trans>Show balance as</Trans>
                </Text>
              </label>
              <Select
                id="account-settings-display-mode"
                value={selectedDisplayMode}
                onChange={setPendingDisplayMode}
                options={[
                  [
                    BUDGET_DISPLAY_MODE_VALUE,
                    t('Budget setting ({{mode}})', {
                      mode:
                        displayModeOptions.find(
                          ([mode]) => mode === budgetDisplayMode,
                        )?.[1] ?? budgetDisplayMode,
                    }),
                  ],
                  Menu.line,
                  ...displayModeOptions,
                ]}
                style={{ maxWidth: '100%' }}
              />
              <Text style={{ color: theme.pageTextSubdued, lineHeight: 1.5 }}>
                <Trans>
                  How this account&apos;s balance is shown: in its header, its
                  running balance and its chart. Its transactions always show
                  their own amount. Only applies while this account uses a
                  currency other than the default.
                </Trans>
              </Text>
            </View>
          </View>

          <ModalButtons>
            <Button onPress={() => state.close()}>
              <Trans>Cancel</Trans>
            </Button>
            <Button
              variant="primary"
              // Whether the change needs confirming is only known once the
              // transactions have been checked
              isDisabled={isCheckingTransactions || updateAccount.isPending}
              onPress={() => save(() => state.close())}
              style={{ marginLeft: 10 }}
            >
              {isConfirming ? (
                <Trans>Change currency</Trans>
              ) : (
                <Trans>Save</Trans>
              )}
            </Button>
          </ModalButtons>
        </>
      )}
    </Modal>
  );
}
