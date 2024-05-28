import React, { forwardRef } from 'react';

import { SvgDotsHorizontalTriple } from '../../icons/v1';
import { type CSSProperties } from '../../style';

import { Button } from './Button';

type MenuButtonProps = {
  onClick: () => void;
  style?: CSSProperties;
};

export const MenuButton = forwardRef<HTMLButtonElement, MenuButtonProps>(
  ({ onClick, style }, ref) => {
    return (
      <Button
        ref={ref}
        type="bare"
        onClick={onClick}
        aria-label="Menu"
        style={style}
      >
        <SvgDotsHorizontalTriple
          width={15}
          height={15}
          style={{ transform: 'rotateZ(90deg)' }}
        />
      </Button>
    );
  },
);

MenuButton.displayName = 'MenuButton';
