import React from 'react';
import type { ReactNode } from 'react';

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ColumnWidthsProvider, useColumnWidthsContext } from './useColumnWidths';

vi.mock('./useMetadataPref', () => ({
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

function createContainer(widths: Record<string, number | 'flex'>) {
  const container = document.createElement('div');
  // Simulate the CSS custom properties the provider sets on the container.
  for (const [name, width] of Object.entries(widths)) {
    if (typeof width === 'number') {
      container.style.setProperty(`--col-${name}-width`, `${width}px`);
    }
  }
  return container;
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ColumnWidthsProvider
      tableId="test"
      defaultWidths={defaultWidths}
      columnOrder={columnOrder}
    >
      {children}
    </ColumnWidthsProvider>
  );
}

describe('useColumnWidths', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes widths from defaults', () => {
    const { result } = renderHook(() => useColumnWidthsContext(), {
      wrapper,
    });
    expect(result.current!.widths).toEqual(defaultWidths);
  });

  it('resizes a fixed column and persists the new width', () => {
    const { result } = renderHook(() => useColumnWidthsContext(), {
      wrapper,
    });
    const ctx = result.current!;
    const container = createContainer(defaultWidths);
    act(() => ctx.setContainerRef(container));

    // Start width is read from the container (110px default); dragging 40px
    // right from x=100 to x=140 yields 110 + 40 = 150.
    act(() => ctx.onResizeStart('date', 100));
    act(() => ctx.onResize('date', 140));
    act(() => ctx.onResizeEnd());

    expect(container.style.getPropertyValue('--col-date-width')).toBe('150px');
    const saved = JSON.parse(localStorage.getItem('test-budget-columnWidths-test')!);
    expect(saved).toMatchObject({ date: 150 });
  });

  it('clamps the width to the minimum', () => {
    const { result } = renderHook(() => useColumnWidthsContext(), {
      wrapper,
    });
    const ctx = result.current!;
    const container = createContainer(defaultWidths);
    act(() => ctx.setContainerRef(container));

    act(() => ctx.onResizeStart('payment', 100));
    act(() => ctx.onResize('payment', -500));
    act(() => ctx.onResizeEnd());

    expect(container.style.getPropertyValue('--col-payment-width')).toBe(
      '30px',
    );
  });

  it('compensates the neighbor column when a column is resized', () => {
    const { result } = renderHook(() => useColumnWidthsContext(), {
      wrapper,
    });
    const ctx = result.current!;
    const container = createContainer(defaultWidths);
    act(() => ctx.setContainerRef(container));

    // Widen the fixed payment column (100px) by 50px; the deposit column
    // should narrow by the same delta.
    act(() => ctx.onResizeStart('payment', 100));
    act(() => ctx.onResize('payment', 150));
    act(() => ctx.onResizeEnd());

    expect(container.style.getPropertyValue('--col-payment-width')).toBe(
      '150px',
    );
    expect(container.style.getPropertyValue('--col-deposit-width')).toBe(
      '50px',
    );
  });

  it('never lets the neighbor go below the minimum width', () => {
    const { result } = renderHook(() => useColumnWidthsContext(), {
      wrapper,
    });
    const ctx = result.current!;
    const container = createContainer(defaultWidths);
    act(() => ctx.setContainerRef(container));

    // Drag 200px wide: payment grows to 100 + 200 = 300, but the deposit
    // neighbor would drop to -100; it clamps at 30.
    act(() => ctx.onResizeStart('payment', 100));
    act(() => ctx.onResize('payment', 300));
    act(() => ctx.onResizeEnd());

    expect(container.style.getPropertyValue('--col-deposit-width')).toBe(
      '30px',
    );
    expect(container.style.getPropertyValue('--col-payment-width')).toBe(
      '300px',
    );
  });

  it('resets a flex column back to flex on double-click', () => {
    const { result } = renderHook(() => useColumnWidthsContext(), {
      wrapper,
    });
    const ctx = result.current!;
    const container = createContainer(defaultWidths);
    act(() => ctx.setContainerRef(container));

    // Force a width onto the flex payee column, then reset it.
    act(() => {
      container.style.setProperty('--col-payee-width', '200px');
    });
    act(() => ctx.onResetWidth('payee'));

    expect(container.style.getPropertyValue('--col-payee-width')).toBe('');
    const saved = JSON.parse(localStorage.getItem('test-budget-columnWidths-test')!);
    // Nothing else was resized, so the stored overrides object is empty.
    expect(saved).toEqual({});
  });

  it('resets a fixed column back to its default width', () => {
    const { result } = renderHook(() => useColumnWidthsContext(), {
      wrapper,
    });
    const ctx = result.current!;
    const container = createContainer(defaultWidths);
    act(() => ctx.setContainerRef(container));

    act(() => ctx.onResizeStart('date', 100));
    act(() => ctx.onResize('date', 200));
    act(() => ctx.onResizeEnd());
    expect(container.style.getPropertyValue('--col-date-width')).toBe('210px');

    act(() => ctx.onResetWidth('date'));
    expect(container.style.getPropertyValue('--col-date-width')).toBe('110px');
    const saved = JSON.parse(localStorage.getItem('test-budget-columnWidths-test')!);
    expect(saved).toMatchObject({ date: 110 });
  });
});
