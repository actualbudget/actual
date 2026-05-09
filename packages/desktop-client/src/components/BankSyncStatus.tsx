import React from 'react';
import { Trans } from 'react-i18next';
import { animated, useTransition } from 'react-spring';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { isAccountPendingSync } from '#accounts/syncStatus';
import { useAccounts } from '#hooks/useAccounts';

import { AnimatedRefresh } from './AnimatedRefresh';

export function BankSyncStatus() {
  const { isNarrowWidth } = useResponsive();
  const { data: accounts = [] } = useAccounts();
  const accountsSyncingCount = accounts.filter(isAccountPendingSync).length;
  const count = accountsSyncingCount;
  const contentInset = 52;

  const transitions = useTransition(
    accountsSyncingCount > 0 ? 'syncing' : null,
    {
      from: { opacity: 0, transform: 'translateY(-100px)' },
      enter: { opacity: 1, transform: 'translateY(0)' },
      leave: { opacity: 0, transform: 'translateY(-100px)' },
    },
  );

  return (
    <View
      style={{
        ...(isNarrowWidth
          ? {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              marginTop: 5,
              alignItems: 'center',
            }
          : {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              marginTop: 5,
              paddingLeft: contentInset,
              paddingRight: contentInset,
              alignItems: 'flex-start',
            }),
        zIndex: 1101,
        pointerEvents: 'none',
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
                  pointerEvents: 'auto',
                  ...styles.shadow,
                }}
              >
                <AnimatedRefresh
                  animating
                  iconStyle={{ color: theme.pillTextSelected }}
                />
                <Text style={{ marginLeft: 5 }}>
                  <Trans count={accountsSyncingCount}>
                    Syncing... {{ count }} accounts remaining
                  </Trans>
                </Text>
              </View>
            </animated.div>
          ),
      )}
    </View>
  );
}
