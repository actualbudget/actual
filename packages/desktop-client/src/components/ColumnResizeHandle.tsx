import { useEffect, useRef } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';

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
  const { t } = useTranslation();

  // Holds the teardown for the document-level drag listeners. The unmount
  // effect below calls it if the component disappears mid-drag. The effect
  // has empty deps so it never re-fires during a drag.
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  if (!context) return null;

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    context.onResizeStart(columnName, e.clientX);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    // Track the drag on the document. The drag continues when the pointer
    // leaves the handle. It ends when the pointer is released outside the
    // browser window
    const onPointerMove = (ev: PointerEvent) => {
      context.onResize(columnName, ev.clientX);
    };
    const cleanup = () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerEnd);
      document.removeEventListener('pointercancel', onPointerEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    const onPointerEnd = () => {
      cleanup();
      cleanupRef.current = null;
      context.onResizeEnd();
    };
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerEnd);
    document.addEventListener('pointercancel', onPointerEnd);
    cleanupRef.current = cleanup;
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    e.stopPropagation();

    const delta = (e.key === 'ArrowRight' ? 1 : -1) * KEYBOARD_RESIZE_STEP;
    context.setColumnWidth(
      columnName,
      context.getColumnWidth(columnName) + delta,
    );
  };

  const onDoubleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    context.onResetWidth(columnName);
  };

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
        borderRight: `1px solid ${theme.tableBorder}`,
        touchAction: 'none',
      }}
    />
  );
}
