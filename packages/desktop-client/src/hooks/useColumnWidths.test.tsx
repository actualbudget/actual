import React from 'react';
import type { ReactNode } from 'react';

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ColumnWidthsProvider,
  useColumnWidthsContext,
} from './useColumnWidths';

const { budgetIdRef } = vi.hoisted(() => ({
  budgetIdRef: { current: 'test-budget' },
}));

vi.mock('./useMetadataPref', () => ({
  useMetadataPref: () => [budgetIdRef.current, vi.fn()],
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
    budgetIdRef.current = 'test-budget';
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
    const saved = JSON.parse(
      localStorage.getItem('test-budget-columnWidths-test')!,
    );
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

  it('preserves the total width when the neighbor hits its minimum', () => {
    const { result } = renderHook(() => useColumnWidthsContext(), {
      wrapper,
    });
    const ctx = result.current!;
    const container = createContainer(defaultWidths);
    act(() => ctx.setContainerRef(container));

    // Dragging 200px wide: the deposit neighbor would drop to -100, so the
    // payment column is capped at 100 + (100 - 30) = 170 instead of growing
    // unbounded. The two columns always total 200px.
    act(() => ctx.onResizeStart('payment', 100));
    act(() => ctx.onResize('payment', 300));
    act(() => ctx.onResizeEnd());

    expect(container.style.getPropertyValue('--col-payment-width')).toBe(
      '170px',
    );
    expect(container.style.getPropertyValue('--col-deposit-width')).toBe(
      '30px',
    );
  });

  it('does not pin a flex neighbor to a fixed width', () => {
    const { result } = renderHook(() => useColumnWidthsContext(), {
      wrapper,
    });
    const ctx = result.current!;
    const container = createContainer(defaultWidths);
    act(() => ctx.setContainerRef(container));

    // The date column's neighbor is the flex payee column; flex columns
    // reflow automatically, so no compensation is applied anywhere.
    act(() => ctx.onResizeStart('date', 100));
    act(() => ctx.onResize('date', 200));
    act(() => ctx.onResizeEnd());

    expect(container.style.getPropertyValue('--col-date-width')).toBe('210px');
    expect(container.style.getPropertyValue('--col-payee-width')).toBe('');
    expect(container.style.getPropertyValue('--col-payment-width')).toBe(
      '100px',
    );
  });

  it('falls back to a sane width when a flex column cannot be measured', () => {
    const { result } = renderHook(() => useColumnWidthsContext(), {
      wrapper,
    });
    const ctx = result.current!;
    const container = createContainer(defaultWidths);
    act(() => ctx.setContainerRef(container));

    // jsdom measures all elements as 0px, which must not become the starting
    // drag width — that would let a drag persist a 0px column.
    act(() => ctx.onResizeStart('payee', 100));
    act(() => ctx.onResize('payee', 130));
    act(() => ctx.onResizeEnd());

    expect(container.style.getPropertyValue('--col-payee-width')).toBe('130px');
    const saved = JSON.parse(
      localStorage.getItem('test-budget-columnWidths-test')!,
    );
    expect(saved).toMatchObject({ payee: 130 });
  });

  it('finds the neighbor using the visible column order', () => {
    // The user reordered the columns so deposit sits directly after date
    const reordered = ['date', 'deposit', 'payment'];
    const { result } = renderHook(() => useColumnWidthsContext(), {
      wrapper: ({ children }) => (
        <ColumnWidthsProvider
          tableId="test"
          defaultWidths={defaultWidths}
          columnOrder={reordered}
        >
          {children}
        </ColumnWidthsProvider>
      ),
    });
    const ctx = result.current!;
    const container = createContainer(defaultWidths);
    act(() => ctx.setContainerRef(container));

    act(() => ctx.onResizeStart('date', 100));
    act(() => ctx.onResize('date', 150));
    act(() => ctx.onResizeEnd());

    // The visible neighbor is deposit, not payment (which is date's neighbor
    // in the default order)
    expect(container.style.getPropertyValue('--col-date-width')).toBe('160px');
    expect(container.style.getPropertyValue('--col-deposit-width')).toBe(
      '50px',
    );
    expect(container.style.getPropertyValue('--col-payment-width')).toBe(
      '100px',
    );
  });

  it('keeps the live width when the provider re-renders mid-drag', () => {
    const { result, rerender } = renderHook(() => useColumnWidthsContext(), {
      wrapper,
    });
    const ctx = result.current!;
    const container = createContainer(defaultWidths);
    act(() => ctx.setContainerRef(container));

    act(() => ctx.onResizeStart('date', 100));
    act(() => ctx.onResize('date', 150));
    expect(container.style.getPropertyValue('--col-date-width')).toBe('160px');

    // Any re-render of the provider must not overwrite the in-flight width
    // with the stale state value
    act(() => rerender());
    expect(container.style.getPropertyValue('--col-date-width')).toBe('160px');
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
    const saved = JSON.parse(
      localStorage.getItem('test-budget-columnWidths-test')!,
    );
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
    // The override is deleted so future default changes can apply
    const saved = JSON.parse(
      localStorage.getItem('test-budget-columnWidths-test')!,
    );
    expect(saved).toEqual({});
  });

  it('re-hydrates saved widths when the budget changes', () => {
    localStorage.setItem(
      'other-budget-columnWidths-test',
      JSON.stringify({ date: 150 }),
    );
    const { result, rerender } = renderHook(() => useColumnWidthsContext(), {
      wrapper,
    });
    expect(result.current!.widths.date).toBe(110);

    act(() => {
      budgetIdRef.current = 'other-budget';
    });
    act(() => {
      rerender();
    });

    expect(result.current!.widths.date).toBe(150);
    // The previous budget's widths must not leak through
    expect(result.current!.widths.deposit).toBe(100);
  });

  it('validates and clamps persisted widths on load', () => {
    localStorage.setItem(
      'test-budget-columnWidths-test',
      JSON.stringify({
        date: 10,
        payment: 'wide',
        deposit: Number.MAX_VALUE * 2,
        unknown: 300,
      }),
    );
    const { result } = renderHook(() => useColumnWidthsContext(), {
      wrapper,
    });

    // Clamped to the minimum; invalid values and unknown columns are dropped
    expect(result.current!.widths.date).toBe(30);
    expect(result.current!.widths.payment).toBe(100);
    expect(result.current!.widths.deposit).toBe(100);
    expect(result.current!.widths.unknown).toBeUndefined();
  });
});
