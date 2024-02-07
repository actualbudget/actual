import React from 'react';
import { useSelector } from 'react-redux';
import { useTransition, animated } from 'react-spring';

import { type State } from 'loot-core/client/state-types';
import { type AccountState } from 'loot-core/client/state-types/account';

import { theme, styles } from '../style';

import { AnimatedRefresh } from './AnimatedRefresh';
import { Text } from './common/Text';
import { View } from './common/View';

export function BankSyncStatus() {
  const accountsSyncing = useSelector<State, AccountState['accountsSyncing']>(
    state => state.account.accountsSyncing,
  );

  const name = accountsSyncing
    ? accountsSyncing === '__all'
      ? 'accounts'
      : accountsSyncing
    : null;

  const transitions = useTransition(name, {
    from: { opacity: 0, transform: 'translateY(-100px)' },
    enter: { opacity: 1, transform: 'translateY(0)' },
    leave: { opacity: 0, transform: 'translateY(-100px)' },
    unique: true,
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
                  animating={true}
                  iconStyle={{ color: theme.pillTextSelected }}
                />
                <Text>Syncing {item}</Text>
              </View>
            </animated.div>
          ),
      )}
    </View>
  );
}
