import { isValidFileId, isValidGroupId } from '#util/paths';

import { File } from './services/files-service';
import { validateSyncedFile, validateUploadedFile } from './validation';

function createFile(overrides: Partial<File> = {}): File {
  const id = 'file-id';
  const groupId = 'group-id';
  if (!isValidFileId(id) || !isValidGroupId(groupId)) {
    throw new Error('Invalid test file identifiers');
  }

  return {
    ...new File({
      id,
      name: 'Budget',
      groupId,
      encryptMeta: null,
      syncVersion: '2',
      owner: null,
    }),
    ...overrides,
  };
}

describe('validateSyncedFile', () => {
  it.each(['2', '3', '10'])('accepts sync version %s', syncVersion => {
    expect(
      validateSyncedFile('group-id', null, createFile({ syncVersion })),
    ).toBeNull();
  });

  it.each([null, undefined, '0', '1'])(
    'rejects missing or outdated sync version %s',
    syncVersion => {
      expect(
        validateSyncedFile('group-id', null, createFile({ syncVersion })),
      ).toBe('file-old-version');
    },
  );

  it.each([null, undefined])('requires a group after a reset (%s)', groupId => {
    expect(validateSyncedFile(null, null, createFile({ groupId }))).toBe(
      'file-needs-upload',
    );
  });

  it('accepts matching encryption keys', () => {
    const file = createFile({
      encryptKeyId: 'key-id',
      encryptMeta: JSON.stringify({ keyId: 'key-id' }),
    });

    expect(validateSyncedFile('group-id', 'key-id', file)).toBeNull();
  });

  it.each([
    { encryptKeyId: 'key-id', encryptMeta: null },
    { encryptKeyId: null, encryptMeta: JSON.stringify({ keyId: 'key-id' }) },
    {
      encryptKeyId: 'key-id',
      encryptMeta: JSON.stringify({ keyId: 'other-key' }),
    },
    { encryptKeyId: 'key-id', encryptMeta: '{}' },
  ])('rejects inconsistent stored encryption metadata: %j', encryption => {
    expect(
      validateSyncedFile('group-id', 'key-id', createFile(encryption)),
    ).toBe('file-key-mismatch');
  });

  it('rejects changes from an old group', () => {
    expect(validateSyncedFile('old-group', null, createFile())).toBe(
      'file-has-reset',
    );
  });

  it('rejects changes encrypted with another key', () => {
    const file = createFile({
      encryptKeyId: 'key-id',
      encryptMeta: JSON.stringify({ keyId: 'key-id' }),
    });

    expect(validateSyncedFile('group-id', 'other-key', file)).toBe(
      'file-has-new-key',
    );
  });

  it('rejects encrypted changes for an unencrypted file', () => {
    expect(validateSyncedFile('group-id', 'key-id', createFile())).toBe(
      'file-has-new-key',
    );
  });

  it('checks the sync version before the group and encryption metadata', () => {
    const file = createFile({
      syncVersion: '1',
      groupId: null,
      encryptMeta: 'invalid-json',
    });

    expect(validateSyncedFile('old-group', 'other-key', file)).toBe(
      'file-old-version',
    );
  });

  it('checks for a pending upload before parsing encryption metadata', () => {
    const file = createFile({ groupId: null, encryptMeta: 'invalid-json' });

    expect(validateSyncedFile('old-group', 'other-key', file)).toBe(
      'file-needs-upload',
    );
  });

  it('checks stored encryption metadata before the incoming group and key', () => {
    const file = createFile({ encryptKeyId: 'key-id' });

    expect(validateSyncedFile('old-group', 'other-key', file)).toBe(
      'file-key-mismatch',
    );
  });

  it('checks the incoming group before the incoming key', () => {
    expect(validateSyncedFile('old-group', 'other-key', createFile())).toBe(
      'file-has-reset',
    );
  });

  it('throws for malformed stored encryption metadata', () => {
    expect(() =>
      validateSyncedFile('group-id', null, createFile({ encryptMeta: '{' })),
    ).toThrow(SyntaxError);
  });
});

describe('validateUploadedFile', () => {
  it.each([null, undefined])('accepts a new file (%s)', file => {
    expect(validateUploadedFile('group-id', 'key-id', file)).toBeNull();
  });

  it('accepts an unencrypted upload for the current group', () => {
    expect(validateUploadedFile('group-id', null, createFile())).toBeNull();
  });

  it('accepts an encrypted upload with the registered key', () => {
    expect(
      validateUploadedFile(
        'group-id',
        'key-id',
        createFile({ encryptKeyId: 'key-id' }),
      ),
    ).toBeNull();
  });

  it('accepts an upload after resetting the group', () => {
    expect(
      validateUploadedFile(null, null, createFile({ groupId: null })),
    ).toBeNull();
  });

  it('rejects an upload from an old group before checking the key', () => {
    expect(validateUploadedFile('old-group', 'other-key', createFile())).toBe(
      'file-has-reset',
    );
  });

  it.each([null, 'other-key'])(
    'rejects an upload without the registered key (%s)',
    keyId => {
      expect(
        validateUploadedFile(
          'group-id',
          keyId,
          createFile({ encryptKeyId: 'key-id' }),
        ),
      ).toBe('file-has-new-key');
    },
  );

  it('does not apply sync-only validation to an upload', () => {
    const file = createFile({ syncVersion: null, encryptMeta: 'invalid-json' });

    expect(validateUploadedFile('group-id', null, file)).toBeNull();
  });
});
