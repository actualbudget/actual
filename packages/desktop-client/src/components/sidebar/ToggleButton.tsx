import React, { type MouseEventHandler } from 'react';

import Pin from '../../icons/v1/Pin';
import ArrowButtonLeft1 from '../../icons/v2/ArrowButtonLeft1';
import { type CSSProperties, theme } from '../../style';
import { Button } from '../common/Button';
import { View } from '../common/View';

type ToggleButtonProps = {
  isFloating: boolean;
  onFloat: MouseEventHandler<HTMLButtonElement>;
  style?: CSSProperties;
};

function ToggleButton({ style, isFloating, onFloat }: ToggleButtonProps) {
  return (
    <View className="float" style={{ ...style, flexShrink: 0 }}>
      <Button
        type="bare"
        aria-label={`${isFloating ? 'Pin' : 'Unpin'} sidebar`}
        onClick={onFloat}
        color={theme.buttonMenuBorder}
      >
        {isFloating ? (
          <Pin
            style={{
              margin: -2,
              width: 15,
              height: 15,
              transform: 'rotate(45deg)',
            }}
          />
        ) : (
          <ArrowButtonLeft1 style={{ width: 13, height: 13 }} />
        )}
      </Button>
    </View>
  );
}

export default ToggleButton;
