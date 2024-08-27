import React, { DOMAttributes, MutableRefObject, useRef } from 'react';
import { useMove } from 'react-aria';
import { useColumnWidth } from './ColumnWidthContext';
import "./Resizer.css"

type ResizerProps = {
  columnName: string;
  resizeRef: MutableRefObject<HTMLDivElement>;
};

export function Resizer({ columnName, resizeRef }: ResizerProps) {
  const { handleMoveProps } = useColumnWidth();
  const resizerRef = useRef();
  let { moveProps } = useMove(handleMoveProps(columnName, resizeRef, resizerRef));

  return (
    <div
      {...moveProps}
      ref={resizerRef}
      className='resizer-container'
    />
  );
}
