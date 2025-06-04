import React from 'react';
import { useTransition, animated } from 'react-spring';

import { Block } from '@actual-app/components/block';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { Background } from './Background';

import { useSelector } from '@desktop-client/redux';

type AppBackgroundProps = {
  isLoading?: boolean;
};

export function AppBackground({ isLoading }: AppBackgroundProps) {
  const loadingText = useSelector(state => state.app.loadingText);
  const showLoading = isLoading || loadingText !== null;
  const transitions = useTransition(loadingText, {
    from: { opacity: 0, transform: 'translateY(-100px)' },
    enter: { opacity: 1, transform: 'translateY(0)' },
    leave: { opacity: 0, transform: 'translateY(100px)' },
    unique: true,
  });

  return (
    <>
      <Background />

      {showLoading &&
        transitions((style, item) => (
          <animated.div key={item} style={style}>
            <View
              className={css({
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                padding: 50,
                paddingTop: 200,
                color: theme.pageText,
                alignItems: 'center',
              })}
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
