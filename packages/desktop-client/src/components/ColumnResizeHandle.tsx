import { useCallback, useEffect, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';

import { useColumnWidthsContext } from '#hooks/useColumnWidths';

type ColumnResizeHandleProps = {
  columnName: string;
};

export function ColumnResizeHandle({ columnName }: ColumnResizeHandleProps) {
  const context = useColumnWidthsContext();
  const isDraggingRef = useRef(false);
  const cleanupRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  const onMouseDown = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (!context) return;
      context.onResizeStart(columnName, e.clientX);
      isDraggingRef.current = true;

      const onMouseMove = (moveEvent: globalThis.MouseEvent) => {
        if (!isDraggingRef.current) return;
        context.onResize(columnName, moveEvent.clientX);
      };

      const onMouseUp = () => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        context.onResizeEnd();
        cleanupRef.current?.();
      };

      cleanupRef.current = () => {
        if (isDraggingRef.current) {
          isDraggingRef.current = false;
          context.onResizeEnd();
        }
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        cleanupRef.current = null;
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [context, columnName],
  );

  const onDoubleClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      context?.onResetWidth(columnName);
    },
    [context, columnName],
  );

  if (!context) return null;

  return (
    <div
      data-testid={`resize-handle-${columnName}`}
      data-resize-handle
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        width: 5,
        height: '100%',
        cursor: 'col-resize',
        zIndex: 10,
        borderRight: '1px solid rgba(0, 0, 0, 0.15)',
      }}
    />
  );
}
