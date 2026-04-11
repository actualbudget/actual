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
  it('resolves explicit widths for visible columns', () => {
    const visibleColumns = getVisibleTransactionColumns({
      showAccount: true,
      showCategory: true,
      showBalances: true,
    });

    const widths = resolveTransactionColumnWidths({
      visibleColumns,
      savedWidths: {
        payee: 260,
      },
      availableWidth: null,
    });

    expect(widths.date).toBe(110);
    expect(widths.account).toBe(180);
    expect(widths.payee).toBe(260);
    expect(widths.notes).toBe(220);
    expect(widths.category).toBe(180);
    expect(widths.payment).toBe(120);
    expect(widths.deposit).toBe(120);
    expect(widths.balance).toBe(120);
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

    const totalWidth = visibleColumns.reduce(
      (sum, column) => sum + widths[column.id],
      0,
    );

    expect(totalWidth).toBe(1000);
    expect(widths.payee).toBeGreaterThan(220);
    expect(widths.notes).toBeGreaterThan(220);
  });

  it('finds the next visible neighbor for resizing', () => {
    const visibleColumns = getVisibleTransactionColumns({
      showAccount: false,
      showCategory: true,
      showBalances: true,
    });

    expect(getVisibleNeighborColumnId(visibleColumns, 'date')).toBe('payee');
    expect(getVisibleNeighborColumnId(visibleColumns, 'category')).toBe('payment');
    expect(getVisibleNeighborColumnId(visibleColumns, 'balance')).toBeNull();
  });

  it('only changes the active column and its neighbor during resize', () => {
    const visibleColumns = getVisibleTransactionColumns({
      showAccount: true,
      showCategory: true,
      showBalances: true,
    });
    const startingWidths = resolveTransactionColumnWidths({
      visibleColumns,
      availableWidth: null,
    });

    const resizedWidths = applyNeighborColumnResize({
      widths: startingWidths,
      visibleColumns,
      activeColumnId: 'payee',
      delta: 40,
    });

    expect(resizedWidths.payee).toBe(startingWidths.payee + 40);
    expect(resizedWidths.notes).toBe(startingWidths.notes - 40);
    expect(resizedWidths.account).toBe(startingWidths.account);
    expect(resizedWidths.category).toBe(startingWidths.category);
  });

  it('clamps resize using both columns minimum widths', () => {
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

    expect(resizedWidths.account).toBe(120);
    expect(resizedWidths.payee).toBe(
      startingWidths.account + startingWidths.payee - 120,
    );
  });

  it('serializes and parses persisted widths safely', () => {
    const serialized = serializeTransactionColumnWidthsPref({
      payee: 250,
      notes: 180,
    });

    expect(parseTransactionColumnWidthsPref(serialized)).toEqual({
      payee: 250,
      notes: 180,
    });
    expect(parseTransactionColumnWidthsPref('{bad json')).toEqual({});
  });
});
