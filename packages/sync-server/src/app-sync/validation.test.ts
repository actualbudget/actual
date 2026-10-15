import { describe, expect, it } from 'vitest';

import { File } from '#app-sync/services/files-service';
import { isValidFileId, isValidGroupId } from '#util/paths';
import type { FileId, GroupId } from '#util/paths';

import { validateSyncedFile, validateUploadedFile } from './validation';

function toFileId(id: string): FileId {
  if (!isValidFileId(id)) {
    throw new Error(`Invalid file id in test: ${id}`);
  }
  return id;
}

function toGroupId(id: string): GroupId {
  if (!isValidGroupId(id)) {
    throw new Error(`Invalid group id in test: ${id}`);
  }
  return id;
}

const GROUP_ID = toGroupId('group-1');
const KEY_ID = 'key-1';

function createFile(overrides: Partial<File> = {}) {
  const file = new File({
    id: toFileId('file-1'),
    name: 'Test file',
    groupId: GROUP_ID,
    encryptMeta: null,
    syncVersion: '2',
    owner: null,
  });
  return Object.assign(file, overrides);
}

describe('validateSyncedFile', () => {
  it('rejects a file without a sync version', () => {
    const file = createFile({ syncVersion: null });

    expect(validateSyncedFile(GROUP_ID, null, file)).toBe('file-old-version');
  });

  it('rejects a file with an outdated sync version', () => {
    const file = createFile({ syncVersion: '1' });

    expect(validateSyncedFile(GROUP_ID, null, file)).toBe('file-old-version');
  });

  it('rejects a file that has no group yet', () => {
    const file = createFile({ groupId: null });

    expect(validateSyncedFile(GROUP_ID, null, file)).toBe('file-needs-upload');
  });

  it('rejects a file whose uploaded key does not match its registered key', () => {
    const file = createFile({
      encryptMeta: JSON.stringify({ keyId: 'other-key' }),
      encryptKeyId: KEY_ID,
    });

    expect(validateSyncedFile(GROUP_ID, KEY_ID, file)).toBe(
      'file-key-mismatch',
    );
  });

  it('rejects changes from a group that has been reset', () => {
    const file = createFile();

    expect(validateSyncedFile('old-group', null, file)).toBe('file-has-reset');
  });

  it('rejects changes encrypted with a different key', () => {
    const file = createFile({
      encryptMeta: JSON.stringify({ keyId: KEY_ID }),
      encryptKeyId: KEY_ID,
    });

    expect(validateSyncedFile(GROUP_ID, 'other-key', file)).toBe(
      'file-has-new-key',
    );
  });

  it('accepts an unencrypted file from the current group', () => {
    const file = createFile();

    expect(validateSyncedFile(GROUP_ID, null, file)).toBeNull();
  });

  it('accepts an encrypted file synced with its registered key', () => {
    const file = createFile({
      encryptMeta: JSON.stringify({ keyId: KEY_ID }),
      encryptKeyId: KEY_ID,
    });

    expect(validateSyncedFile(GROUP_ID, KEY_ID, file)).toBeNull();
  });
});

describe('validateUploadedFile', () => {
  it('accepts a new file', () => {
    expect(validateUploadedFile(GROUP_ID, null, null)).toBeNull();
  });

  it('rejects an upload from a group that has been reset', () => {
    const file = createFile();

    expect(validateUploadedFile('old-group', null, file)).toBe(
      'file-has-reset',
    );
  });

  it('rejects an upload encrypted with a different key', () => {
    const file = createFile({ encryptKeyId: KEY_ID });

    expect(validateUploadedFile(GROUP_ID, 'other-key', file)).toBe(
      'file-has-new-key',
    );
  });

  it('accepts an upload that matches the current group and key', () => {
    const file = createFile({ encryptKeyId: KEY_ID });

    expect(validateUploadedFile(GROUP_ID, KEY_ID, file)).toBeNull();
  });
});
