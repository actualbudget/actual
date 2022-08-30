import React from 'react';
import { View, Block } from 'loot-design/src/components/common';
import { css } from 'glamor';
import AnimatedLoading from 'loot-design/src/svg/v1/AnimatedLoading';
import { colors } from 'loot-design/src/style';
import Background from './Background';

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
