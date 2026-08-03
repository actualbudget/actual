import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ColumnResizeHandle } from './ColumnResizeHandle';
import { ColumnWidthsProvider } from '#hooks/useColumnWidths';

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

  it('renders a resize handle with the col-resize cursor', () => {
    const { handle } = renderHandle();
    expect(handle).toBeInTheDocument();
    expect(handle).toHaveAttribute('data-resize-handle');
    expect(handle.style.cursor).toBe('col-resize');
  });

  it('starts, moves, and ends a drag on the document listeners', () => {
    const { handle, getContainer } = renderHandle();

    fireEvent.mouseDown(handle, { clientX: 100 });
    expect(document.body.style.cursor).toBe('col-resize');
    expect(document.body.style.userSelect).toBe('none');

    // The width should be applied to the container via CSS vars during drag.
    fireEvent.mouseMove(document, { clientX: 130 });
    expect(getContainer().style.getPropertyValue('--col-date-width')).toBe(
      '140px',
    );

    fireEvent.mouseUp(document, { clientX: 130 });
    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
  });

  it('clamps the drag at the minimum column width', () => {
    const { handle, getContainer } = renderHandle('payment');

    fireEvent.mouseDown(handle, { clientX: 100 });
    fireEvent.mouseMove(document, { clientX: -400 });
    expect(getContainer().style.getPropertyValue('--col-payment-width')).toBe(
      '30px',
    );

    fireEvent.mouseUp(document, { clientX: -400 });
  });

  it('resets the column width on double click', () => {
    const { handle, getContainer } = renderHandle();

    fireEvent.mouseDown(handle, { clientX: 100 });
    fireEvent.mouseMove(document, { clientX: 200 });
    fireEvent.mouseUp(document, { clientX: 200 });
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
    expect(
      screen.queryByTestId('resize-handle-date'),
    ).not.toBeInTheDocument();
  });
});
