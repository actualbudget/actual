let { SQLiteFS } = require('absurd-sql');
let IndexedDBBackend = require('absurd-sql/dist/indexeddb-backend').default;

let connection = require('../connection');
let idb = require('../indexeddb');
let { _getModule } = require('../sqlite');

let baseAPI = require('./index.electron.js');
let join = require('./path-join');

let FS = null;
let BFS = null;
// let NO_PERSIST = process.env.IS_BETA === true;
let NO_PERSIST = false;

function pathToId(filepath) {
  return filepath.replace(/^\//, '').replace(/\//g, '-');
}

function _exists(filepath) {
  try {
    FS.readlink(filepath);
    return true;
  } catch (e) {}

  try {
    FS.stat(filepath);
    return true;
  } catch (e) {}
  return false;
}

function _mkdirRecursively(dir) {
  let parts = dir.split('/').filter(str => str !== '');
  let path = '';
  for (let part of parts) {
    path += '/' + part;
    if (!_exists(path)) {
      FS.mkdir(path);
    }
  }
}

function _createFile(filepath) {
  // This can create the file. Check if it exists, if not create a
  // symlink if it's a sqlite file. Otherwise store in idb

  if (!NO_PERSIST && filepath.startsWith('/documents')) {
    if (filepath.endsWith('.sqlite')) {
      // If it doesn't exist, we need to create a symlink
      if (!_exists(filepath)) {
        FS.symlink('/blocked/' + pathToId(filepath), filepath);
      }
    } else {
      // The contents are actually stored in IndexedDB. We only write to
      // the in-memory fs to take advantage of the file hierarchy
      FS.writeFile(filepath, '!$@) this should never read !$@)');
    }
  }

  return filepath;
}

async function _readFile(filepath, opts) {
  // We persist stuff in /documents, but don't need to handle sqlite
  // file specifically because those are symlinked to a separate
  // filesystem and will be handled in the BlockedFS
  if (
    !NO_PERSIST &&
    filepath.startsWith('/documents') &&
    !filepath.endsWith('.sqlite')
  ) {
    if (!_exists(filepath)) {
      throw new Error('File does not exist: ' + filepath);
    }

    // Grab contents from IDB
    let { store } = idb.getStore(await idb.getDatabase(), 'files');
    let item = await idb.get(store, filepath);

    if (item == null) {
      throw new Error('File does not exist: ' + filepath);
    }

    if (opts.encoding === 'utf8' && ArrayBuffer.isView(item.contents)) {
      return String.fromCharCode.apply(
        null,
        new Uint16Array(item.contents.buffer)
      );
    }

    return item.contents;
  } else {
    return FS.readFile(resolveLink(filepath), opts);
  }
}

function resolveLink(path) {
  try {
    let { node } = FS.lookupPath(path, { follow: false });
    return node.link ? FS.readlink(path) : path;
  } catch (e) {
    return path;
  }
}

async function _writeFile(filepath, contents) {
  if (contents instanceof ArrayBuffer) {
    contents = new Uint8Array(contents);
  } else if (ArrayBuffer.isView(contents)) {
    contents = new Uint8Array(contents.buffer);
  }

  // We always create the file if it doesn't exist, and this function
  // setups up the file depending on its type
  _createFile(filepath);

  if (!NO_PERSIST && filepath.startsWith('/documents')) {
    let isDb = filepath.endsWith('.sqlite');

    // Write to IDB
    let { store } = idb.getStore(await idb.getDatabase(), 'files');

    if (isDb) {
      // We never write the contents of the database to idb ourselves.
      // It gets handled via a symlink to the blocked fs (created by
      // `_createFile` above). However, we still need to record an
      // entry for the db file so the fs gets properly constructed on
      // startup
      await idb.set(store, { filepath, contents: '' });

      // Actually persist the data by going the FS, which will pass
      // the data through the symlink to the blocked fs. For some
      // reason we need to resolve symlinks ourselves.
      await Promise.resolve();
      FS.writeFile(resolveLink(filepath), contents);
    } else {
      await idb.set(store, { filepath, contents });
    }
  } else {
    FS.writeFile(resolveLink(filepath), contents);
  }
}

async function _removeFile(filepath) {
  if (!NO_PERSIST && filepath.startsWith('/documents')) {
    let isDb = filepath.endsWith('.sqlite');

    // Remove from IDB
    let { store } = idb.getStore(await idb.getDatabase(), 'files');
    await idb.del(store, filepath);

    // If this is the database, is has been symlinked and we want to
    // remove the actual contents
    if (isDb) {
      let linked = resolveLink(filepath);
      // Be resilient to fs corruption: don't throw an error by trying
      // to remove a file that doesn't exist. For some reason the db
      // file is gone? It's ok, just ignore it
      if (_exists(linked)) {
        FS.unlink(linked);
      }
    }
  }

  // Finally, remove any in-memory instance
  FS.unlink(filepath);
}

// Load files from the server that should exist by default
async function populateDefaultFilesystem() {
  let index = await (
    await fetch(process.env.PUBLIC_URL + 'data-file-index.txt')
  ).text();
  let files = index
    .split('\n')
    .map(name => name.trim())
    .filter(name => name !== '');
  let fetchFile = url => fetch(url).then(res => res.arrayBuffer());

  // This is hardcoded. We know we must create the migrations
  // directory, it's not worth complicating the index to support
  // creating arbitrary folders.
  await mkdir('/migrations');
  await mkdir('/demo-budget');

  await Promise.all(
    files.map(async file => {
      let contents = await fetchFile(process.env.PUBLIC_URL + 'data/' + file);
      _writeFile('/' + file, contents);
    })
  );
}

async function populateFileHeirarchy() {
  let { store } = idb.getStore(await idb.getDatabase(), 'files');
  let req = store.getAllKeys();
  let paths = await new Promise((resolve, reject) => {
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e);
  });

  for (let path of paths) {
    _mkdirRecursively(basename(path));
    _createFile(path);
  }
}

