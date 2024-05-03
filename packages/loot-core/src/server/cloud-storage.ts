// @ts-strict-ignore
import AdmZip from 'adm-zip';
import { v4 as uuidv4 } from 'uuid';

import * as asyncStorage from '../platform/server/asyncStorage';
import { fetch } from '../platform/server/fetch';
import * as fs from '../platform/server/fs';
import * as sqlite from '../platform/server/sqlite';
import * as monthUtils from '../shared/months';

import * as encryption from './encryption';
import {
  HTTPError,
  PostError,
  FileDownloadError,
  FileUploadError,
} from './errors';
import { runMutator } from './mutators';
import { post } from './post';
import * as prefs from './prefs';
import { getServer } from './server-config';

const UPLOAD_FREQUENCY_IN_DAYS = 7;

export interface RemoteFile {
  deleted: boolean;
  fileId: string;
  groupId: string;
  name: string;
  encryptKeyId: string;
  hasKey: boolean;
}

async function checkHTTPStatus(res) {
  if (res.status !== 200) {
    return res.text().then(str => {
      throw new HTTPError(res.status, str);
    });
  } else {
    return res;
  }
}

async function fetchJSON(...args: Parameters<typeof fetch>) {
  let res = await fetch(...args);
  res = await checkHTTPStatus(res);
  return res.json();
}

export async function checkKey(): Promise<{
  valid: boolean;
  error?: { reason: string };
}> {
  const userToken = await asyncStorage.getItem('user-token');

  const { cloudFileId, encryptKeyId } = prefs.getPrefs();

  let res;
  try {
    res = await post(getServer().SYNC_SERVER + '/user-get-key', {
      token: userToken,
      fileId: cloudFileId,
    });
  } catch (e) {
    console.log(e);
    return { valid: false, error: { reason: 'network' } };
  }

  return {
    valid:
      // This == comparison is important, they could be null or undefined
      // eslint-disable-next-line eqeqeq
      res.id == encryptKeyId &&
      (encryptKeyId == null || encryption.hasKey(encryptKeyId)),
  };
}

export async function resetSyncState(newKeyState) {
  const userToken = await asyncStorage.getItem('user-token');

  const { cloudFileId } = prefs.getPrefs();

  try {
    await post(getServer().SYNC_SERVER + '/reset-user-file', {
      token: userToken,
      fileId: cloudFileId,
    });
  } catch (e) {
    if (e instanceof PostError) {
      return {
        error: {
          reason: e.reason === 'unauthorized' ? 'unauthorized' : 'network',
        },
      };
    }
    return { error: { reason: 'internal' } };
  }

  if (newKeyState) {
    try {
      await post(getServer().SYNC_SERVER + '/user-create-key', {
        token: userToken,
        fileId: cloudFileId,
        keyId: newKeyState.key.getId(),
        keySalt: newKeyState.salt,
        testContent: newKeyState.testContent,
      });
    } catch (e) {
      if (e instanceof PostError) {
        return { error: { reason: 'network' } };
      }
      return { error: { reason: 'internal' } };
    }
  }

  return {};
}

export async function exportBuffer() {
  const { id, budgetName } = prefs.getPrefs();
  if (!budgetName) {
    return null;
  }

  const budgetDir = fs.getBudgetDir(id);

  // create zip
  const zipped = new AdmZip();

  // We run this in a mutator even though its not mutating anything
  // because we are reading the sqlite file from disk. We want to make
  // sure that we get a valid snapshot of it so we want this to be
  // serialized with all other mutations.
  await runMutator(async () => {
    const rawDbContent = await fs.readFile(
      fs.join(budgetDir, 'db.sqlite'),
      'binary',
    );

    // Do some post-processing of the database. We NEVER upload the cache with
    // the database; this forces new downloads to always recompute everything
    // which is not only safer, but reduces the filesize a lot.
    const memDb = await sqlite.openDatabase(rawDbContent);
    sqlite.execQuery(
      memDb,
      `
        DELETE FROM kvcache;
        DELETE FROM kvcache_key;
      `,
    );

    const dbContent = await sqlite.exportDatabase(memDb);

    sqlite.closeDatabase(memDb);

    // mark it as a file that needs a new clock so when a new client
    // downloads it, it'll get set to a unique node
    const meta = JSON.parse(
      await fs.readFile(fs.join(budgetDir, 'metadata.json')),
    );

    meta.resetClock = true;
    const metaContent = Buffer.from(JSON.stringify(meta), 'utf8');

    zipped.addFile('db.sqlite', Buffer.from(dbContent));
    zipped.addFile('metadata.json', metaContent);
  });

  return Buffer.from(zipped.toBuffer());
}

