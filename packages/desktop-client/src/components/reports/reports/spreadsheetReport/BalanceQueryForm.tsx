import React from 'react';
import { useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';

import { AccountAutocomplete } from '@desktop-client/components/autocomplete/AccountAutocomplete';
import { FormField, FormLabel } from '@desktop-client/components/forms';

type BalanceQueryFormProps = {
  selectedAccount: string;
  onAccountChange: (account: string) => void;
  getAccountId: (accountName: string) => string;
  getAccountName: (accountId: string) => string;
};

export function BalanceQueryForm({
  selectedAccount,
  onAccountChange,
  getAccountId,
  getAccountName,
}: BalanceQueryFormProps) {
  const { t } = useTranslation();

  return (
    <>
      <Text
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: theme.pageText,
          marginBottom: 10,
        }}
      >
        {t('Account Selection')}
      </Text>

      <FormField>
        <FormLabel title={t('Account')} />
        <AccountAutocomplete
          value={getAccountId(selectedAccount)}
          onSelect={accountId => {
            onAccountChange(getAccountName(accountId || ''));
          }}
          includeClosedAccounts={false}
        />
      </FormField>
    </>
  );
}
