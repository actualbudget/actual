import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { isReviewedCurrency } from '@actual-app/core/shared/amount-encoding';

import { MobileSheet } from '#components/mobile/MobileSheet';
import { useCurrencyOptions } from '#components/settings/Currency';
import { useOnBudgetAccounts } from '#hooks/useOnBudgetAccounts';
import { useSyncedPref } from '#hooks/useSyncedPref';
import type { Modal as ModalType } from '#modals/modalsSlice';

type AddCurrencyModalProps = Extract<
  ModalType,
  { name: 'add-currency' }
>['options'];

/**
 * Add Currency: gives a category a pocket in another currency, whose budget
 * total then becomes the noneditable sum of its slots, or shows its base
 * slot when the budget currency is chosen.
 */
export function AddCurrencyModal({
  categoryId,
  categoryName,
}: AddCurrencyModalProps) {
  const { t } = useTranslation();
  const [budgetCurrency] = useSyncedPref('defaultCurrencyCode');
  const { data: accounts = [] } = useOnBudgetAccounts();
  // Only currencies held by open on-budget accounts can fund a pocket. The
  // budget currency is always offered, since it shows the base slot.
  const held = new Set([
    budgetCurrency,
    ...accounts.map(account => account.currency || budgetCurrency),
  ]);
  const options = useCurrencyOptions().filter(
    ([code]) => held.has(code) && isReviewedCurrency(code),
  );
  const [currency, setCurrency] = useState(options[0]?.[0] ?? '');
  const [failed, setFailed] = useState(false);

  return (
    <MobileSheet
      name="add-currency"
      title={t('Add currency to {{category}}', { category: categoryName })}
    >
      {({ close }) => (
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <Select
            id="pocket-currency-select"
            aria-label={t('Currency')}
            value={currency}
            options={options}
            onChange={value => {
              setCurrency(value);
              setFailed(false);
            }}
          />
          <Text style={{ color: theme.pageTextSubdued }}>
            <Trans>
              Every device that edits this budget needs an up-to-date version of
              Actual.
            </Trans>
          </Text>
          {failed && (
            <Text role="alert" style={{ color: theme.errorText }}>
              <Trans>The currency could not be added.</Trans>
            </Text>
          )}
          <Button
            variant="primary"
            isDisabled={!currency}
            onPress={async () => {
              try {
                await send('budget/pocket-create', {
                  category: categoryId,
                  currency,
                });
                close();
              } catch {
                setFailed(true);
              }
            }}
          >
            <Trans>Add currency</Trans>
          </Button>
        </View>
      )}
    </MobileSheet>
  );
}
