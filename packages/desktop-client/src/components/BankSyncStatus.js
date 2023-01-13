import React from 'react';
import { connect } from 'react-redux';
import { useTransition, animated } from 'react-spring';

import * as actions from 'loot-core/src/client/actions';
import { View, Text } from 'loot-design/src/components/common';
import { colors, styles } from 'loot-design/src/style';

import AnimatedRefresh from './AnimatedRefresh';

function BankSyncStatus({ accountsSyncing }) {
  let name = accountsSyncing
    ? accountsSyncing === '__all'
      ? 'accounts'
      : accountsSyncing
    : null;

  const transitions = useTransition(name, null, {
    from: { opacity: 0, transform: 'translateY(-100px)' },
    enter: { opacity: 1, transform: 'translateY(0)' },
    leave: { opacity: 0, transform: 'translateY(-100px)' },
    unique: true
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
        zIndex: 501
      }}
    >
      {transitions.map(
        ({ item, key, props }) =>
          item && (
            <animated.div key={key} style={props}>
              <View
                style={{
                  borderRadius: 4,
                  backgroundColor: colors.b9,
                  color: colors.b1,
                  padding: '5px 13px',
                  flexDirection: 'row',
                  alignItems: 'center',
                  ...styles.shadow
                }}
              >
                <AnimatedRefresh
                  animating={true}
                  iconStyle={{ color: colors.b1 }}
                />
                <Text>Syncing {item}</Text>
              </View>
            </animated.div>
          )
      )}
    </View>
  );
}

export default connect(
  state => ({
    accountsSyncing: state.account.accountsSyncing
  }),
  actions
)(BankSyncStatus);