export async function importBuffer(fileData, buffer) {
  let zipped, entries;
  try {
    zipped = new AdmZip(buffer);
    entries = zipped.getEntries();
  } catch (err) {
    throw FileDownloadError('not-zip-file');
  }
  const dbEntry = entries.find(e => e.entryName.includes('db.sqlite'));
  const metaEntry = entries.find(e => e.entryName.includes('metadata.json'));

  if (!dbEntry || !metaEntry) {
    throw FileDownloadError('invalid-zip-file');
  }

  const dbContent = zipped.readFile(dbEntry);
  const metaContent = zipped.readFile(metaEntry);

  let meta;
  try {
    meta = JSON.parse(metaContent.toString('utf8'));
  } catch (err) {
    throw FileDownloadError('invalid-meta-file');
  }

  // Update the metadata. The stored file on the server might be
  // out-of-date with a few keys
  meta = {
    ...meta,
    cloudFileId: fileData.fileId,
    groupId: fileData.groupId,
    lastUploaded: monthUtils.currentDay(),
    encryptKeyId: fileData.encryptMeta ? fileData.encryptMeta.keyId : null,
  };

  const budgetDir = fs.getBudgetDir(meta.id);

  if (await fs.exists(budgetDir)) {
    // Don't remove the directory so that backups are retained
    const dbFile = fs.join(budgetDir, 'db.sqlite');
    const metaFile = fs.join(budgetDir, 'metadata.json');

    if (await fs.exists(dbFile)) {
      await fs.removeFile(dbFile);
    }
    if (await fs.exists(metaFile)) {
      await fs.removeFile(metaFile);
    }
  } else {
    await fs.mkdir(budgetDir);
  }

  await fs.writeFile(fs.join(budgetDir, 'db.sqlite'), dbContent);
  await fs.writeFile(fs.join(budgetDir, 'metadata.json'), JSON.stringify(meta));

  return { id: meta.id };
}

export async function upload() {
  const userToken = await asyncStorage.getItem('user-token');
  if (!userToken) {
    throw FileUploadError('unauthorized');
  }

  const zipContent = await exportBuffer();
  if (zipContent == null) {
    return;
  }

  const {
    id,
    groupId,
    budgetName,
    cloudFileId: originalCloudFileId,
    encryptKeyId,
  } = prefs.getPrefs();
  let cloudFileId = originalCloudFileId;
  let uploadContent = zipContent;
  let uploadMeta = null;

  // The upload process encrypts with the key tagged in the prefs for
  // the file. It will upload the file and the server is responsible
  // for checking that the key is up-to-date and rejecting it if not
  if (encryptKeyId) {
    let encrypted;
    try {
      encrypted = await encryption.encrypt(zipContent, encryptKeyId);
    } catch (e) {
      throw FileUploadError('encrypt-failure', {
        isMissingKey: e.message === 'missing-key',
      });
    }
    uploadContent = encrypted.value;
    uploadMeta = encrypted.meta;
  }

  if (!cloudFileId) {
    cloudFileId = uuidv4();
  }

  let res;
  try {
    res = await fetchJSON(getServer().SYNC_SERVER + '/upload-user-file', {
      method: 'POST',
      headers: {
        'Content-Length': uploadContent.length,
        'Content-Type': 'application/encrypted-file',
        'X-ACTUAL-TOKEN': userToken,
        'X-ACTUAL-FILE-ID': cloudFileId,
        'X-ACTUAL-NAME': encodeURIComponent(budgetName),
        'X-ACTUAL-FORMAT': 2,
        ...(uploadMeta
          ? { 'X-ACTUAL-ENCRYPT-META': JSON.stringify(uploadMeta) }
          : null),
        ...(groupId ? { 'X-ACTUAL-GROUP-ID': groupId } : null),
      },
      body: uploadContent,
    });
  } catch (err) {
    console.log('Upload failure', err);

    if (err instanceof PostError) {
      throw FileUploadError(
        err.reason === 'unauthorized'
          ? 'unauthorized'
          : err.reason || 'network',
      );
    }

    throw FileUploadError('internal');
  }

  if (res.status === 'ok') {
    // Only save it if we are still working on the same file
    if (prefs.getPrefs() && prefs.getPrefs().id === id) {
      await prefs.savePrefs({
        lastUploaded: monthUtils.currentDay(),
        cloudFileId,
        groupId: res.groupId,
      });
    }
  } else {
    throw FileUploadError('internal');
  }
}

