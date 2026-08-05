import React from 'react';
import type { ReactNode } from 'react';

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ColumnWidthsProvider,
  useColumnWidthsContext,
} from './useColumnWidths';

const { savedPrefs } = vi.hoisted(() => ({
  savedPrefs: new Map<string, string | undefined>(),
}));

vi.mock('./useSyncedPref', () => ({
  useSyncedPref: (key: string) => [
    savedPrefs.get(key),
    (value: string) => savedPrefs.set(key, value),
  ],
}));

const defaultWidths = {
  date: 110,
  payee: 'flex',
  notes: 'flex',
  payment: 100,
  deposit: 100,
} as const;

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
    <ColumnWidthsProvider tableId="test" defaultWidths={defaultWidths}>
      {children}
    </ColumnWidthsProvider>
  );
}

describe('useColumnWidths', () => {
  beforeEach(() => {
    savedPrefs.clear();
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
    const saved = JSON.parse(savedPrefs.get('column-widths-test')!);
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
    const saved = JSON.parse(savedPrefs.get('column-widths-test')!);
    expect(saved).toMatchObject({ payment: 30 });
  });

  it('pins a flex column at the width it is dragged to', () => {
    const { result } = renderHook(() => useColumnWidthsContext(), {
      wrapper,
    });
    const ctx = result.current!;
    const container = createContainer(defaultWidths);
    act(() => ctx.setContainerRef(container));

    // The flex payee column has no pixel width, so the drag starts from the
    // fallback width and pins the column to the dragged value
    act(() => ctx.onResizeStart('payee', 100));
    act(() => ctx.onResize('payee', 130));
    act(() => ctx.onResizeEnd());

    expect(container.style.getPropertyValue('--col-payee-width')).toBe('130px');
    const saved = JSON.parse(savedPrefs.get('column-widths-test')!);
    expect(saved).toMatchObject({ payee: 130 });
  });

  it('does not resize without an active drag', () => {
    const { result } = renderHook(() => useColumnWidthsContext(), {
      wrapper,
    });
    const ctx = result.current!;
    const container = createContainer(defaultWidths);
    act(() => ctx.setContainerRef(container));

    act(() => ctx.onResize('date', 500));
    act(() => ctx.onResizeEnd());

    expect(container.style.getPropertyValue('--col-date-width')).toBe('110px');
    expect(savedPrefs.get('column-widths-test')).toBeUndefined();
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

  it('setColumnWidth clamps and persists a direct width set', () => {
    const { result } = renderHook(() => useColumnWidthsContext(), {
      wrapper,
    });
    const ctx = result.current!;
    const container = createContainer(defaultWidths);
    act(() => ctx.setContainerRef(container));

    act(() => ctx.setColumnWidth('date', 5));

    expect(container.style.getPropertyValue('--col-date-width')).toBe('30px');
    const saved = JSON.parse(savedPrefs.get('column-widths-test')!);
    expect(saved).toMatchObject({ date: 30 });
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
    const saved = JSON.parse(savedPrefs.get('column-widths-test')!);
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
    const saved = JSON.parse(savedPrefs.get('column-widths-test')!);
    expect(saved).toEqual({});
  });

  it('re-hydrates saved widths when the pref changes', () => {
    const { result, rerender } = renderHook(() => useColumnWidthsContext(), {
      wrapper,
    });
    expect(result.current!.widths.date).toBe(110);

    act(() => {
      savedPrefs.set('column-widths-test', JSON.stringify({ date: 150 }));
    });
    act(() => {
      rerender();
    });

    expect(result.current!.widths.date).toBe(150);
    // Columns without overrides keep their defaults
    expect(result.current!.widths.deposit).toBe(100);
  });

  it('validates and clamps persisted widths on load', () => {
    savedPrefs.set(
      'column-widths-test',
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

  it('ignores a malformed persisted value', () => {
    savedPrefs.set('column-widths-test', 'not-json');
    const { result } = renderHook(() => useColumnWidthsContext(), {
      wrapper,
    });

    expect(result.current!.widths).toEqual(defaultWidths);
  });
});
