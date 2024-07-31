import React, { type MouseEventHandler, type ReactNode } from 'react';

import { type CSSProperties, theme } from '../../style';
import { Button } from '../common/Button';

type ModeButtonProps = {
  selected: boolean;
  children: ReactNode;
  style?: CSSProperties;
  onSelect: MouseEventHandler<HTMLButtonElement>;
  color?: string;
};

export function ModeButton({
  selected,
  children,
  style,
  onSelect,
  color = theme.menuBackground,
}: ModeButtonProps) {
  return (
    <Button
      type="bare"
      style={{
        padding: '5px 10px',
        backgroundColor: color,
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
