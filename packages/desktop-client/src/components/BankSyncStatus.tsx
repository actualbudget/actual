import React from 'react';
import { useSelector } from 'react-redux';
import { useTransition, animated } from 'react-spring';

import { type State } from 'loot-core/src/client/state-types';

import { theme, styles } from '../style';

import { AnimatedRefresh } from './AnimatedRefresh';
import { Text } from './common/Text';
import { View } from './common/View';

export function BankSyncStatus() {
  const accountsSyncing = useSelector(
    (state: State) => state.account.accountsSyncing,
  );
  const accountsSyncingCount = accountsSyncing.length;

  const transitions = useTransition(
    accountsSyncingCount > 0 ? 'syncing' : null,
    {
      from: { opacity: 0, transform: 'translateY(-100px)' },
      enter: { opacity: 1, transform: 'translateY(0)' },
      leave: { opacity: 0, transform: 'translateY(-100px)' },
      unique: true,
    },
  );

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
                  Syncing... {accountsSyncingCount} account
                  {accountsSyncingCount > 1 && 's'} remaining
                </Text>
              </View>
            </animated.div>
          ),
      )}
    </View>
  );
}
