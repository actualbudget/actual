import React, { type MutableRefObject, useRef, useState } from 'react';
import { useMove } from 'react-aria';

import { useColumnWidth } from './ColumnWidthContext';
import './Resizer.css';
import { Menu } from './common/Menu';
import { Popover } from './common/Popover';

type ResizerProps = {
  columnName: string;
  resizeRef: MutableRefObject<HTMLDivElement>;
};

export function Resizer({ columnName, resizeRef }: ResizerProps) {
  const { handleMoveProps, handleDoubleClick, removeColumn } = useColumnWidth();
  const resizerRef = useRef<HTMLDivElement | null>(null);
  const { moveProps } = useMove(
    handleMoveProps(columnName, resizeRef, resizerRef),
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <div
        {...moveProps}
        ref={resizerRef}
        onDoubleClick={() => handleDoubleClick(columnName, resizeRef)}
        onContextMenu={e => {
          e.preventDefault();
          setIsMenuOpen(true);
        }}
        className="resizer-container"
      />
      <Popover
        triggerRef={resizerRef}
        isOpen={isMenuOpen}
        onOpenChange={() => {
          setIsMenuOpen(false);
        }}
      >
        <Menu
          onMenuSelect={itemName => {
            if (itemName === 'reset-column') {
              removeColumn(columnName);
            }
            setIsMenuOpen(false);
          }}
          items={[
            {
              name: 'reset-column',
              text: `Reset column ‘${columnName}’`,
            },
          ]}
        />
      </Popover>
    </>
  );
}
