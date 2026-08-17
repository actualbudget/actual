import React, { useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { useAccounts } from '#hooks/useAccounts';
import { useSyncedPref } from '#hooks/useSyncedPref';

import { Column, Setting } from './UI';

export function BankSyncSettings() {
  const { t } = useTranslation();
  const { data: accounts = [] } = useAccounts();
  const [interval, setIntervalPref] = useSyncedPref('bank-sync-interval');

  const hasLinkedAccounts = accounts.some(
    ({ bank, closed, tombstone }) => !!bank && !closed && !tombstone,
  );

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

  if (!hasLinkedAccounts) {
    return null;
  }

  const selectButtonClassName = css({
    '&[data-hovered]': {
      backgroundColor: theme.buttonNormalBackgroundHover,
    },
  });

  return (
    <Setting
      primaryAction={
        <View style={{ width: '100%' }}>
          <Column title={t('Sync accounts automatically')}>
            <Select
              value={interval || '0'}
              onChange={value => setIntervalPref(value)}
              options={intervals}
              className={selectButtonClassName}
            />
          </Column>
        </View>
      }
    >
      <Text>
        <Trans>
          <strong>Automatic bank sync</strong> downloads new transactions from
          your linked accounts in the background, so you don't have to sync
          manually.
        </Trans>
      </Text>
      <Text>
        <Trans>
          Syncing only happens while Actual is open, and is skipped if another
          device has already synced within the chosen interval.
        </Trans>
      </Text>
    </Setting>
  );
}
