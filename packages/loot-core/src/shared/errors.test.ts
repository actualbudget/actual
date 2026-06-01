import { getDownloadError, getSyncError } from './errors';

// Exact text returned by the schema-mismatch branch. Asserting against it
// keeps these tests free of any i18n setup (loot-core does not use i18n).
const SCHEMA_MISMATCH_MESSAGE =
  'This budget could not be loaded because it uses a newer database schema than this version of Actual supports. Make sure you are using the latest version, then try again.';

const schemaMismatchMeta = {
  error: { message: 'no such column: cleanup_def', stack: '' },
  query: { sql: 'UPDATE categories SET cleanup_def = ? WHERE id = ?' },
};

const unrelatedMeta = {
  error: { message: 'UNIQUE constraint failed', stack: '' },
  query: { sql: 'INSERT INTO categories (id) VALUES (?)' },
};

describe('getDownloadError', () => {
  it('returns a version-mismatch message for missing-column schema errors', () => {
    expect(
      getDownloadError({ reason: 'invalid-schema', meta: schemaMismatchMeta }),
    ).toBe(SCHEMA_MISMATCH_MESSAGE);
  });

  it('returns a version-mismatch message for missing-table schema errors', () => {
    expect(
      getDownloadError({
        reason: 'invalid-schema',
        meta: { error: { message: 'no such table: foo', stack: '' } },
      }),
    ).toBe(SCHEMA_MISMATCH_MESSAGE);
  });

  it('does not report a schema mismatch for other invalid-schema failures', () => {
    expect(
      getDownloadError({ reason: 'invalid-schema', meta: unrelatedMeta }),
    ).not.toBe(SCHEMA_MISMATCH_MESSAGE);
  });
});

describe('getSyncError', () => {
  it('returns a version-mismatch message for missing-column schema errors', () => {
    expect(
      getSyncError('invalid-schema', 'budget-id', schemaMismatchMeta),
    ).toBe(SCHEMA_MISMATCH_MESSAGE);
  });

  it('does not report a schema mismatch for other invalid-schema failures', () => {
    expect(getSyncError('invalid-schema', 'budget-id', unrelatedMeta)).not.toBe(
      SCHEMA_MISMATCH_MESSAGE,
    );
  });

  it('does not report a schema mismatch when meta is missing', () => {
    expect(getSyncError('invalid-schema', 'budget-id')).not.toBe(
      SCHEMA_MISMATCH_MESSAGE,
    );
  });
});
