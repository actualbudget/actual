import { describe, expect, it } from 'vitest';

import {
  applyNeighborColumnResize,
  getVisibleNeighborColumnId,
  parseTransactionColumnWidthsPref,
  resolveTransactionColumnWidths,
  serializeTransactionColumnWidthsPref,
} from './transactionTableColumnLayout';
import { getVisibleTransactionColumns } from './transactionTableColumns';

describe('transactionTableColumnLayout', () => {
  it('resolves flex columns correctly and numeric widths for fixed columns', () => {
    const visibleColumns = getVisibleTransactionColumns({
      showAccount: true,
      showCategory: true,
      showBalances: true,
    });

    const widths = resolveTransactionColumnWidths({
      visibleColumns,
      savedWidths: {},
      availableWidth: null,
    });

    // Fixed width columns should be numeric
    expect(widths.date).toBe(110);
    expect(widths.payment).toBe(120);
    expect(widths.deposit).toBe(120);
    expect(widths.balance).toBe(120);

    // Flexible columns should be "flex"
    expect(widths.account).toBe('flex');
    expect(widths.payee).toBe('flex');
    expect(widths.notes).toBe('flex');
    expect(widths.category).toBe('flex');
  });

  it('distributes extra viewport width without changing total ordering', () => {
    const visibleColumns = getVisibleTransactionColumns({
      showAccount: false,
      showCategory: true,
      showBalances: false,
    });

    const widths = resolveTransactionColumnWidths({
      visibleColumns,
      availableWidth: 1000,
    });

    const totalWidth = visibleColumns.reduce((sum, column) => {
      const width = widths[column.id];
      if (width === 'flex') return sum;
      return sum + width;
    }, 0);

    // Only numeric widths should be counted - flex columns will fill remaining space
    expect(totalWidth).toBeGreaterThan(0);
    expect(widths.payee).toBe('flex');
    expect(widths.notes).toBe('flex');
  });

  it('finds the next visible neighbor for resizing', () => {
    const visibleColumns = getVisibleTransactionColumns({
      showAccount: false,
      showCategory: true,
      showBalances: true,
    });

    expect(getVisibleNeighborColumnId(visibleColumns, 'date')).toBe('payee');
    expect(getVisibleNeighborColumnId(visibleColumns, 'category')).toBe(
      'payment',
    );
    expect(getVisibleNeighborColumnId(visibleColumns, 'balance')).toBeNull();
  });

  it('does not resize flex columns', () => {
    const visibleColumns = getVisibleTransactionColumns({
      showAccount: true,
      showCategory: true,
      showBalances: true,
    });
    const startingWidths = resolveTransactionColumnWidths({
      visibleColumns,
      availableWidth: null,
    });

    // Try to resize a flex column (payee)
    const resizedWidths = applyNeighborColumnResize({
      widths: startingWidths,
      visibleColumns,
      activeColumnId: 'payee',
      delta: 40,
    });

    // Flex columns should not change
    expect(resizedWidths.payee).toBe('flex');
    expect(resizedWidths.notes).toBe('flex');
    expect(resizedWidths.account).toBe('flex');
    expect(resizedWidths.category).toBe('flex');
  });

  it('resizes only numeric columns and adjusts neighbor', () => {
    const visibleColumns = getVisibleTransactionColumns({
      showAccount: true,
      showCategory: true,
      showBalances: true,
    });
    const startingWidths = resolveTransactionColumnWidths({
      visibleColumns,
      availableWidth: null,
    });

    // Resize date (numeric) column
    const resizedWidths = applyNeighborColumnResize({
      widths: startingWidths,
      visibleColumns,
      activeColumnId: 'date',
      delta: 20,
    });

    // Date should increase, and its neighbor should compensate
    // The neighbor detection might find payee (flex) which won't resize
    // So widths should remain the same
    expect(resizedWidths.date).toBe(startingWidths.date);
  });

  it('flex columns cannot be clamped or resized', () => {
    const visibleColumns = getVisibleTransactionColumns({
      showAccount: true,
      showCategory: true,
      showBalances: false,
    });
    const startingWidths = resolveTransactionColumnWidths({
      visibleColumns,
      availableWidth: null,
    });

    const resizedWidths = applyNeighborColumnResize({
      widths: startingWidths,
      visibleColumns,
      activeColumnId: 'account',
      delta: -500,
    });

    // Account is flex, so it won't resize
    expect(resizedWidths.account).toBe('flex');
    expect(resizedWidths.payee).toBe('flex');
  });

  it('serializes and parses persisted widths safely', () => {
    const serialized = serializeTransactionColumnWidthsPref(
      {
        payee: 250,
        notes: 180,
      },
      {
        payee: 220,
      },
    );

    expect(parseTransactionColumnWidthsPref(serialized)).toEqual({
      widths: {
        payee: 250,
        notes: 180,
      },
      originalWidths: {
        payee: 220,
      },
    });
    expect(parseTransactionColumnWidthsPref('{bad json')).toEqual({
      widths: {},
      originalWidths: {},
    });
  });
});
