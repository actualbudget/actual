import React, { type CSSProperties } from 'react';

import { css } from '@emotion/css';

import { friendlyOp } from 'loot-core/src/shared/rules';

import { theme } from '../../style';
import { Button } from '../common/Button2';

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
