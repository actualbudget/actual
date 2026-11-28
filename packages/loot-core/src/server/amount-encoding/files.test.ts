import {
  databaseEntries,
  ENCODING_SENTINEL,
  PROTECTED_DATABASE,
  readDatabaseEntries,
} from './files';

describe('protected amount encoding files', () => {
  it('keeps legacy archives unchanged', () => {
    const content = Buffer.from('sqlite');
    const entries = databaseEntries(content, false);
    expect(Object.keys(entries)).toEqual(['db.sqlite']);
    expect(readDatabaseEntries(entries)).toEqual({
      content,
      isProtected: false,
    });
  });

  it('makes the legacy database path fail closed and retains the protected data', () => {
    const content = Buffer.from('protected sqlite');
    const entries = databaseEntries(content, true);
    expect(Buffer.from(entries['db.sqlite']).toString()).toBe(
      ENCODING_SENTINEL,
    );
    expect(readDatabaseEntries(entries)).toEqual({
      content: entries[PROTECTED_DATABASE],
      isProtected: true,
    });
  });

  it('rejects partial protected archives', () => {
    expect(() =>
      readDatabaseEntries({ 'db.sqlite': Buffer.from(ENCODING_SENTINEL) }),
    ).toThrow('amount-encoding-invalid-file');
    expect(() =>
      readDatabaseEntries({
        'db.sqlite': Buffer.from('sqlite'),
        [PROTECTED_DATABASE]: Buffer.from('protected'),
      }),
    ).toThrow('amount-encoding-invalid-file');
  });
});
