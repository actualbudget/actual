import React from 'react';
import { Trans } from 'react-i18next';
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
  const count = accountsSyncingCount;

  const transitions = useTransition(
    accountsSyncingCount > 0 ? 'syncing' : null,
    {
      from: { opacity: 0 },
      enter: { opacity: 1 },
      leave: { opacity: 0 },
      unique: true,
    },
  );

  return (
    <View
      style={{
        zIndex: 501,
        flexDirection: 'row',
        overflow: 'hidden',
        textWrap: 'nowrap',
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
