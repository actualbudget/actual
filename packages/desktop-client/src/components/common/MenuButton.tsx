import React from 'react';

import { SvgDotsHorizontalTriple } from '../../icons/v1';
import { type CSSProperties } from '../../style';

import { Button } from './Button';

export function MenuButton({
  onClick,
  style,
}: {
  onClick: () => void;
  style?: CSSProperties;
}) {
  return (
    <Button type="bare" onClick={onClick} aria-label="Menu" style={style}>
      <SvgDotsHorizontalTriple
        width={15}
        height={15}
        style={{ transform: 'rotateZ(90deg)' }}
      />
    </Button>
  );
}
