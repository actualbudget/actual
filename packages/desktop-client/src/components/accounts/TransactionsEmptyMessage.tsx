import React from 'react';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAdd } from '@actual-app/components/icons/v1';
import { SvgDownloadThickBottom } from '@actual-app/components/icons/v2';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

type TransactionsEmptyMessageProps = {
  /** Whether the list is empty because of a search or filter. */
  isFiltered: boolean;
  /** Offered when viewing a single account that can be imported into. */
  onImport?: () => void;
  onAddTransaction?: () => void;
};

/**
 * Shown in place of the transaction table when an account has nothing in
 * it yet. Rather than a bare "No transactions", it tells a new user the two
 * ways to get transactions in.
 */
export function TransactionsEmptyMessage({
  isFiltered,
  onImport,
  onAddTransaction,
}: TransactionsEmptyMessageProps) {
  if (isFiltered) {
    return (
      <View
        data-testid="transactions-empty"
        style={{
          color: theme.pageTextLight,
          marginTop: 30,
          textAlign: 'center',
          fontStyle: 'italic',
        }}
      >
        <Trans>No transactions match your search or filters.</Trans>
      </View>
    );
  }

  return (
    <View
      data-testid="transactions-empty"
      style={{
        alignItems: 'center',
        gap: 8,
        padding: '48px 20px',
        textAlign: 'center',
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: 600 }}>
        <Trans>No transactions yet</Trans>
      </Text>
      <Text
        style={{
          color: theme.pageTextLight,
          lineHeight: '1.5em',
          maxWidth: 440,
        }}
      >
        {onImport ? (
          <Trans>
            The fastest way to start is to import a file downloaded from your
            bank (CSV, OFX, QFX, QIF or CAMT). You can also add transactions one
            at a time.
          </Trans>
        ) : (
          <Trans>
            Open one of your accounts to import a file from your bank or add
            transactions one at a time.
          </Trans>
        )}
      </Text>
      {(onImport || onAddTransaction) && (
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            marginTop: 10,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {onImport && (
            <Button variant="primary" onPress={onImport}>
              <SvgDownloadThickBottom
                width={12}
                height={12}
                style={{ marginRight: 6 }}
              />
              <Trans>Import from a file</Trans>
            </Button>
          )}
          {onAddTransaction && (
            <Button variant="normal" onPress={onAddTransaction}>
              <SvgAdd width={10} height={10} style={{ marginRight: 6 }} />
              <Trans>Add a transaction</Trans>
            </Button>
          )}
        </View>
      )}
    </View>
  );
}
