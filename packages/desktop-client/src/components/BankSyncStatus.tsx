import React from 'react';
import { useSelector } from 'react-redux';
import { useTransition, animated } from 'react-spring';

import { colors, styles } from '../style';

import AnimatedRefresh from './AnimatedRefresh';
import Text from './common/Text';
import View from './common/View';

export default function BankSyncStatus() {
  let accountsSyncing = useSelector(state => state.account.accountsSyncing);

  let name = accountsSyncing
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
                  backgroundColor: colors.b9,
                  color: colors.b1,
                  padding: '5px 13px',
                  flexDirection: 'row',
                  alignItems: 'center',
                  ...styles.shadow,
                }}
              >
                <AnimatedRefresh
                  animating={true}
                  iconStyle={{ color: colors.b1 }}
                />
                <Text>Syncing {item}</Text>
              </View>
            </animated.div>
          ),
      )}
    </View>
  );
}
