import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import type { AccountEntity } from '@actual-app/core/types/models';

import { useDateFormat } from '#hooks/useDateFormat';
import { useExchangeRates } from '#hooks/useExchangeRates';
import { useMultiCurrency } from '#hooks/useMultiCurrency';
import { updateExchangeRates } from '#hooks/useUpdateExchangeRates';

import { describeMissingRates } from './missingRates';
import type { MissingExchangeRates } from './missingRates';

// Currencies whose banner was closed; it comes back when the app reopens
const dismissedCurrencies = new Set<string>();

type MissingRatesBannerProps = {
  account: Pick<AccountEntity, 'currency'>;
};

// Warns on the page of an account in another currency that its balances
// may not be converted accurately, because exchange rates are missing. The
// desktop account page keeps the banner when moving to another account, so
// everything shown is looked up by the account's currency.
export function MissingRatesBanner({ account }: MissingRatesBannerProps) {
  const { t } = useTranslation();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const { isEnabled, defaultCurrencyCode, getAccountCurrency } =
    useMultiCurrency();
  const currency = getAccountCurrency(account);
  const isForeign = isEnabled && currency !== defaultCurrencyCode;
  // Checked again whenever rates change, e.g. after an update
  const { exchangeRates, isLoading } = useExchangeRates({
    enabled: isForeign,
  });
  const [allMissing, setAllMissing] = useState<MissingExchangeRates[]>([]);
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(
    () => new Set(dismissedCurrencies),
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<{
    currency: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!isForeign || isLoading) {
      return;
    }
    let isCurrent = true;
    send('exchange-rates-missing')
      .then(missingRates => {
        if (isCurrent) {
          setAllMissing(missingRates);
        }
      })
      // The banner stays as it was until the next change
      .catch(() => null);
    return () => {
      isCurrent = false;
    };
  }, [exchangeRates, isForeign, isLoading]);

  const missing = allMissing.find(entry => entry.currency === currency);
  if (!isForeign || !missing || dismissed.has(currency)) {
    return null;
  }

  const onUpdate = async () => {
    setIsUpdating(true);
    setError(null);
    const status = await updateExchangeRates(t('Something went wrong.'));
    if (status.errors.length > 0) {
      setError({ currency, message: status.errors.join('; ') });
    }
    setIsUpdating(false);
  };

  return (
    <View
      role="status"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 12,
        padding: '8px 12px',
        borderRadius: 6,
        border: `1px solid ${theme.warningBorder}`,
        backgroundColor: theme.warningBackground,
        color: theme.warningText,
      }}
    >
      <View style={{ flex: 1, minWidth: 200, lineHeight: 1.5 }}>
        <Text style={{ fontWeight: 600 }}>
          <Trans>
            Some {{ currency }} exchange rates are missing, so converted
            balances may not be accurate.
          </Trans>
        </Text>
        {describeMissingRates([missing], t, dateFormat).map(sentence => (
          <Text key={sentence}>{sentence}</Text>
        ))}
        {error?.currency === currency && (
          <Text style={{ color: theme.errorText }}>
            {t('Could not update: {{error}}', { error: error.message })}
          </Text>
        )}
      </View>
      <Button isDisabled={isUpdating} onPress={() => void onUpdate()}>
        {isUpdating ? t('Updating…') : t('Update now')}
      </Button>
      <Button
        variant="bare"
        onPress={() => {
          dismissedCurrencies.add(currency);
          setDismissed(new Set(dismissedCurrencies));
        }}
      >
        <Trans>Dismiss</Trans>
      </Button>
    </View>
  );
}
