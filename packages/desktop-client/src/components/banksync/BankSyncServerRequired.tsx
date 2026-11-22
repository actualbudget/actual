import { Trans } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import { Link } from '#components/common/Link';

type BankSyncServerRequiredProps = {
  syncServerStatus: 'offline' | 'no-server';
};

export function BankSyncServerRequired({
  syncServerStatus,
}: BankSyncServerRequiredProps) {
  return (
    <View
      data-testid="bank-sync-server-required"
      style={{
        flexShrink: 0,
        padding: spacing.xl,
        alignItems: 'center',
        backgroundColor: theme.tableBackground,
      }}
    >
      <Text
        style={{
          ...styles.smallText,
          lineHeight: 1.5,
          color: theme.pageText,
          textAlign: 'center',
        }}
      >
        {syncServerStatus === 'offline' ? (
          <Trans>
            The server cannot be reached. Linking accounts and changing
            providers is unavailable until the connection is back.
          </Trans>
        ) : (
          <Trans>
            Bank sync needs an Actual server. Connect to a server to link your
            bank accounts.{' '}
            <Link
              variant="external"
              to="https://actualbudget.org/docs/advanced/bank-sync"
              linkColor="muted"
            >
              Learn more
            </Link>
          </Trans>
        )}
      </Text>
    </View>
  );
}
