import type { ReactNode } from 'react';

import { css } from '@emotion/css';

import { Button } from '#Button';
import type { CSSProperties } from '#styles';
import { theme } from '#theme';

type ModeButtonProps = {
  selected: boolean;
  children: ReactNode;
  style?: CSSProperties;
  'aria-pressed'?: boolean;
  onSelect: () => void;
};

export function ModeButton({
  selected,
  children,
  style,
  'aria-pressed': ariaPressed,
  onSelect,
}: ModeButtonProps) {
  return (
    <Button
      variant="bare"
      aria-pressed={ariaPressed}
      className={css({
        padding: '5px 10px',
        backgroundColor: theme.menuBackground,
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
