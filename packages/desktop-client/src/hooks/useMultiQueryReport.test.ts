import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as connection from 'loot-core/platform/client/connection';

import { useMultiQueryReport } from './useMultiQueryReport';

import { aqlQuery } from '@desktop-client/queries/aqlQuery';
import { processQueryResult } from '@desktop-client/queries/processQueryResult';

vi.mock('@desktop-client/queries/aqlQuery', () => ({
  aqlQuery: vi.fn(),
  AqlQueryError: class AqlQueryError extends Error {
    detail: { type: string; message: string };
    constructor(detail: { type: string; message: string }) {
      super(detail.message);
      this.name = 'AqlQueryError';
      this.detail = detail;
    }
  },
}));

vi.mock('@desktop-client/queries/processQueryResult', () => ({
  processQueryResult: vi.fn(),
}));

const mockedAqlQuery = vi.mocked(aqlQuery);
const mockedProcessQueryResult = vi.mocked(processQueryResult);

beforeEach(() => {
  vi.spyOn(connection, 'send').mockImplementation((name, args) => {
    if (name === 'query') {
      return Promise.resolve({ data: args, dependencies: [] });
    }
    return Promise.reject(new Error(`Unknown command: ${name}`));
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useMultiQueryReport', () => {
  function setupMocks(rows: unknown[][] = [[]]) {
    mockedAqlQuery.mockResolvedValue({
      data: rows[0] ?? [],
      dependencies: [],
    });
    mockedProcessQueryResult.mockImplementation(
      (data: unknown[], _columns: unknown, _isCalculation: unknown) => ({
        rows: data,
        columns: [],
        scalar: undefined,
      }),
    );
  }

  async function waitForDebounce() {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 400));
    });
  }

  it('executes both queries and returns merged result', async () => {
    setupMocks();

    const { result } = renderHook(() =>
      useMultiQueryReport([
        "q('transactions').select({ month: 'date_month', total: 'sum(amount)' })",
        "q('budgets').select({ month: 'date_month', budgeted: 'sum(amount)' })",
      ]),
    );

    await waitForDebounce();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.merged).not.toBeNull();
    expect(result.current.results).toHaveLength(2);
    expect(mockedAqlQuery).toHaveBeenCalledTimes(2);
  });

  it('returns per-query errors when one query fails to compile', async () => {
    setupMocks();

    const { result } = renderHook(() =>
      useMultiQueryReport([
        "q('transactions').select('*')",
        'this is invalid {{{',
      ]),
    );

    await waitForDebounce();

    expect(result.current.perQueryErrors[0]).toBeNull();
    expect(result.current.perQueryErrors[1]).not.toBeNull();
    expect(result.current.perQueryErrors[1]?.type).toBe('compile-error');
  });

  it('returns null merged result when all queries have compile errors', async () => {
    setupMocks();

    const { result } = renderHook(() =>
      useMultiQueryReport(['invalid {{{', 'also invalid {{{']),
    );

    await waitForDebounce();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.merged).toBeNull();
    expect(result.current.results).toHaveLength(0);
  });

  it('handles empty query sources gracefully', async () => {
    setupMocks();

    const { result } = renderHook(() => useMultiQueryReport([]));

    await waitForDebounce();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.merged).toBeNull();
    expect(result.current.results).toHaveLength(0);
    expect(result.current.perQueryErrors).toHaveLength(0);
  });

  it('handles null query sources gracefully', async () => {
    setupMocks();

    const { result } = renderHook(() => useMultiQueryReport([null, null]));

    await waitForDebounce();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.merged).toBeNull();
  });

  it('passes mergeKey to mergeQueryResults', async () => {
    setupMocks();

    const { result } = renderHook(() =>
      useMultiQueryReport(
        [
          "q('transactions').select({ month: 'date_month', total: 'sum(amount)' })",
          "q('budgets').select({ month: 'date_month', budgeted: 'sum(amount)' })",
        ],
        undefined,
        'month',
      ),
    );

    await waitForDebounce();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.merged).not.toBeNull();
  });

  it('sets mergeError when merge is incompatible', async () => {
    mockedAqlQuery.mockResolvedValue({
      data: [],
      dependencies: [],
    });
    mockedProcessQueryResult.mockImplementation(
      (data: unknown[], _columns: unknown, _isCalculation: unknown) => ({
        rows: data,
        columns: [
          { name: 'month', type: 'date-month' },
          { name: 'total', type: 'integer' },
        ],
        scalar: undefined,
      }),
    );

    const { result } = renderHook(() =>
      useMultiQueryReport([
        "q('transactions').select({ month: 'date_month', total: 'sum(amount)' })",
        "q('budgets').select({ month: 'date_month', total: 'sum(amount)' })",
      ]),
    );

    await waitForDebounce();

    expect(result.current.mergeError).not.toBeNull();
    expect(result.current.mergeError).toContain('total');
  });

  it('provides merged result even when mergeError is set (fallback to first valid)', async () => {
    mockedAqlQuery.mockResolvedValue({
      data: [{ month: '2026-01', total: 1000 }],
      dependencies: [],
    });
    mockedProcessQueryResult.mockImplementation(
      (data: unknown[], _columns: unknown, _isCalculation: unknown) => ({
        rows: data,
        columns: [
          { name: 'month', type: 'date-month' },
          { name: 'total', type: 'integer' },
        ],
        scalar: undefined,
      }),
    );

    const { result } = renderHook(() =>
      useMultiQueryReport([
        "q('transactions').select({ month: 'date_month', total: 'sum(amount)' })",
        "q('budgets').select({ month: 'date_month', total: 'sum(amount)' })",
      ]),
    );

    await waitForDebounce();

    expect(result.current.mergeError).not.toBeNull();
    expect(result.current.merged).not.toBeNull();
    expect(result.current.merged?.rows).toEqual([
      { month: '2026-01', total: 1000 },
    ]);
  });
});
