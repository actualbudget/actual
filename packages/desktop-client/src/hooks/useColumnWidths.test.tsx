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

// A container whose child elements carry `data-column` in visual order and
// report a rendered width, like the real table header does. The resize
// logic reads the column order and flex columns' widths from this DOM.
function createColumnedContainer(entries: Array<[string, number]>) {
  const container = document.createElement('div');
  for (const [name, width] of entries) {
    const node = document.createElement('div');
    node.setAttribute('data-column', name);
    node.getBoundingClientRect = () => ({ width }) as DOMRect;
    container.appendChild(node);
  }
  return container;
}

function makeWrapper(minWidths?: Record<string, number>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ColumnWidthsProvider
        tableId="test"
        defaultWidths={defaultWidths}
        minWidths={minWidths}
      >
        {children}
      </ColumnWidthsProvider>
    );
  };
}

const wrapper = makeWrapper();

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
    const container = createColumnedContainer([
      ['date', 110],
      ['payee', 200],
      ['notes', 300],
    ]);
    act(() => ctx.setContainerRef(container));

    act(() => ctx.onResizeStart('date', 100));
    act(() => ctx.onResize('date', 140)); // +40
    act(() => ctx.onResizeEnd());

    expect(container.style.getPropertyValue('--col-date-width')).toBe('150px');
    // The width is taken from the right neighbour...
    expect(container.style.getPropertyValue('--col-payee-width')).toBe('160px');
    // ...not from anything past it
    expect(container.style.getPropertyValue('--col-notes-width')).toBe('');
    const saved = JSON.parse(savedPrefs.get('column-widths-test')!);
    expect(saved).toEqual({ date: 150, payee: 160 });
  });

  it('cascades the shrink to the next column when the neighbour bottoms out', () => {
    const { result } = renderHook(() => useColumnWidthsContext(), {
      wrapper,
    });
    const ctx = result.current!;
    const container = createColumnedContainer([
      ['date', 110],
      ['payee', 60],
      ['notes', 300],
    ]);
    act(() => ctx.setContainerRef(container));

    act(() => ctx.onResizeStart('date', 100));
    act(() => ctx.onResize('date', 160)); // +60: payee only has 10px of room
    act(() => ctx.onResizeEnd());

    expect(container.style.getPropertyValue('--col-date-width')).toBe('170px');
    expect(container.style.getPropertyValue('--col-payee-width')).toBe('50px');
    expect(container.style.getPropertyValue('--col-notes-width')).toBe('250px');
    expect(JSON.parse(savedPrefs.get('column-widths-test')!)).toEqual({
      date: 170,
      payee: 50,
      notes: 250,
    });
  });

  it('cascades the shrink left when widening a column to the right', () => {
    const { result } = renderHook(() => useColumnWidthsContext(), {
      wrapper,
    });
    const ctx = result.current!;
    // order: date, account, payee, notes, category, payment
    const container = createColumnedContainer([
      ['date', 110],
      ['account', 120],
      ['payee', 200],
      ['notes', 200],
      ['category', 60],
      ['payment', 150],
    ]);
    act(() => ctx.setContainerRef(container));

    // Dragging the category/payment divider left widens payment and takes
    // width from category, then notes, then payee.
    act(() => ctx.onResizeStart('category', 100));
    act(() => ctx.onResize('category', -100)); // -200
    act(() => ctx.onResizeEnd());

    expect(container.style.getPropertyValue('--col-category-width')).toBe(
      '50px',
    );
    expect(container.style.getPropertyValue('--col-notes-width')).toBe('50px');
    expect(container.style.getPropertyValue('--col-payee-width')).toBe('160px');
    expect(container.style.getPropertyValue('--col-payment-width')).toBe(
      '350px',
    );
    // Columns to the left of the whole shrinking run are untouched
    expect(container.style.getPropertyValue('--col-account-width')).toBe('');
  });

  it('stops at the floor when the whole shrinking side is exhausted', () => {
    const { result } = renderHook(() => useColumnWidthsContext(), {
      wrapper,
    });
    const ctx = result.current!;
    const container = createColumnedContainer([
      ['date', 110],
      ['payee', 50],
    ]);
    act(() => ctx.setContainerRef(container));

    act(() => ctx.onResizeStart('date', 100));
    act(() => ctx.onResize('date', 400));
    act(() => ctx.onResizeEnd());

    expect(container.style.getPropertyValue('--col-date-width')).toBe('110px');
    // The untouched flex column goes back to flexing
    expect(container.style.getPropertyValue('--col-payee-width')).toBe('');
    expect(savedPrefs.get('column-widths-test')).toBeUndefined();
  });

  it('uses per-column minimum widths', () => {
    const { result } = renderHook(() => useColumnWidthsContext(), {
      wrapper: makeWrapper({ payee: 120 }),
    });
    const ctx = result.current!;
    const container = createColumnedContainer([
      ['date', 110],
      ['payee', 200],
    ]);
    act(() => ctx.setContainerRef(container));

    act(() => ctx.onResizeStart('date', 100));
    act(() => ctx.onResize('date', 300)); // payee has 200 - 120 = 80px of room
    act(() => ctx.onResizeEnd());

    expect(container.style.getPropertyValue('--col-date-width')).toBe('190px');
    expect(container.style.getPropertyValue('--col-payee-width')).toBe('120px');
  });

  it('starts a flex-column drag from its rendered width, not a fallback', () => {
    const { result } = renderHook(() => useColumnWidthsContext(), {
      wrapper,
    });
    const ctx = result.current!;
    const container = createColumnedContainer([
      ['payee', 240],
      ['notes', 400],
    ]);
    act(() => ctx.setContainerRef(container));

    act(() => ctx.onResizeStart('payee', 100));
    act(() => ctx.onResize('payee', 130)); // +30
    act(() => ctx.onResizeEnd());

    // 240 (rendered) + 30, not 100 (fallback) + 30
    expect(container.style.getPropertyValue('--col-payee-width')).toBe('270px');
    expect(container.style.getPropertyValue('--col-notes-width')).toBe('370px');
  });

  it('does not resize or persist when a column is clicked without dragging', () => {
    const { result } = renderHook(() => useColumnWidthsContext(), {
      wrapper,
    });
    const ctx = result.current!;
    const container = createColumnedContainer([
      ['date', 110],
      ['payee', 200],
    ]);
    act(() => ctx.setContainerRef(container));

    act(() => ctx.onResizeStart('date', 100));
    act(() => ctx.onResizeEnd());

    expect(container.style.getPropertyValue('--col-date-width')).toBe('110px');
    // The temporarily pinned flex neighbour goes back to flexing
    expect(container.style.getPropertyValue('--col-payee-width')).toBe('');
    expect(result.current!.widths.payee).toBe('flex');
    expect(savedPrefs.get('column-widths-test')).toBeUndefined();
  });

  it('resizes with the keyboard using the same split resize', () => {
    const { result } = renderHook(() => useColumnWidthsContext(), {
      wrapper,
    });
    const ctx = result.current!;
    const container = createColumnedContainer([
      ['date', 110],
      ['payee', 200],
    ]);
    act(() => ctx.setContainerRef(container));

    act(() => ctx.resizeColumnBy('date', 10));

    expect(container.style.getPropertyValue('--col-date-width')).toBe('120px');
    expect(container.style.getPropertyValue('--col-payee-width')).toBe('190px');
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
    const container = createColumnedContainer([
      ['date', 110],
      ['payee', 200],
    ]);
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

    expect(container.style.getPropertyValue('--col-date-width')).toBe('50px');
    const saved = JSON.parse(savedPrefs.get('column-widths-test')!);
    expect(saved).toMatchObject({ date: 50 });
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
    const container = createColumnedContainer([
      ['date', 110],
      ['payee', 200],
    ]);
    act(() => ctx.setContainerRef(container));

    act(() => ctx.onResizeStart('date', 100));
    act(() => ctx.onResize('date', 200));
    act(() => ctx.onResizeEnd());
    expect(container.style.getPropertyValue('--col-date-width')).toBe('210px');

    // Re-read the context: the reset handler closes over the persisted prefs
    act(() => result.current!.onResetWidth('date'));
    expect(container.style.getPropertyValue('--col-date-width')).toBe('110px');
    // The date override is deleted; the coupled neighbour keeps its width
    const saved = JSON.parse(savedPrefs.get('column-widths-test')!);
    expect(saved).not.toHaveProperty('date');
    expect(saved).toHaveProperty('payee');
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
    expect(result.current!.widths.date).toBe(50);
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
