import getAccountDb from '../../../account-db.js';
import { FileNotFound } from '../../errors.js';
import {
  FilesService,
  File,
  FileUpdate,
} from '../../services/files-service.js'; // Adjust the path as necessary
import crypto from 'node:crypto';
describe('FilesService', () => {
  let filesService;
  let accountDb;

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

  beforeAll((done) => {
    accountDb = getAccountDb();
    filesService = new FilesService(accountDb);
    done();
  });

  beforeEach((done) => {
    insertToyExampleData();
    done();
  });

  afterEach((done) => {
    clearDatabase();
    done();
  });

  test('get should return a file', () => {
    const file = filesService.get('1');
    const expectedFile = new File({
      id: '1',
      groupId: 'group1',
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
    const fileId = crypto.randomBytes(16).toString('hex');
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
      filesService.get(crypto.randomBytes(16).toString('hex'));
    }).toThrow(FileNotFound);
  });

  test.each([true, false])(
    'set should insert a new file with deleted: %p',
    (deleted) => {
      const fileId = crypto.randomBytes(16).toString('hex');
      const newFile = new File({
        id: fileId,
        groupId: 'group2',
        syncVersion: 1,
        name: 'file2',
        encryptMeta: '{"key":"value2"}',
        deleted: deleted,
      });

      filesService.set(newFile);

      const file = filesService.validate(filesService.getRaw(fileId));
      const expectedFile = new File({
        id: fileId,
        groupId: 'group2',
        syncVersion: 1,
        name: 'file2',
        encryptMeta: '{"key":"value2"}',
        encryptSalt: null, // default value
        encryptTest: null, // default value
        encryptKeyId: null, // default value
        deleted: deleted,
      });

      expect(file).toEqual(expectedFile);
    },
  );

  test('find should return a list of files', () => {
    const files = filesService.find({ userId: 'genericAdmin' });
    expect(files.length).toBe(1);
    expect(files[0]).toEqual(
      new File({
        id: '1',
        groupId: 'group1',
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
        id: crypto.randomBytes(16).toString('hex'),
        groupId: 'group2',
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
      groupId: 'updatedGroup1',
      encryptSalt: 'updatedSalt',
      encryptTest: 'updatedTest',
      encryptKeyId: 'updatedKeyId',
      encryptMeta: '{"key":"updatedValue"}',
      syncVersion: 2,
      deleted: true,
    });
    const updatedFile = filesService.update('1', fileUpdate);

    expect(updatedFile).toEqual(
      new File({
        id: '1',
        name: 'updatedFile1',
        groupId: 'updatedGroup1',
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
        id: crypto.randomBytes(16).toString('hex'),
        groupId: 'group2',
        syncVersion: 1,
        name: 'file2',
        encryptMeta: '{"key":"value2"}',
        deleted: false,
        owner: 'genericAdmin',
      }),
    );

    filesService.set(
      new File({
        id: crypto.randomBytes(16).toString('hex'),
        groupId: 'group2',
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
    (newGroupId) => {
      const fileUpdate = new FileUpdate({
        groupId: newGroupId,
      });
      const updatedFile = filesService.update('1', fileUpdate);

      expect(updatedFile).toEqual(
        new File({
          id: '1',
          name: 'file1',
          groupId: newGroupId,
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
