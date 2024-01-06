import React from 'react';

import DotsHorizontalTriple from '../../icons/v1/DotsHorizontalTriple';

import { Button } from './Button';

export function MenuButton({ onClick }) {
  return (
    <Button type="bare" onClick={onClick} aria-label="Menu">
      <DotsHorizontalTriple
        width={15}
        height={15}
        style={{ transform: 'rotateZ(90deg)' }}
      />
    </Button>
  );
}
