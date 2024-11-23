import getAccountDb, { isAdmin } from '../../account-db.js';
import { FileNotFound, GenericFileError } from '../errors.js';

class FileBase {
  constructor(
    name,
    groupId,
    encryptSalt,
    encryptTest,
    encryptKeyId,
    encryptMeta,
    syncVersion,
    deleted,
    owner,
  ) {
    this.name = name;
    this.groupId = groupId;
    this.encryptSalt = encryptSalt;
    this.encryptTest = encryptTest;
    this.encryptKeyId = encryptKeyId;
    this.encryptMeta = encryptMeta;
    this.syncVersion = syncVersion;
    this.deleted = typeof deleted === 'boolean' ? deleted : Boolean(deleted);
    this.owner = owner;
  }
}

class File extends FileBase {
  constructor({
    id,
    name = null,
    groupId = null,
    encryptSalt = null,
    encryptTest = null,
    encryptKeyId = null,
    encryptMeta = null,
    syncVersion = null,
    deleted = false,
    owner = null,
  }) {
    super(
      name,
      groupId,
      encryptSalt,
      encryptTest,
      encryptKeyId,
      encryptMeta,
      syncVersion,
      deleted,
      owner,
    );
    this.id = id;
  }
}

/**
 * Represents a file update. Will only update the fields that are defined.
 * @class
 * @extends FileBase
 */
class FileUpdate extends FileBase {
  constructor({
    name = undefined,
    groupId = undefined,
    encryptSalt = undefined,
    encryptTest = undefined,
    encryptKeyId = undefined,
    encryptMeta = undefined,
    syncVersion = undefined,
    deleted = undefined,
    owner = undefined,
  }) {
    super(
      name,
      groupId,
      encryptSalt,
      encryptTest,
      encryptKeyId,
      encryptMeta,
      syncVersion,
      deleted,
      owner,
    );
  }
}

const boolToInt = (bool) => {
  return bool ? 1 : 0;
};

class FilesService {
  constructor(accountDb) {
    this.accountDb = accountDb;
  }

  get(fileId) {
    const rawFile = this.getRaw(fileId);
    if (!rawFile || (rawFile && rawFile.deleted)) {
      throw new FileNotFound();
    }

    return this.validate(rawFile);
  }

  set(file) {
    const deletedInt = boolToInt(file.deleted);
    this.accountDb.mutate(
      'INSERT INTO files (id, group_id, sync_version, name, encrypt_meta, encrypt_salt, encrypt_test, encrypt_keyid, deleted, owner) VALUES (?, ?, ?, ?, ?, ?, ?, ? ,?, ?)',
      [
        file.id,
        file.groupId,
        file.syncVersion.toString(),
        file.name,
        file.encryptMeta,
        file.encryptSalt,
        file.encrypt_test,
        file.encrypt_keyid,
        deletedInt,
        file.owner,
      ],
    );
  }

  find({ userId, limit = 1000 }) {
    const canSeeAll = isAdmin(userId);

    return (
      canSeeAll
        ? this.accountDb.all('SELECT * FROM files WHERE deleted = 0 LIMIT ?', [
            limit,
          ])
        : this.accountDb.all(
            `SELECT files.* 
        FROM files
        WHERE files.owner = ? and deleted = 0
      UNION
       SELECT files.*
        FROM files
        JOIN user_access
          ON user_access.file_id = files.id
          AND user_access.user_id = ?
       WHERE files.deleted = 0 LIMIT ?`,
            [userId, userId, limit],
          )
    ).map(this.validate);
  }

  findUsersWithAccess(fileId) {
    const userAccess =
      this.accountDb.all(
        `SELECT UA.user_id as userId, users.display_name displayName, users.user_name userName
              FROM files
                JOIN user_access UA ON UA.file_id = files.id
                JOIN users on users.id = UA.user_id
              WHERE files.id = ? 
          UNION ALL
        SELECT users.id, users.display_name, users.user_name
              FROM files
                JOIN users on users.id = files.owner
              WHERE files.id = ?
          `,
        [fileId, fileId],
      ) || [];

    return userAccess;
  }

  update(id, fileUpdate) {
    let query = 'UPDATE files SET';
    const params = [];
    const updates = [];

    if (fileUpdate.name !== undefined) {
      updates.push('name = ?');
      params.push(fileUpdate.name);
    }
    if (fileUpdate.groupId !== undefined) {
      updates.push('group_id = ?');
      params.push(fileUpdate.groupId);
    }
    if (fileUpdate.encryptSalt !== undefined) {
      updates.push('encrypt_salt = ?');
      params.push(fileUpdate.encryptSalt);
    }
    if (fileUpdate.encryptTest !== undefined) {
      updates.push('encrypt_test = ?');
      params.push(fileUpdate.encryptTest);
    }
    if (fileUpdate.encryptKeyId !== undefined) {
      updates.push('encrypt_keyid = ?');
      params.push(fileUpdate.encryptKeyId);
    }
    if (fileUpdate.encryptMeta !== undefined) {
      updates.push('encrypt_meta = ?');
      params.push(fileUpdate.encryptMeta);
    }
    if (fileUpdate.syncVersion !== undefined) {
      updates.push('sync_version = ?');
      params.push(fileUpdate.syncVersion);
    }
    if (fileUpdate.deleted !== undefined) {
      updates.push('deleted = ?');
      params.push(boolToInt(fileUpdate.deleted));
    }

    if (updates.length > 0) {
      query += ' ' + updates.join(', ') + ' WHERE id = ?';
      params.push(id);

      const res = this.accountDb.mutate(query, params);

      if (res.changes != 1) {
        throw new GenericFileError('Could not update File', { id });
      }
    }

    // Return the modified object
    return this.validate(this.getRaw(id));
  }

  getRaw(fileId) {
    return this.accountDb.first(`SELECT * FROM files WHERE id = ?`, [fileId]);
  }

  validate(rawFile) {
    return new File({
      id: rawFile.id,
      name: rawFile.name,
      groupId: rawFile.group_id,
      encryptSalt: rawFile.encrypt_salt,
      encryptTest: rawFile.encrypt_test,
      encryptKeyId: rawFile.encrypt_keyid,
      encryptMeta: rawFile.encrypt_meta,
      syncVersion: rawFile.sync_version,
      deleted: Boolean(rawFile.deleted),
      owner: rawFile.owner,
    });
  }
}

const filesService = new FilesService(getAccountDb());

export { filesService, FilesService, File, FileUpdate };
