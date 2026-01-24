import React from 'react';
import { Trans } from 'react-i18next';
import { animated, useTransition } from 'react-spring';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { AnimatedRefresh } from './AnimatedRefresh';

import { useSelector } from '@desktop-client/redux';

export function BankSyncStatus() {
  const { accountsSyncing, syncQueue, isProcessingQueue } = useSelector(
    state => state.account,
  );

  // For "Sync All": use accountsSyncing.length (shows actual accounts being processed)
  // For individual accounts: use syncQueue.length (shows queued requests)
  const hasAllAccountsRequest = syncQueue.some(
    req => req.id === 'ALL_ACCOUNTS',
  );
  const totalRemaining = hasAllAccountsRequest
    ? accountsSyncing.length
    : syncQueue.length;
  const showStatus = isProcessingQueue && totalRemaining > 0;

  const transitions = useTransition(showStatus ? 'syncing' : null, {
    from: { opacity: 0, transform: 'translateY(-100px)' },
    enter: { opacity: 1, transform: 'translateY(0)' },
    leave: { opacity: 0, transform: 'translateY(-100px)' },
  });

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        marginTop: 5,
        alignItems: 'center',
        zIndex: 501,
      }}
    >
      {transitions(
        (style, item) =>
          item && (
            <animated.div key={item} style={style}>
              <View
                style={{
                  borderRadius: 4,
                  backgroundColor: theme.pillBackgroundSelected,
                  color: theme.pillTextSelected,
                  padding: '5px 13px',
                  flexDirection: 'row',
                  alignItems: 'center',
                  ...styles.shadow,
                }}
              >
                <AnimatedRefresh
                  animating
                  iconStyle={{ color: theme.pillTextSelected }}
                />
                <Text style={{ marginLeft: 5 }}>
                  <Trans count={totalRemaining}>
                    Syncing... {{ count: totalRemaining }} accounts remaining
                  </Trans>
                </Text>
              </View>
            </animated.div>
          ),
      )}
    </View>
  );
}
