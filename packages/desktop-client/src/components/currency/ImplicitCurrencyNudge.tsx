import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { useAccounts } from '#hooks/useAccounts';
import { useMultiCurrency } from '#hooks/useMultiCurrency';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

// Accounts get the default currency as their own when multiple currencies
// are turned on, so changing the default later doesn't relabel them. List
// the accounts in the default currency until dismissed, so the user can
// correct one that holds another currency.
export function ImplicitCurrencyNudge() {
  const dispatch = useDispatch();
  const { isEnabled, defaultCurrencyCode } = useMultiCurrency();
  const [dismissed, setDismissed] = useSyncedPref(
    'multi-currency-nudge-dismissed',
  );
  const { data: accounts = [] } = useAccounts();

  const defaultAccounts = accounts.filter(
    account =>
      !account.closed &&
      (account.currency == null || account.currency === defaultCurrencyCode),
  );

  if (!isEnabled || dismissed === 'true' || defaultAccounts.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        gap: 10,
        padding: 15,
        borderRadius: 6,
        border: `1px solid ${theme.tableBorder}`,
        backgroundColor: theme.tableBackground,
      }}
    >
      <Text style={{ lineHeight: 1.5 }}>
        <Trans>
          These accounts are in {{ currency: defaultCurrencyCode }}, and stay in
          it if you change the default currency later. If one of them holds
          another currency, open it and choose its currency: its amounts are
          relabeled, not converted.
        </Trans>
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
        {defaultAccounts.map(account => (
          <Button
            key={account.id}
            onPress={() =>
              dispatch(
                pushModal({
                  modal: {
                    name: 'account-settings',
                    options: { accountId: account.id },
                  },
                }),
              )
            }
          >
            {account.name}
          </Button>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Button variant="bare" onPress={() => setDismissed('true')}>
          <Trans>Dismiss</Trans>
        </Button>
      </View>
    </View>
  );
}
