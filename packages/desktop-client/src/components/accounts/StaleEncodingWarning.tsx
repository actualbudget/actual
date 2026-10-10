import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { useStaleEncoding } from '#hooks/useStaleEncoding';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

/**
 * Warns that another device wrote transactions of this account in an
 * earlier currency (MC-7.3), and opens their repair.
 */
export function StaleEncodingWarning({
  accountId,
}: {
  accountId: string | undefined;
}) {
  const dispatch = useDispatch();
  const { count, stamps } = useStaleEncoding(accountId);
  if (!accountId || count === 0) return null;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      <Text style={{ color: theme.warningText }}>
        {stamps > 1 ? (
          <Trans>
            Transactions from another device that use an earlier currency:{' '}
            {{ count }}.
          </Trans>
        ) : (
          <Trans>
            Transactions from another device that use this account's previous
            currency: {{ count }}.
          </Trans>
        )}
      </Text>
      <Button
        variant="bare"
        onPress={() =>
          dispatch(
            pushModal({
              modal: { name: 'stale-encoding-repair', options: { accountId } },
            }),
          )
        }
      >
        <Trans>Repair…</Trans>
      </Button>
    </View>
  );
}
