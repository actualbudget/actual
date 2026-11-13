import type { ReactNode } from 'react';

import { css } from '@emotion/css';

import { Button } from '#Button';
import type { CSSProperties } from '#styles';
import { theme } from '#theme';

type ModeButtonProps = {
  selected: boolean;
  children: ReactNode;
  style?: CSSProperties;
  onSelect: () => void;
  isDisabled?: boolean;
};

export function ModeButton({
  selected,
  children,
  style,
  onSelect,
  isDisabled,
}: ModeButtonProps) {
  return (
    <Button
      variant="bare"
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
      isDisabled={isDisabled}
    >
      {children}
    </Button>
  );
}
