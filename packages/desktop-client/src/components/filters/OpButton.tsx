import React, { type CSSProperties } from 'react';

import { Button } from '@actual-app/components/button';
import { css } from '@emotion/css';

import { friendlyOp } from 'loot-core/shared/rules';

import { theme } from '../../style';

type OpButtonProps = {
  op: string;
  isSelected: boolean;
  onPress: () => void;
  style?: CSSProperties;
};

export function OpButton({ op, isSelected, style, onPress }: OpButtonProps) {
  return (
    <Button
      variant="bare"
      style={style}
      className={css({
        backgroundColor: theme.pillBackground,
        marginBottom: 5,
        ...(isSelected && {
          color: theme.buttonNormalSelectedText,
          '&,:hover,:active': {
            backgroundColor: theme.buttonNormalSelectedBackground,
            color: theme.buttonNormalSelectedText,
          },
        }),
      })}
      onPress={onPress}
    >
      {friendlyOp(op)}
    </Button>
  );
}
