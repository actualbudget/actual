import React from 'react';
import { Trans } from 'react-i18next';
import { animated, useTransition } from 'react-spring';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { useSelector } from '#redux';

import { AnimatedRefresh } from './AnimatedRefresh';

export function BankSyncStatus() {
  const accountsSyncing = useSelector(state => state.account.accountsSyncing);
  const { isNarrowWidth } = useResponsive();
  const accountsSyncingCount = accountsSyncing.length;
  const count = accountsSyncingCount;

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
        position: 'absolute',
        top: isNarrowWidth ? 0 : 36,
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
