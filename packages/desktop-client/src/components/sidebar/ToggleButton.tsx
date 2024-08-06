import React, { type ComponentPropsWithoutRef } from 'react';

import { SvgPin } from '../../icons/v1';
import { SvgArrowButtonLeft1 } from '../../icons/v2';
import { type CSSProperties, theme } from '../../style';
import { Button } from '../common/Button2';
import { View } from '../common/View';

type ToggleButtonProps = {
  isFloating: boolean;
  onFloat: ComponentPropsWithoutRef<typeof Button>['onPress'];
  style?: CSSProperties;
};

export function ToggleButton({
  style,
  isFloating,
  onFloat,
}: ToggleButtonProps) {
  return (
    <View className="float" style={{ ...style, flexShrink: 0 }}>
      <Button
        variant="bare"
        aria-label={`${isFloating ? 'Pin' : 'Unpin'} sidebar`}
        onPress={onFloat}
        style={{ color: theme.buttonMenuBorder }}
      >
        {isFloating ? (
          <SvgPin
            style={{
              margin: -2,
              width: 15,
              height: 15,
              transform: 'rotate(45deg)',
            }}
          />
        ) : (
          <SvgArrowButtonLeft1 style={{ width: 13, height: 13 }} />
        )}
      </Button>
    </View>
  );
}
