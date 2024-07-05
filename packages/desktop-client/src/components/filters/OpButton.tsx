import React from 'react';

import { friendlyOp } from 'loot-core/src/shared/rules';

import { type CSSProperties, theme } from '../../style';
import { Button } from '../common/Button2';

type OpButtonProps = {
  op: string;
  selected: boolean;
  onClick: () => void;
  style?: CSSProperties;
};

export function OpButton({ op, selected, style, onClick }: OpButtonProps) {
  return (
    <Button
      variant="bare"
      style={({ isHovered, isPressed }) => ({
        backgroundColor: theme.pillBackground,
        marginBottom: 5,
        ...style,
        ...(selected && {
          color: theme.buttonNormalSelectedText,
          ...(isHovered || isPressed
            ? {
                backgroundColor: theme.buttonNormalSelectedBackground,
                color: theme.buttonNormalSelectedText,
              }
            : {}),
        }),
      })}
      onPress={onClick}
    >
      {friendlyOp(op)}
    </Button>
  );
}
