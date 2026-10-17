import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';

import { useColumnWidthsContext } from '#hooks/useColumnWidths';

const KEYBOARD_RESIZE_STEP = 10;

type ColumnResizeHandleProps = {
  columnName: string;
  /** The column's visible header text, for the handle's accessible name. */
  label?: string;
};

type Measurement = { width: number; rowWidth: number };

// The column's rendered width, and the row's as the most it could grow to.
// Measured rather than read from the context because a flex column has no
// pixel width there, and a focusable separator must report a value.
function useColumnMeasurement() {
  const ref = useRef<HTMLDivElement>(null);
  const [measurement, setMeasurement] = useState<Measurement | null>(null);

  useLayoutEffect(() => {
    const column = ref.current?.parentElement;
    const row = column?.parentElement;
    if (!column || !row) return;
    const measure = () => {
      const width = Math.round(column.getBoundingClientRect().width);
      const rowWidth = Math.round(row.getBoundingClientRect().width);
      setMeasurement(prev =>
        prev?.width === width && prev.rowWidth === rowWidth
          ? prev
          : { width, rowWidth },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(column);
    observer.observe(row);
    return () => observer.disconnect();
  }, []);

  return { ref, measurement };
}

export function ColumnResizeHandle({
  columnName,
  label,
}: ColumnResizeHandleProps) {
  const context = useColumnWidthsContext();
  const { t } = useTranslation();
  const { ref, measurement } = useColumnMeasurement();

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
    context.resizeColumnBy(columnName, delta);
  };

  const onDoubleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    context.onResetWidth(columnName);
  };

  const minWidth = context.getMinWidth(columnName);

  return (
    <div
      ref={ref}
      role="separator"
      aria-orientation="vertical"
      aria-label={
        label
          ? t('Resize {{column}} column', { column: label })
          : t('Resize column')
      }
      aria-valuenow={measurement?.width}
      aria-valuemin={minWidth}
      aria-valuemax={
        measurement ? Math.max(minWidth, measurement.rowWidth) : undefined
      }
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
