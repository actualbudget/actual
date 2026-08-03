import { useCallback, useEffect, useRef } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { useTranslation } from 'react-i18next';

import {
  MIN_COLUMN_WIDTH,
  useColumnWidthsContext,
} from '#hooks/useColumnWidths';

const KEYBOARD_RESIZE_STEP = 10;

type ColumnResizeHandleProps = {
  columnName: string;
};

export function ColumnResizeHandle({ columnName }: ColumnResizeHandleProps) {
  const context = useColumnWidthsContext();
  const isDraggingRef = useRef(false);
  const { t } = useTranslation();

  // The context value changes when a resize starts (the provider updates its
  // state), so endDrag must not depend on it or its identity would change
  // mid-drag and trigger the unmount cleanup — which would cancel the drag
  const contextRef = useRef(context);
  contextRef.current = context;

  const endDrag = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    contextRef.current?.onResizeEnd();
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    return () => {
      endDrag();
    };
  }, [endDrag]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!context || (e.button != null && e.button !== 0)) return;
      e.preventDefault();
      e.stopPropagation();

      // Cancel any in-flight drag before starting a new one so a repeated
      // pointerdown can never leave a stuck drag state
      endDrag();

      context.onResizeStart(columnName, e.clientX);
      isDraggingRef.current = true;

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Pointer capture is not available (e.g. jsdom); pointermove and
        // pointerup are still handled by this element
      }

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [columnName, context, endDrag],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || !context) return;
      context.onResize(columnName, e.clientX);
    },
    [columnName, context],
  );

  const onPointerEnd = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      endDrag();
    },
    [endDrag],
  );

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (!context || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();

      const delta = (e.key === 'ArrowRight' ? 1 : -1) * KEYBOARD_RESIZE_STEP;
      context.onResizeStart(columnName, 0);
      context.onResize(columnName, delta);
      context.onResizeEnd();
    },
    [columnName, context],
  );

  const onDoubleClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      context?.onResetWidth(columnName);
    },
    [columnName, context],
  );

  if (!context) return null;

  const width = context.widths[columnName];

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={t('Resize column')}
      aria-valuenow={typeof width === 'number' ? Math.round(width) : undefined}
      aria-valuemin={typeof width === 'number' ? MIN_COLUMN_WIDTH : undefined}
      tabIndex={0}
      data-testid={`resize-handle-${columnName}`}
      data-resize-handle
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onKeyDown={onKeyDown}
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
        touchAction: 'none',
      }}
    />
  );
}
