import React from 'react';

import DotsHorizontalTriple from '../../icons/v1/DotsHorizontalTriple';

import Button from './Button';

export default function MenuButton({ onClick, style }) {
  return (
    <Button type="bare" onClick={onClick} aria-label="Menu" style={style}>
      <DotsHorizontalTriple
        width={15}
        height={15}
        style={{ transform: 'rotateZ(90deg)' }}
      />
    </Button>
  );
}
