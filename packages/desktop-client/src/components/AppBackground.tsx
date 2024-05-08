import React from 'react';
import { useTransition, animated } from 'react-spring';

import { css } from 'glamor';

import { AnimatedLoading } from '../icons/AnimatedLoading';
import { theme } from '../style';

import { Background } from './Background';
import { Block } from './common/Block';
import { View } from './common/View';

type AppBackgroundProps = {
  initializing?: boolean;
  loadingText?: string;
};

export function AppBackground({
  initializing,
  loadingText,
}: AppBackgroundProps) {
  const transitions = useTransition(loadingText, {
    from: { opacity: 0, transform: 'translateY(-100px)' },
    enter: { opacity: 1, transform: 'translateY(0)' },
    leave: { opacity: 0, transform: 'translateY(100px)' },
    unique: true,
  });

  return (
    <>
      <Background />

      {(loadingText != null || initializing) &&
        transitions((style, item) => (
          <animated.div key={item} style={style}>
            <View
              className={`${css({
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                padding: 50,
                paddingTop: 200,
                color: theme.pageText,
                alignItems: 'center',
              })}`}
            >
              <Block style={{ marginBottom: 20, fontSize: 18 }}>
                {loadingText}
              </Block>
              <AnimatedLoading width={25} color={theme.pageText} />
            </View>
          </animated.div>
        ))}
    </>
  );
}