export async function possiblyUpload() {
  const { cloudFileId, groupId, lastUploaded } = prefs.getPrefs();

  const threshold =
    lastUploaded && monthUtils.addDays(lastUploaded, UPLOAD_FREQUENCY_IN_DAYS);
  const currentDay = monthUtils.currentDay();

  // We only want to try to upload every UPLOAD_FREQUENCY_IN_DAYS days
  if (lastUploaded && currentDay < threshold) {
    return;
  }

  // We only want to upload existing cloud files that are part of a
  // valid group
  if (!cloudFileId || !groupId) {
    return;
  }

  // Don't block on uploading
  upload().catch(() => {});
}

export async function removeFile(fileId) {
  const userToken = await asyncStorage.getItem('user-token');

  await post(getServer().SYNC_SERVER + '/delete-user-file', {
    token: userToken,
    fileId,
  });
}

export async function listRemoteFiles(): Promise<RemoteFile[] | null> {
  const userToken = await asyncStorage.getItem('user-token');
  if (!userToken) {
    return null;
  }

  let res;
  try {
    res = await fetchJSON(getServer().SYNC_SERVER + '/list-user-files', {
      headers: {
        'X-ACTUAL-TOKEN': userToken,
      },
    });
  } catch (e) {
    console.log('Unexpected error fetching file list from server', e);
    return null;
  }

  if (res.status === 'error') {
    console.log('Error fetching file list from server', res);
    return null;
  }

  return res.data.map(file => ({
    ...file,
    hasKey: encryption.hasKey(file.encryptKeyId),
  }));
}

export async function download(fileId) {
  const userToken = await asyncStorage.getItem('user-token');
  const syncServer = getServer().SYNC_SERVER;

  const userFileFetch = fetch(`${syncServer}/download-user-file`, {
    headers: {
      'X-ACTUAL-TOKEN': userToken,
      'X-ACTUAL-FILE-ID': fileId,
    },
  })
    .then(checkHTTPStatus)
    .then(res => {
      if (res.arrayBuffer) {
        return res.arrayBuffer().then(ab => Buffer.from(ab));
      }
      return res.buffer();
    })
    .catch(err => {
      console.log('Download failure', err);
      throw FileDownloadError('download-failure');
    });

  const userFileInfoFetch = fetchJSON(`${syncServer}/get-user-file-info`, {
    headers: {
      'X-ACTUAL-TOKEN': userToken,
      'X-ACTUAL-FILE-ID': fileId,
    },
  }).catch(err => {
    console.log('Error fetching file info', err);
    throw FileDownloadError('internal', { fileId });
  });

  const [userFileInfoRes, userFileRes] = await Promise.all([
    userFileInfoFetch,
    userFileFetch,
  ]);

  if (userFileInfoRes.status !== 'ok') {
    console.log(
      'Could not download file from the server. Are you sure you have the right file ID?',
      userFileInfoRes,
    );
    throw FileDownloadError('internal', { fileId });
  }

  const fileData = userFileInfoRes.data;
  let buffer = userFileRes;

  // The download process checks if the server gave us decrypt
  // information. It is assumed that this key has already been loaded
  // in, which is done in a previous step
  if (fileData.encryptMeta) {
    try {
      buffer = await encryption.decrypt(buffer, fileData.encryptMeta);
    } catch (e) {
      throw FileDownloadError('decrypt-failure', {
        isMissingKey: e.message === 'missing-key',
      });
    }
  }

  return importBuffer(fileData, buffer);
}
