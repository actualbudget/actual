import React, { type MouseEventHandler, type ReactNode } from 'react';

import { type CSSProperties, theme } from '../../style';
import { Button } from '../common/Button';

type ModeButtonProps = {
  selected: boolean;
  children: ReactNode;
  style?: CSSProperties;
  onSelect: MouseEventHandler<HTMLButtonElement>;
};

export function ModeButton({
  selected,
  children,
  style,
  onSelect,
}: ModeButtonProps) {
  return (
    <Button
      type="bare"
      style={{
        padding: '5px 10px',
        backgroundColor: theme.menuBackground,
        marginRight: 5,
        fontSize: 'inherit',
        ...(selected && {
          backgroundColor: theme.buttonPrimaryBackground,
          color: theme.buttonPrimaryText,
          ':hover': {
            backgroundColor: theme.buttonPrimaryBackgroundHover,
            color: theme.buttonPrimaryTextHover,
          },
        }),
        ...style,
      }}
      onClick={onSelect}
    >
      {children}
    </Button>
  );
}