async function init() {
  let Module = _getModule();
  FS = Module.FS;

  // When a user "uploads" a file, we just put it in memory in this
  // dir and the backend takes it from there
  FS.mkdir('/uploads');

  // Files in /documents are actually read/written from idb.
  // Everything in there is automatically persisted
  FS.mkdir('/documents');

  // Files in /blocked are handled by the BlockedFS, which is a
  // special fs that persists files in blocks. This is necessary
  // for sqlite3
  FS.mkdir('/blocked');

  // Jest doesn't support workers. Right now we disable the blocked fs
  // backend under testing and just test that the directory structure
  // is created correctly. We assume the the absurd-sql project tests
  // the blocked fs enough. Additionally, we don't populate the
  // default files in testing.
  if (!global.__TESTING__) {
    let backend = new IndexedDBBackend(() => {
      connection.send('fallback-write-error');
    });
    BFS = new SQLiteFS(FS, backend);
    Module.register_for_idb(BFS);

    FS.mount(BFS, {}, '/blocked');

    await populateDefaultFilesystem();
  }

  await populateFileHeirarchy();
}

function shutdown() {
  BFS.backend.shutdown();
}

function basename(filepath) {
  let parts = filepath.split('/');
  return parts.slice(0, -1).join('/');
}

async function listDir(filepath) {
  let paths = FS.readdir(filepath);
  return paths.filter(p => p !== '.' && p !== '..');
}

async function exists(filepath) {
  return _exists(filepath);
}

async function mkdir(filepath) {
  FS.mkdir(filepath);
}

async function size(filepath) {
  let attrs = FS.stat(resolveLink(filepath));
  return attrs.size;
}

async function copyFile(frompath, topath) {
  // TODO: This reads the whole file into memory, but that's probably
  // not a problem. This could be optimized
  let contents = await _readFile(frompath);
  return _writeFile(topath, contents);
}

async function readFile(filepath, encoding = 'utf8') {
  return _readFile(filepath, { encoding });
}

async function writeFile(filepath, contents) {
  return _writeFile(filepath, contents);
}

async function removeFile(filepath) {
  return _removeFile(filepath);
}

async function removeDir(filepath) {
  FS.rmdir(filepath);
}

async function removeDirRecursively(dirpath) {
  if (await exists(dirpath)) {
    for (let file of await listDir(dirpath)) {
      let fullpath = join(dirpath, file);
      // `true` here means to not follow symlinks
      let attr = FS.stat(fullpath, true);

      if (FS.isDir(attr.mode)) {
        await removeDirRecursively(fullpath);
      } else {
        await removeFile(fullpath);
      }
    }

    await removeDir(dirpath);
  }
}

async function getModifiedTime(filepath) {
  throw new Error(
    'getModifiedTime not supported on the web (only used for backups)'
  );
}

module.exports = {
  pathToId,
  populateFileHeirarchy,
  init,
  shutdown,
  bundledDatabasePath: '/default-db.sqlite',
  migrationsPath: '/migrations',
  demoBudgetPath: '/demo-budget',
  getDataDir: baseAPI.getDataDir,
  getDocumentDir: baseAPI.getDocumentDir,
  getBudgetDir: baseAPI.getBudgetDir,
  _setDocumentDir: baseAPI._setDocumentDir,
  join,
  basename,
  listDir,
  exists,
  mkdir,
  size,
  copyFile,
  readFile,
  writeFile,
  removeFile,
  removeDir,
  removeDirRecursively,
  getModifiedTime
};
