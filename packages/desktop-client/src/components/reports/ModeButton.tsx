import React, { type ReactNode } from 'react';

import { css } from '@emotion/css';

import { type CSSProperties, theme } from '../../style';
import { Button } from '../common/Button2';

type ModeButtonProps = {
  selected: boolean;
  children: ReactNode;
  style?: CSSProperties;
  onSelect: () => void;
};

export function ModeButton({
  selected,
  children,
  style,
  onSelect,
}: ModeButtonProps) {
  return (
    <Button
      variant="bare"
      className={css({
        padding: '5px 10px',
        backgroundColor: theme.menuBackground,
        marginRight: 5,
        fontSize: 'inherit',
        ...style,
        ...(selected && {
          backgroundColor: theme.buttonPrimaryBackground,
          color: theme.buttonPrimaryText,
          ':hover': {
            backgroundColor: theme.buttonPrimaryBackgroundHover,
            color: theme.buttonPrimaryTextHover,
          },
        }),
      })}
      onPress={onSelect}
    >
      {children}
    </Button>
  );
}
