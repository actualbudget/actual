import React, { type MutableRefObject, useRef } from 'react';
import { useMove } from 'react-aria';

import { useColumnWidth } from './ColumnWidthContext';
import './Resizer.css';

type ResizerProps = {
  columnName: string;
  resizeRef: MutableRefObject<HTMLDivElement>;
};

export function Resizer({ columnName, resizeRef }: ResizerProps) {
  const { handleMoveProps, handleDoubleClick } = useColumnWidth();
  const resizerRef = useRef<HTMLDivElement | null>(null);
  const { moveProps } = useMove(
    handleMoveProps(columnName, resizeRef, resizerRef),
  );

  return (
    <div
      {...moveProps}
      ref={resizerRef}
      onDoubleClick={() => handleDoubleClick(columnName, resizeRef)}
      className="resizer-container"
    />
  );
}
