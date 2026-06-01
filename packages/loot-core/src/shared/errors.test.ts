import i18next from 'i18next';

import { getDownloadError, getSyncError } from './errors';

beforeAll(async () => {
  // With no translation resources, i18next returns each key (the English
  // source string) verbatim, which is all these assertions rely on.
  await i18next.init({
    lng: 'en',
    fallbackLng: 'en',
    resources: { en: { translation: {} } },
  });
});

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
    ).toMatch(/newer database schema/);
  });

  it('returns a version-mismatch message for missing-table schema errors', () => {
    expect(
      getDownloadError({
        reason: 'invalid-schema',
        meta: { error: { message: 'no such table: foo', stack: '' } },
      }),
    ).toMatch(/newer database schema/);
  });

  it('falls back to the generic message for other invalid-schema failures', () => {
    const message = getDownloadError({
      reason: 'invalid-schema',
      meta: unrelatedMeta,
    });
    expect(message).not.toMatch(/newer database schema/);
    expect(message).toMatch(/Something went wrong/);
  });
});

describe('getSyncError', () => {
  it('returns a version-mismatch message for missing-column schema errors', () => {
    expect(
      getSyncError('invalid-schema', 'budget-id', schemaMismatchMeta),
    ).toMatch(/newer database schema/);
  });

  it('falls back to the generic message for other invalid-schema failures', () => {
    const message = getSyncError('invalid-schema', 'budget-id', unrelatedMeta);
    expect(message).not.toMatch(/newer database schema/);
    expect(message).toMatch(/unknown problem/);
  });

  it('does not report a schema mismatch when meta is missing', () => {
    const message = getSyncError('invalid-schema', 'budget-id');
    expect(message).not.toMatch(/newer database schema/);
  });
});
