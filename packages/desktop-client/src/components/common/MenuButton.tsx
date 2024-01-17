// @ts-strict-ignore
import React from 'react';

import { SvgDotsHorizontalTriple } from '../../icons/v1';

import { Button } from './Button';

export function MenuButton({ onClick, style }) {
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
