import { classifyUpdateVersionError } from './classify-error';

describe('classifyUpdateVersionError', () => {
  test('out-of-sync-migrations from migrate() maps to the same code, no report', () => {
    expect(classifyUpdateVersionError('out-of-sync-migrations')).toEqual({
      error: 'out-of-sync-migrations',
      report: false,
    });
  });

  test('out-of-sync-data maps to the same code, no report', () => {
    expect(classifyUpdateVersionError('out-of-sync-data')).toEqual({
      error: 'out-of-sync-data',
      report: false,
    });
  });

  test('schema-out-of-sync (from probeViews) funnels to out-of-sync-migrations and reports', () => {
    expect(
      classifyUpdateVersionError(
        'schema-out-of-sync: v_schedules: no such column: custom_upcoming_length',
      ),
    ).toEqual({
      error: 'out-of-sync-migrations',
      report: true,
    });
  });

  test('unknown messages fall back to loading-budget and report', () => {
    expect(classifyUpdateVersionError('something broke')).toEqual({
      error: 'loading-budget',
      report: true,
    });
    expect(classifyUpdateVersionError('')).toEqual({
      error: 'loading-budget',
      report: true,
    });
  });

  test('substring matching: longer prefixed messages still classify correctly', () => {
    expect(
      classifyUpdateVersionError(
        'Error: out-of-sync-migrations (id mismatch at index 3)',
      ).error,
    ).toBe('out-of-sync-migrations');

    expect(
      classifyUpdateVersionError(
        'Failed: out-of-sync-data — local clock diverged',
      ).error,
    ).toBe('out-of-sync-data');
  });

  test('schema-out-of-sync is routed correctly even though it shares the "out-of-sync" prefix', () => {
    // The `out-of-sync-migrations` check looks for the `-migrations` suffix,
    // so the schema error doesn't match it and falls through to the schema
    // branch as intended.
    const result = classifyUpdateVersionError('schema-out-of-sync: v_x: ...');
    expect(result.error).toBe('out-of-sync-migrations');
    expect(result.report).toBe(true);
  });
});
