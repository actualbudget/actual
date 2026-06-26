import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as connection from 'loot-core/platform/client/connection';

import {
  applyQueryParams,
  evaluateQuerySource,
  resolveTimeFrameParams,
  useQueryReport,
} from './useQueryReport';

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

describe('applyQueryParams', () => {
  it('returns the source unchanged when params is empty', () => {
    expect(applyQueryParams('q("transactions")', {})).toBe('q("transactions")');
  });

  it('returns the source unchanged when source is empty', () => {
    expect(applyQueryParams('', { startDate: '2024-01-01' })).toBe('');
  });

  it('replaces :paramName tokens with single-quoted values', () => {
    const result = applyQueryParams(
      'q("transactions").filter({ date: { $gte: :startDate } })',
      { startDate: '2024-01-01' },
    );
    expect(result).toBe(
      'q("transactions").filter({ date: { $gte: \'2024-01-01\' } })',
    );
  });

  it('replaces all occurrences of a param', () => {
    const result = applyQueryParams(':startDate and :startDate', {
      startDate: '2024-01-01',
    });
    expect(result).toBe("'2024-01-01' and '2024-01-01'");
  });

  it('replaces multiple distinct params', () => {
    const result = applyQueryParams(
      'q().filter({ date: { $gte: :startDate, $lte: :endDate } })',
      { startDate: '2024-01-01', endDate: '2024-12-31' },
    );
    expect(result).toBe(
      "q().filter({ date: { $gte: '2024-01-01', $lte: '2024-12-31' } })",
    );
  });

  it('does not touch unrelated :word tokens that are not in params', () => {
    const result = applyQueryParams('q(:foo)', { startDate: '2024-01-01' });
    expect(result).toBe('q(:foo)');
  });
});

describe('resolveTimeFrameParams', () => {
  it('returns empty object when timeFrame is undefined', () => {
    expect(resolveTimeFrameParams(undefined)).toEqual({});
  });

  it('returns startDate and endDate when timeFrame mode is "full"', () => {
    const params = resolveTimeFrameParams({
      start: '2020-01',
      end: '2024-06',
      mode: 'full',
    });
    expect(params).toHaveProperty('startDate');
    expect(params).toHaveProperty('endDate');
    expect(params.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(params.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns startDate and endDate for a static time frame', () => {
    const params = resolveTimeFrameParams({
      start: '2024-01',
      end: '2024-03',
      mode: 'static',
    });
    expect(params).toEqual({
      startDate: '2024-01-01',
      endDate: '2024-03-31',
    });
  });

  it('returns normalized start/end dates for a sliding-window time frame', () => {
    const params = resolveTimeFrameParams({
      start: '2024-01',
      end: '2024-03',
      mode: 'sliding-window',
    });
    expect(params).toHaveProperty('startDate');
    expect(params).toHaveProperty('endDate');
    expect(params.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(params.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('evaluateQuerySource', () => {
  it('returns the Query when source compiles successfully', () => {
    const source = "q('transactions').select('*').limit(100)";
    const result = evaluateQuerySource(source);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.query).toBeDefined();
    }
  });

  it('reports unresolved parameters when source contains :token and eval fails', () => {
    const source = 'q("transactions").filter({ date: { $gte: :startDate } })';
    const result = evaluateQuerySource(source);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.kind).toBe('unresolved-params');
      expect(result.unresolvedParams).toEqual([':startDate']);
    }
  });

  it('reports all unresolved parameters when multiple are present', () => {
    const source = 'q().filter({ date: { $gte: :startDate, $lte: :endDate } })';
    const result = evaluateQuerySource(source);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.kind).toBe('unresolved-params');
      expect(result.unresolvedParams).toEqual([':startDate', ':endDate']);
    }
  });

  it('reports syntax error when source has no unresolved params', () => {
    const source = 'this is not valid javascript {{{';
    const result = evaluateQuerySource(source);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.kind).toBe('syntax');
    }
  });
});

describe('useQueryReport hook', () => {
  function setupMocks(rows: unknown[] = []) {
    mockedAqlQuery.mockResolvedValue({
      data: rows,
      dependencies: [],
    });
    mockedProcessQueryResult.mockReturnValue({
      rows,
      columns: [],
      datasetType: 'transactions',
    });
  }

  async function waitForDebounce() {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 400));
    });
  }

  it('returns a compile error describing unresolved parameters', async () => {
    const { result } = renderHook(() =>
      useQueryReport('q().filter({ date: { $gte: :startDate } })', undefined),
    );

    await waitForDebounce();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error?.type).toBe('compile-error');
    expect(result.current.error?.message).toContain(':startDate');
    expect(result.current.result).toBeNull();
  });

  it('falls back to a generic syntax error when there are no unresolved params', async () => {
    const { result } = renderHook(() =>
      useQueryReport('not valid {{{', undefined),
    );

    await waitForDebounce();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toEqual({
      type: 'compile-error',
      message: 'Invalid query syntax',
    });
  });

  it('returns the processed query result on success', async () => {
    setupMocks([{ amount: 100 }]);

    const { result } = renderHook(() =>
      useQueryReport("q('transactions').select('*')", undefined),
    );

    await waitForDebounce();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.result).toEqual({
      rows: [{ amount: 100 }],
      columns: [],
      datasetType: 'transactions',
    });
  });

  it('resets state when querySource is null', async () => {
    const { result } = renderHook(() => useQueryReport(null, undefined));

    await waitForDebounce();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
