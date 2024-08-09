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
  const displayOp = friendlyOp(op);
  return (
    <Button
      variant="bare"
      aria-label={`${displayOp} op`}
      style={({ isHovered, isPressed }) => ({
        marginBottom: 5,
        ...style,
        ...(selected
          ? {
              color: theme.pillTextSelected,
              backgroundColor: theme.pillBackgroundSelected,
            }
          : isHovered || isPressed
            ? {
                backgroundColor: theme.pillBackgroundHover,
              }
            : {
                backgroundColor: theme.pillBackground,
              }),
      })}
      onPress={onClick}
    >
      {displayOp}
    </Button>
  );
}
