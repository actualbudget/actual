import { useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Paragraph } from '@actual-app/components/paragraph';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { useSyncedPref } from '#hooks/useSyncedPref';

export function AutomaticSyncSettings() {
  const { t } = useTranslation();
  const [interval, setIntervalPref] = useSyncedPref('bank-sync-interval');

  const intervals = useMemo<Array<[string, string]>>(
    () => [
      ['0', t('Never')],
      ['60', t('Every hour')],
      ['360', t('Every 6 hours')],
      ['720', t('Every 12 hours')],
      ['1440', t('Every day')],
    ],
    [t],
  );

  return (
    <View
      style={{
        border: `1px solid ${theme.tableBorder}`,
        borderRadius: 8,
        padding: 16,
        backgroundColor: theme.tableBackground,
        gap: 12,
      }}
    >
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 17, fontWeight: 600 }}>
          <Trans>Automatic syncing</Trans>
        </Text>
        <Paragraph
          style={{ fontSize: 15, color: theme.pageTextSubdued, margin: 0 }}
        >
          <Trans>
            Download new transactions from your linked accounts in the
            background. This only happens while Actual is open, and is skipped
            if another device has already synced within the chosen interval.
          </Trans>
        </Paragraph>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <label htmlFor="bank-sync-interval">
          <Trans>Sync accounts</Trans>
        </label>
        <Select
          id="bank-sync-interval"
          value={interval || '0'}
          onChange={value => setIntervalPref(value)}
          options={intervals}
          style={{ flexShrink: 0 }}
        />
      </View>
    </View>
  );
}
