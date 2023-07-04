import React from 'react';

import DotsHorizontalTriple from '../../icons/v1/DotsHorizontalTriple';

import Button from './Button';

export default function MenuButton({ onClick }) {
  return (
    <Button bare onClick={onClick} aria-label="Menu">
      <DotsHorizontalTriple
        width={15}
        height={15}
        style={{ color: 'inherit', transform: 'rotateZ(90deg)' }}
      />
    </Button>
  );
}
