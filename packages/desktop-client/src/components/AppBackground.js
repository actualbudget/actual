import React from 'react';

import { css } from 'glamor';

import AnimatedLoading from '../icons/AnimatedLoading';
import { theme } from '../style';

import Background from './Background';
import Block from './common/Block';
import View from './common/View';

function AppBackground({ initializing, loadingText }) {
  return (
    <>
      <Background />

      {(loadingText != null || initializing) && (
        <View
          {...css({
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
      )}
    </>
  );
}

export default AppBackground;
