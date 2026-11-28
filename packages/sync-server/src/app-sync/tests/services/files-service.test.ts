import crypto from 'node:crypto';

import { getAccountDb } from '#account-db';
import { FileNotFound } from '#app-sync/errors';
import {
  File,
  FilesService,
  FileUpdate,
} from '#app-sync/services/files-service'; // Adjust the path as necessary
import type { WrappedDatabase } from '#db';
import { isValidFileId, isValidGroupId } from '#util/paths';
import type { FileId, GroupId } from '#util/paths';

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

describe('FilesService', () => {
  let filesService: FilesService;
  let accountDb: WrappedDatabase;

  const insertToyExampleData = () => {
    accountDb.mutate(
      'INSERT INTO files (id, group_id, sync_version, name, encrypt_meta, encrypt_salt, encrypt_test, encrypt_keyid, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        '1',
        'group1',
        1,
        'file1',
        '{"key":"value"}',
        'salt',
        'test',
        'keyid',
        0,
      ],
    );
  };

  const clearDatabase = () => {
    accountDb.mutate('DELETE FROM user_access');
    accountDb.mutate('DELETE FROM files');
  };

  beforeAll(() => {
    accountDb = getAccountDb();
    filesService = new FilesService(accountDb);
  });

  beforeEach(() => {
    insertToyExampleData();
  });

  afterEach(() => {
    clearDatabase();
  });

  test('get should return a file', () => {
    const file = filesService.get(toFileId('1'));
    const expectedFile = new File({
      id: toFileId('1'),
      groupId: toGroupId('group1'),
      syncVersion: 1,
      name: 'file1',
      encryptMeta: '{"key":"value"}',
      encryptSalt: 'salt',
      encryptTest: 'test',
      encryptKeyId: 'keyid',
      deleted: false,
    });

    expect(file).toEqual(expectedFile);
  });

  test('get should throw FileNotFound if file is deleted or does not exist', () => {
    const fileId = toFileId(crypto.randomBytes(16).toString('hex'));
    accountDb.mutate(
      'INSERT INTO files (id, group_id, sync_version, name, encrypt_meta, encrypt_salt, encrypt_test, encrypt_keyid, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        fileId,
        'group1',
        1,
        'file1',
        '{"key":"value"}',
        'salt',
        'test',
        'keyid',
        1,
      ],
    );

    expect(() => {
      filesService.get(fileId);
    }).toThrow(FileNotFound);

    expect(() => {
      filesService.get(toFileId(crypto.randomBytes(16).toString('hex')));
    }).toThrow(FileNotFound);
  });

  test.each([true, false])(
    'set should insert a new file with deleted: %p',
    deleted => {
      const fileId = toFileId(crypto.randomBytes(16).toString('hex'));
      const newFile = new File({
        id: fileId,
        groupId: toGroupId('group2'),
        syncVersion: 1,
        name: 'file2',
        encryptMeta: '{"key":"value2"}',
        deleted,
      });

      filesService.set(newFile);

      const rawFile = filesService.getRaw(fileId);
      if (!rawFile) {
        throw new Error('The file was not inserted');
      }
      const file = filesService.validate(rawFile);
      const expectedFile = new File({
        id: fileId,
        groupId: toGroupId('group2'),
        syncVersion: 1,
        name: 'file2',
        encryptMeta: '{"key":"value2"}',
        encryptSalt: null, // default value
        encryptTest: null, // default value
        encryptKeyId: null, // default value
        deleted,
      });

      expect(file).toEqual(expectedFile);
    },
  );

  test('find should return a list of files', () => {
    const files = filesService.find({ userId: 'genericAdmin' });
    expect(files.length).toBe(1);
    expect(files[0]).toEqual(
      new File({
        id: toFileId('1'),
        groupId: toGroupId('group1'),
        syncVersion: 1,
        name: 'file1',
        encryptMeta: '{"key":"value"}',
        encryptSalt: 'salt',
        encryptTest: 'test',
        encryptKeyId: 'keyid',
        deleted: false,
      }),
    );
  });

  test('find should respect the limit parameter', () => {
    filesService.set(
      new File({
        id: toFileId(crypto.randomBytes(16).toString('hex')),
        groupId: toGroupId('group2'),
        syncVersion: 1,
        name: 'file2',
        encryptMeta: '{"key":"value2"}',
        deleted: false,
      }),
    );
    // Make sure that the file was inserted
    const allFiles = filesService.find({ userId: 'genericAdmin' });
    expect(allFiles.length).toBe(2);

    // Limit the number of files returned
    const limitedFiles = filesService.find({
      userId: 'genericAdmin',
      limit: 1,
    });
    expect(limitedFiles.length).toBe(1);
  });

  test('update should modify all attributes of an existing file', () => {
    const fileUpdate = new FileUpdate({
      name: 'updatedFile1',
      groupId: toGroupId('updatedGroup1'),
      encryptSalt: 'updatedSalt',
      encryptTest: 'updatedTest',
      encryptKeyId: 'updatedKeyId',
      encryptMeta: '{"key":"updatedValue"}',
      syncVersion: 2,
      deleted: true,
    });
    const updatedFile = filesService.update(toFileId('1'), fileUpdate);

    expect(updatedFile).toEqual(
      new File({
        id: toFileId('1'),
        name: 'updatedFile1',
        groupId: toGroupId('updatedGroup1'),
        encryptSalt: 'updatedSalt',
        encryptTest: 'updatedTest',
        encryptMeta: '{"key":"updatedValue"}',
        encryptKeyId: 'updatedKeyId',
        syncVersion: 2,
        deleted: true,
      }),
    );
  });

  test('find should return only files accessible to the user', () => {
    filesService.set(
      new File({
        id: toFileId(crypto.randomBytes(16).toString('hex')),
        groupId: toGroupId('group2'),
        syncVersion: 1,
        name: 'file2',
        encryptMeta: '{"key":"value2"}',
        deleted: false,
        owner: 'genericAdmin',
      }),
    );

    filesService.set(
      new File({
        id: toFileId(crypto.randomBytes(16).toString('hex')),
        groupId: toGroupId('group2'),
        syncVersion: 1,
        name: 'file2',
        encryptMeta: '{"key":"value2"}',
        deleted: false,
        owner: 'genericUser',
      }),
    );

    expect(filesService.find({ userId: 'genericUser' })).toHaveLength(1);
    expect(
      filesService.find({ userId: 'genericAdmin' }).length,
    ).toBeGreaterThan(1);
  });

  test.each([['update-group', null]])(
    'update should modify a single attribute with groupId = $groupId',
    newGroupId => {
      const fileUpdate = new FileUpdate({
        groupId: toGroupId(newGroupId),
      });
      const updatedFile = filesService.update(toFileId('1'), fileUpdate);

      expect(updatedFile).toEqual(
        new File({
          id: toFileId('1'),
          name: 'file1',
          groupId: toGroupId(newGroupId),
          syncVersion: 1,
          encryptMeta: '{"key":"value"}',
          encryptSalt: 'salt',
          encryptTest: 'test',
          encryptKeyId: 'keyid',
          deleted: false,
        }),
      );
    },
  );
});
