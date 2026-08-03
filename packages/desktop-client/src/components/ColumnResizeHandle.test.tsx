import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ColumnWidthsProvider } from '#hooks/useColumnWidths';

import { ColumnResizeHandle } from './ColumnResizeHandle';

vi.mock('#hooks/useMetadataPref', () => ({
  useMetadataPref: () => ['test-budget', vi.fn()],
}));

const defaultWidths = {
  date: 110,
  payee: 'flex',
  notes: 'flex',
  payment: 100,
  deposit: 100,
} as const;

const columnOrder = ['date', 'payee', 'notes', 'payment', 'deposit'];

function renderHandle(columnName = 'date') {
  const utils = render(
    <div data-testid="wrapper">
      <ColumnWidthsProvider
        tableId="test"
        defaultWidths={defaultWidths}
        columnOrder={columnOrder}
      >
        <div data-column={columnName}>
          <ColumnResizeHandle columnName={columnName} />
        </div>
      </ColumnWidthsProvider>
    </div>,
  );
  return {
    handle: utils.getByTestId(`resize-handle-${columnName}`),
    // The provider's container div carries the inline --col-* custom props.
    // Query it lazily because React replaces the element on re-render during
    // a resize, which would otherwise leave a captured reference stale.
    getContainer: () =>
      utils
        .getByTestId('wrapper')
        .querySelector('[style*="--col-"]') as HTMLElement,
    ...utils,
  };
}

describe('ColumnResizeHandle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });

  it('renders an accessible resize handle', () => {
    const { handle } = renderHandle();
    expect(handle).toBeInTheDocument();
    expect(handle).toHaveAttribute('data-resize-handle');
    expect(handle).toHaveAttribute('role', 'separator');
    expect(handle).toHaveAttribute('aria-orientation', 'vertical');
    expect(handle).toHaveAttribute('aria-label');
    expect(handle).toHaveAttribute('tabindex', '0');
    expect(handle).toHaveAttribute('aria-valuenow', '110');
    expect(handle.style.cursor).toBe('col-resize');
  });

  it('starts, moves, and ends a drag via pointer events', () => {
    const { handle, getContainer } = renderHandle();

    fireEvent.pointerDown(handle, { clientX: 100 });
    expect(document.body.style.cursor).toBe('col-resize');
    expect(document.body.style.userSelect).toBe('none');

    // The width should be applied to the container via CSS vars during drag.
    fireEvent.pointerMove(handle, { clientX: 130 });
    expect(getContainer().style.getPropertyValue('--col-date-width')).toBe(
      '140px',
    );

    fireEvent.pointerUp(handle, { clientX: 130 });
    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
  });

  it('does not resize on pointer moves without a drag in progress', () => {
    const { handle, getContainer } = renderHandle();

    fireEvent.pointerMove(handle, { clientX: 200 });
    expect(getContainer().style.getPropertyValue('--col-date-width')).toBe(
      '110px',
    );
  });

  it('clamps the drag at the minimum column width', () => {
    const { handle, getContainer } = renderHandle('payment');

    fireEvent.pointerDown(handle, { clientX: 100 });
    fireEvent.pointerMove(handle, { clientX: -400 });
    expect(getContainer().style.getPropertyValue('--col-payment-width')).toBe(
      '30px',
    );

    fireEvent.pointerUp(handle, { clientX: -400 });
  });

  it('restores the body state when the drag is cancelled', () => {
    const { handle } = renderHandle();

    fireEvent.pointerDown(handle, { clientX: 100 });
    expect(document.body.style.cursor).toBe('col-resize');

    fireEvent.pointerCancel(handle);
    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
  });

  it('cleans up a repeated pointerdown with a single pointerup', () => {
    const { handle } = renderHandle();

    fireEvent.pointerDown(handle, { clientX: 100 });
    fireEvent.pointerDown(handle, { clientX: 200 });
    fireEvent.pointerUp(handle, { clientX: 200 });

    // A stray pointerup afterwards must not end an already-finished drag
    fireEvent.pointerUp(handle, { clientX: 200 });
    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
  });

  it('resizes with the keyboard arrow keys', () => {
    const { handle, getContainer } = renderHandle();

    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(getContainer().style.getPropertyValue('--col-date-width')).toBe(
      '120px',
    );

    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(getContainer().style.getPropertyValue('--col-date-width')).toBe(
      '110px',
    );

    const saved = JSON.parse(
      localStorage.getItem('test-budget-columnWidths-test')!,
    );
    expect(saved).toMatchObject({ date: 110 });
  });

  it('resets the column width on double click', () => {
    const { handle, getContainer } = renderHandle();

    fireEvent.pointerDown(handle, { clientX: 100 });
    fireEvent.pointerMove(handle, { clientX: 200 });
    fireEvent.pointerUp(handle, { clientX: 200 });
    expect(getContainer().style.getPropertyValue('--col-date-width')).toBe(
      '210px',
    );

    fireEvent.doubleClick(handle);
    expect(getContainer().style.getPropertyValue('--col-date-width')).toBe(
      '110px',
    );
  });

  it('renders nothing when there is no column-widths context', () => {
    render(
      <div>
        <ColumnResizeHandle columnName="date" />
      </div>,
    );
    expect(screen.queryByTestId('resize-handle-date')).not.toBeInTheDocument();
  });
});
