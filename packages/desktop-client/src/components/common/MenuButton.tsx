import React, { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { Button } from '@actual-app/components/button';

import { SvgDotsHorizontalTriple } from '../../icons/v1';

type MenuButtonProps = ComponentPropsWithoutRef<typeof Button>;

export const MenuButton = forwardRef<HTMLButtonElement, MenuButtonProps>(
  (props, ref) => {
    return (
      <Button ref={ref} variant="bare" aria-label="Menu" {...props}>
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
