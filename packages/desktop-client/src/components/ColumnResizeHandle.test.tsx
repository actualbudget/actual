import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ColumnWidthsContextValue } from '#hooks/useColumnWidths';
import type * as useColumnWidths from '#hooks/useColumnWidths';

import { ColumnResizeHandle } from './ColumnResizeHandle';

const { contextRef } = vi.hoisted(() => ({
  contextRef: { current: null as ColumnWidthsContextValue | null },
}));

vi.mock('#hooks/useColumnWidths', async importOriginal => {
  const actual = await importOriginal<typeof useColumnWidths>();
  return {
    ...actual,
    useColumnWidthsContext: () => contextRef.current,
  };
});

function makeContext(): ColumnWidthsContextValue {
  return {
    widths: { date: 110 },
    containerRef: { current: null },
    setContainerRef: vi.fn(),
    getColumnWidth: vi.fn(() => 110),
    setColumnWidth: vi.fn(),
    onResizeStart: vi.fn(),
    onResize: vi.fn(),
    onResizeEnd: vi.fn(),
    onResetWidth: vi.fn(),
  };
}

function renderHandle(columnName = 'date') {
  const utils = render(
    <div data-column={columnName}>
      <ColumnResizeHandle columnName={columnName} />
    </div>,
  );
  return {
    handle: utils.getByTestId(`resize-handle-${columnName}`),
    ...utils,
  };
}

describe('ColumnResizeHandle', () => {
  let context: ColumnWidthsContextValue;

  beforeEach(() => {
    context = makeContext();
    contextRef.current = context;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });

  it('renders an accessible resize handle', () => {
    const { handle } = renderHandle();
    expect(handle).toHaveAttribute('data-resize-handle');
    expect(handle).toHaveAttribute('role', 'separator');
    expect(handle).toHaveAttribute('aria-orientation', 'vertical');
    expect(handle).toHaveAttribute('aria-label');
    expect(handle).toHaveAttribute('tabindex', '0');
    expect(handle).toHaveAttribute('aria-valuenow', '110');
    expect(handle.style.cursor).toBe('col-resize');
  });

  it('starts a drag on pointerdown and tracks it on the document', () => {
    const { handle } = renderHandle();

    fireEvent.pointerDown(handle, { button: 0, clientX: 100 });
    expect(context.onResizeStart).toHaveBeenCalledWith('date', 100);
    expect(document.body.style.cursor).toBe('col-resize');
    expect(document.body.style.userSelect).toBe('none');

    fireEvent.pointerMove(document, { clientX: 130 });
    expect(context.onResize).toHaveBeenCalledWith('date', 130);

    fireEvent.pointerUp(document, { clientX: 130 });
    expect(context.onResizeEnd).toHaveBeenCalled();
    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');

    // A stray pointermove after the drag ended is ignored
    fireEvent.pointerMove(document, { clientX: 200 });
    expect(context.onResize).toHaveBeenCalledTimes(1);
  });

  it('ignores non-primary pointer buttons', () => {
    const { handle } = renderHandle();

    fireEvent.pointerDown(handle, { button: 2, clientX: 100 });
    expect(context.onResizeStart).not.toHaveBeenCalled();
    expect(document.body.style.cursor).toBe('');
  });

  it('resizes with the keyboard arrow keys', () => {
    const { handle } = renderHandle();

    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(context.getColumnWidth).toHaveBeenCalledWith('date');
    expect(context.setColumnWidth).toHaveBeenCalledWith('date', 120);

    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(context.setColumnWidth).toHaveBeenCalledWith('date', 100);
  });

  it('resets the column width on double click', () => {
    const { handle } = renderHandle();

    fireEvent.doubleClick(handle);
    expect(context.onResetWidth).toHaveBeenCalledWith('date');
  });

  it('renders nothing when there is no column-widths context', () => {
    contextRef.current = null;
    render(
      <div>
        <ColumnResizeHandle columnName="date" />
      </div>,
    );
    expect(screen.queryByTestId('resize-handle-date')).not.toBeInTheDocument();
  });
});
