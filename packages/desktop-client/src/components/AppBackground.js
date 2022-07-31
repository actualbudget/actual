import React, { useState } from 'react';
import { View, Block } from '@actual-app/loot-design/src/components/common';
import { css } from 'glamor';
import Background from './Background';
import AnimatedLoading from '@actual-app/loot-design/src/svg/v1/AnimatedLoading';
import { colors } from '@actual-app/loot-design/src/style';

function AppBackground({ initializing, loadingText }) {
  return (
    <React.Fragment>
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
            color: colors.n1,
            alignItems: 'center'
          })}
        >
          <Block style={{ marginBottom: 20, fontSize: 18 }}>
            {loadingText}
          </Block>
          <AnimatedLoading width={25} color={colors.n1} />
        </View>
      )}
    </React.Fragment>
  );
}

export default AppBackground;
