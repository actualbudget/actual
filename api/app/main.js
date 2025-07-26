"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const fs$1 = require("fs");
const path = require("path");
const promiseRetry = require("promise-retry");
const SQL = require("better-sqlite3");
const uuid = require("uuid");
const lruCache = require("lru-cache");
const i18next = require("i18next");
const d = require("date-fns");
const memoizeOne = require("memoize-one");
const mitt = require("mitt");
const murmurhash = require("murmurhash");
const locales = require("date-fns/locale");
const crypto = require("crypto");
const AdmZip = require("adm-zip");
const Handlebars = require("handlebars/dist/handlebars.js");
require("@rschedule/standard-date-adapter/setup");
const standardDateAdapter = require("@rschedule/standard-date-adapter");
const deepEqual = require("deep-equal");
const isMatch = require("lodash/isMatch.js");
const sync$1 = require("csv-stringify/sync");
const sync$2 = require("csv-parse/sync");
const xml2js = require("xml2js");
const normalizePathSep = require("slash");
const md5 = require("md5");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d2 = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d2.get ? d2 : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs$1);
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const d__namespace = /* @__PURE__ */ _interopNamespaceDefault(d);
const locales__namespace = /* @__PURE__ */ _interopNamespaceDefault(locales);
const Handlebars__namespace = /* @__PURE__ */ _interopNamespaceDefault(Handlebars);
const db$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get all() {
    return all;
  },
  get asyncTransaction() {
    return asyncTransaction;
  },
  get cache() {
    return cache;
  },
  get closeDatabase() {
    return closeDatabase;
  },
  get deleteAccount() {
    return deleteAccount;
  },
  get deleteAll() {
    return deleteAll;
  },
  get deleteCategory() {
    return deleteCategory$1;
  },
  get deleteCategoryGroup() {
    return deleteCategoryGroup$1;
  },
  get deletePayee() {
    return deletePayee;
  },
  get deleteTag() {
    return deleteTag$1;
  },
  get deleteTransaction() {
    return deleteTransaction$2;
  },
  get deleteTransferPayee() {
    return deleteTransferPayee;
  },
  get delete_() {
    return delete_;
  },
  get execQuery() {
    return execQuery;
  },
  get first() {
    return first;
  },
  get firstSync() {
    return firstSync;
  },
  get fromDateRepr() {
    return fromDateRepr;
  },
  get getAccount() {
    return getAccount;
  },
  get getAccounts() {
    return getAccounts$2;
  },
  get getCategories() {
    return getCategories$3;
  },
  get getCategoriesGrouped() {
    return getCategoriesGrouped;
  },
  get getCommonPayees() {
    return getCommonPayees$1;
  },
  get getDatabase() {
    return getDatabase;
  },
  get getDatabasePath() {
    return getDatabasePath;
  },
  get getOrphanedPayees() {
    return getOrphanedPayees$1;
  },
  get getPayee() {
    return getPayee$1;
  },
  get getPayeeByName() {
    return getPayeeByName;
  },
  get getPayees() {
    return getPayees$2;
  },
  get getTags() {
    return getTags$1;
  },
  get getTransaction() {
    return getTransaction;
  },
  get getTransactions() {
    return getTransactions$1;
  },
  get insert() {
    return insert;
  },
  get insertAccount() {
    return insertAccount;
  },
  get insertCategory() {
    return insertCategory;
  },
  get insertCategoryGroup() {
    return insertCategoryGroup;
  },
  get insertPayee() {
    return insertPayee;
  },
  get insertTag() {
    return insertTag;
  },
  get insertTransaction() {
    return insertTransaction;
  },
  get insertWithSchema() {
    return insertWithSchema;
  },
  get insertWithUUID() {
    return insertWithUUID;
  },
  get loadClock() {
    return loadClock;
  },
  get mergePayees() {
    return mergePayees$1;
  },
  get moveAccount() {
    return moveAccount$1;
  },
  get moveCategory() {
    return moveCategory$1;
  },
  get moveCategoryGroup() {
    return moveCategoryGroup$1;
  },
  get openDatabase() {
    return openDatabase;
  },
  get run() {
    return run;
  },
  get runQuery() {
    return runQuery;
  },
  get select() {
    return select;
  },
  get selectFirstWithSchema() {
    return selectFirstWithSchema;
  },
  get selectWithSchema() {
    return selectWithSchema;
  },
  get setDatabase() {
    return setDatabase;
  },
  get syncGetOrphanedPayees() {
    return syncGetOrphanedPayees;
  },
  get toDateRepr() {
    return toDateRepr;
  },
  get transaction() {
    return transaction;
  },
  get update() {
    return update;
  },
  get updateAccount() {
    return updateAccount$1;
  },
  get updateCategory() {
    return updateCategory$1;
  },
  get updateCategoryGroup() {
    return updateCategoryGroup$1;
  },
  get updatePayee() {
    return updatePayee;
  },
  get updateTag() {
    return updateTag$1;
  },
  get updateTransaction() {
    return updateTransaction$2;
  },
  get updateWithSchema() {
    return updateWithSchema;
  }
}, Symbol.toStringTag, { value: "Module" }));
let send$2;
function override(sendImplementation) {
  send$2 = sendImplementation;
}
let documentDir;
const _setDocumentDir = (dir) => documentDir = dir;
const getDocumentDir = () => {
  if (!documentDir) {
    throw new Error("Document directory is not set");
  }
  return documentDir;
};
const getBudgetDir = (id) => {
  if (!id) {
    throw new Error("getDocumentDir: id is falsy: " + id);
  }
  if (id.match(/[^A-Za-z0-9\-_]/)) {
    throw new Error(
      `Invalid budget id “${id}”. Check the id of your budget in the Advanced section of the settings page.`
    );
  }
  return path.join(getDocumentDir(), id);
};
let rootPath = path__namespace.join(__dirname, "..", "..", "..", "..");
switch (path__namespace.basename(__filename)) {
  case "bundle.api.js":
    rootPath = path__namespace.join(__dirname, "..");
    break;
  case "bundle.desktop.js":
    rootPath = path__namespace.join(__dirname, "..", "..");
    break;
}
const init$4 = () => {
};
const getDataDir = () => {
  if (!process.env.ACTUAL_DATA_DIR) {
    throw new Error("ACTUAL_DATA_DIR env variable is required");
  }
  return process.env.ACTUAL_DATA_DIR;
};
const bundledDatabasePath = path__namespace.join(rootPath, "default-db.sqlite");
const migrationsPath = path__namespace.join(rootPath, "migrations");
const demoBudgetPath = path__namespace.join(rootPath, "demo-budget");
const join$1 = path__namespace.join;
const basename = (filepath) => path__namespace.basename(filepath);
const listDir = (filepath) => new Promise((resolve, reject) => {
  fs__namespace.readdir(filepath, (err, files) => {
    if (err) {
      reject(err);
    } else {
      resolve(files);
    }
  });
});
const exists = (filepath) => new Promise((resolve) => {
  fs__namespace.access(filepath, fs__namespace.constants.F_OK, (err) => {
    return resolve(!err);
  });
});
const mkdir = (filepath) => new Promise((resolve, reject) => {
  fs__namespace.mkdir(filepath, (err) => {
    if (err) {
      reject(err);
    } else {
      resolve(void 0);
    }
  });
});
const size = (filepath) => new Promise((resolve, reject) => {
  fs__namespace.stat(filepath, (err, stats) => {
    if (err) {
      reject(err);
    } else {
      resolve(stats.size);
    }
  });
});
const copyFile = (frompath, topath) => {
  return new Promise((resolve, reject) => {
    const readStream = fs__namespace.createReadStream(frompath);
    const writeStream = fs__namespace.createWriteStream(topath);
    readStream.on("error", reject);
    writeStream.on("error", reject);
    writeStream.on("open", () => readStream.pipe(writeStream));
    writeStream.once("close", () => resolve(true));
  });
};
const readFile = (filepath, encoding = "utf8") => {
  if (encoding === "binary") {
    encoding = null;
  }
  return new Promise((resolve, reject) => {
    fs__namespace.readFile(filepath, encoding, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};
const writeFile = async (filepath, contents) => {
  try {
    await promiseRetry(
      (retry, attempt) => {
        return new Promise((resolve, reject) => {
          fs__namespace.writeFile(filepath, contents, "utf8", (err) => {
            if (err) {
              console.error(
                `Failed to write to ${filepath}. Attempted ${attempt} times. Something is locking the file - potentially a virus scanner or backup software.`
              );
              reject(err);
            } else {
              if (attempt > 1) {
                console.info(
                  `Successfully recovered from file lock. It took ${attempt} retries`
                );
              }
              resolve(void 0);
            }
          });
        }).catch(retry);
      },
      {
        retries: 20,
        minTimeout: 100,
        maxTimeout: 500,
        factor: 1.5
      }
    );
    return void 0;
  } catch (err) {
    console.error(`Unable to recover from file lock on file ${filepath}`);
    throw err;
  }
};
const removeFile$1 = (filepath) => {
  return new Promise(function(resolve, reject) {
    fs__namespace.unlink(filepath, (err) => {
      return err ? reject(err) : resolve(void 0);
    });
  });
};
const removeDir = (dirpath) => {
  return new Promise(function(resolve, reject) {
    fs__namespace.rmdir(dirpath, (err) => {
      return err ? reject(err) : resolve(void 0);
    });
  });
};
const removeDirRecursively = async (dirpath) => {
  if (await exists(dirpath)) {
    for (const file of await listDir(dirpath)) {
      const fullpath = join$1(dirpath, file);
      if (fs__namespace.statSync(fullpath).isDirectory()) {
        await removeDirRecursively(fullpath);
      } else {
        await removeFile$1(fullpath);
      }
    }
    await removeDir(dirpath);
  }
};
const getModifiedTime = (filepath) => {
  return new Promise(function(resolve, reject) {
    fs__namespace.stat(filepath, (err, stats) => {
      if (err) {
        reject(err);
      } else {
        resolve(new Date(stats.mtime));
      }
    });
  });
};
const fs = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  _setDocumentDir,
  basename,
  bundledDatabasePath,
  copyFile,
  demoBudgetPath,
  exists,
  getBudgetDir,
  getDataDir,
  getDocumentDir,
  getModifiedTime,
  init: init$4,
  join: join$1,
  listDir,
  migrationsPath,
  mkdir,
  readFile,
  removeDir,
  removeDirRecursively,
  removeFile: removeFile$1,
  size,
  writeFile
}, Symbol.toStringTag, { value: "Module" }));
const getStorePath = () => path.join(getDataDir(), "global-store.json");
let store;
let persisted = true;
const init$3 = function({ persist = true } = {}) {
  if (persist) {
    try {
      store = JSON.parse(fs__namespace.readFileSync(getStorePath(), "utf8"));
    } catch (e) {
      store = {};
    }
  } else {
    store = {};
  }
  persisted = persist;
};
function _saveStore() {
  if (persisted) {
    return new Promise(function(resolve, reject) {
      fs__namespace.writeFile(
        getStorePath(),
        JSON.stringify(store),
        "utf8",
        function(err) {
          return err ? reject(err) : resolve();
        }
      );
    });
  }
}
const getItem = function(key) {
  return new Promise(function(resolve) {
    return resolve(store[key]);
  });
};
const setItem = function(key, value) {
  store[key] = value;
  return _saveStore();
};
const removeItem = function(key) {
  delete store[key];
  return _saveStore();
};
async function multiGet(keys2) {
  const results = keys2.map((key) => [key, store[key]]);
  return results.reduce(
    (acc, [key, value]) => {
      acc[key] = value;
      return acc;
    },
    {}
  );
}
const multiRemove = function(keys2) {
  keys2.forEach(function(key) {
    delete store[key];
  });
  return _saveStore();
};
const init$2 = function() {
};
const send$1 = function() {
};
function getNormalisedString(value) {
  return value.toLowerCase().normalize("NFD").replace(new RegExp("\\p{Diacritic}", "gu"), "");
}
function normalise(value) {
  if (!value) {
    return null;
  }
  return getNormalisedString(value);
}
const likePatternCache = new lruCache.LRUCache({ max: 500 });
function unicodeLike(pattern, value) {
  if (!pattern) {
    return 0;
  }
  if (!value) {
    value = "";
  }
  let cachedRegExp = likePatternCache.get(pattern);
  if (!cachedRegExp) {
    const processedPattern = pattern.replace(/[.*+^${}()|[\]\\]/g, "\\$&").replaceAll("?", ".").replaceAll("%", ".*");
    cachedRegExp = new RegExp(processedPattern, "i");
    likePatternCache.set(pattern, cachedRegExp);
  }
  return cachedRegExp.test(value) ? 1 : 0;
}
function verifyParamTypes(sql, arr) {
  arr.forEach((val2) => {
    if (typeof val2 !== "string" && typeof val2 !== "number" && val2 !== null) {
      console.log(sql, arr);
      throw new Error("Invalid field type " + val2 + " for sql " + sql);
    }
  });
}
async function init$1() {
}
function prepare(db2, sql) {
  return db2.prepare(sql);
}
function runQuery$1(db2, sql, params = [], fetchAll2 = false) {
  if (params) {
    verifyParamTypes(sql, params);
  }
  let stmt;
  try {
    stmt = typeof sql === "string" ? db2.prepare(sql) : sql;
  } catch (e) {
    console.log("error", sql);
    throw e;
  }
  if (fetchAll2) {
    try {
      const result = stmt.all(...params);
      return result;
    } catch (e) {
      console.log("error", sql);
      throw e;
    }
  } else {
    try {
      const info = stmt.run(...params);
      return { changes: info.changes, insertId: info.lastInsertRowid };
    } catch (e) {
      throw e;
    }
  }
}
function execQuery$2(db2, sql) {
  db2.exec(sql);
}
function transaction$1(db2, fn) {
  db2.transaction(fn)();
}
let transactionDepth = 0;
async function asyncTransaction$1(db2, fn) {
  if (transactionDepth === 0) {
    db2.exec("BEGIN TRANSACTION");
  }
  transactionDepth++;
  try {
    await fn();
  } finally {
    transactionDepth--;
    if (transactionDepth === 0) {
      db2.exec("COMMIT");
    }
  }
}
function regexp(regex2, text) {
  return new RegExp(regex2).test(text || "") ? 1 : 0;
}
function openDatabase$1(pathOrBuffer) {
  const db2 = new SQL(pathOrBuffer);
  db2.function(
    "UNICODE_LOWER",
    { deterministic: true },
    (arg) => arg?.toLowerCase()
  );
  db2.function(
    "UNICODE_UPPER",
    { deterministic: true },
    (arg) => arg?.toUpperCase()
  );
  db2.function("UNICODE_LIKE", { deterministic: true }, unicodeLike);
  db2.function("REGEXP", { deterministic: true }, regexp);
  db2.function("NORMALISE", { deterministic: true }, normalise);
  return db2;
}
function closeDatabase$1(db2) {
  return db2.close();
}
async function exportDatabase(db2) {
  const name = `${process.env.ACTUAL_DATA_DIR}/backup-for-export-${uuid.v4()}.db`;
  await db2.backup(name);
  const data = await readFile(name, "binary");
  await removeFile$1(name);
  return data;
}
class Query {
  state;
  constructor(state) {
    this.state = {
      tableOptions: state.tableOptions || {},
      filterExpressions: state.filterExpressions || [],
      selectExpressions: state.selectExpressions || [],
      groupExpressions: state.groupExpressions || [],
      orderExpressions: state.orderExpressions || [],
      calculation: false,
      rawMode: false,
      withDead: false,
      validateRefs: true,
      limit: null,
      offset: null,
      ...state
    };
  }
  filter(expr) {
    return new Query({
      ...this.state,
      filterExpressions: [...this.state.filterExpressions, expr]
    });
  }
  unfilter(exprs) {
    if (!exprs) {
      return new Query({
        ...this.state,
        filterExpressions: []
      });
    }
    const exprSet = new Set(exprs);
    return new Query({
      ...this.state,
      filterExpressions: this.state.filterExpressions.filter(
        (expr) => !exprSet.has(Object.keys(expr)[0])
      )
    });
  }
  select(exprs = []) {
    if (!Array.isArray(exprs)) {
      exprs = [exprs];
    }
    return new Query({
      ...this.state,
      selectExpressions: exprs,
      calculation: false
    });
  }
  calculate(expr) {
    return new Query({
      ...this.state,
      selectExpressions: [{ result: expr }],
      calculation: true
    });
  }
  groupBy(exprs) {
    if (!Array.isArray(exprs)) {
      exprs = [exprs];
    }
    return new Query({
      ...this.state,
      groupExpressions: [...this.state.groupExpressions, ...exprs]
    });
  }
  orderBy(exprs) {
    if (!Array.isArray(exprs)) {
      exprs = [exprs];
    }
    return new Query({
      ...this.state,
      orderExpressions: [...this.state.orderExpressions, ...exprs]
    });
  }
  limit(num2) {
    return new Query({ ...this.state, limit: num2 });
  }
  offset(num2) {
    return new Query({ ...this.state, offset: num2 });
  }
  raw() {
    return new Query({ ...this.state, rawMode: true });
  }
  withDead() {
    return new Query({ ...this.state, withDead: true });
  }
  withoutValidatedRefs() {
    return new Query({ ...this.state, validateRefs: false });
  }
  options(opts) {
    return new Query({ ...this.state, tableOptions: opts });
  }
  reset() {
    return q(this.state.table);
  }
  serialize() {
    return this.state;
  }
  serializeAsString() {
    return JSON.stringify(this.serialize());
  }
}
function q(table) {
  return new Query({ table });
}
const captureException = function(exc) {
  console.error("[Exception]", exc);
};
const captureBreadcrumb = function(crumb) {
};
function isPreviewEnvironment() {
  return String(process.env.REACT_APP_NETLIFY) === "true";
}
function isDevelopmentEnvironment() {
  return process.env.NODE_ENV === "development";
}
function isNonProductionEnvironment() {
  return isPreviewEnvironment() || isDevelopmentEnvironment();
}
const os = require("os");
os.platform() === "win32";
os.platform() === "darwin";
os.platform() === "linux";
const isPlaywright = false;
const isBrowser = false;
function _parse(value) {
  if (typeof value === "string") {
    const [year, month, day] = value.split("-");
    if (day != null) {
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12);
    } else if (month != null) {
      return new Date(parseInt(year), parseInt(month) - 1, 1, 12);
    } else {
      return new Date(parseInt(year), 0, 1, 12);
    }
  }
  if (typeof value === "number") {
    return new Date(value);
  }
  return value;
}
const parseDate$1 = _parse;
function yearFromDate(date) {
  return d__namespace.format(_parse(date), "yyyy");
}
function monthFromDate(date) {
  return d__namespace.format(_parse(date), "yyyy-MM");
}
function dayFromDate(date) {
  return d__namespace.format(_parse(date), "yyyy-MM-dd");
}
function currentMonth() {
  if (global.IS_TESTING || isPlaywright) {
    return global.currentMonth || "2017-01";
  } else {
    return d__namespace.format(/* @__PURE__ */ new Date(), "yyyy-MM");
  }
}
function currentDate() {
  if (global.IS_TESTING || isPlaywright) {
    return d__namespace.parse(currentDay(), "yyyy-MM-dd", /* @__PURE__ */ new Date());
  }
  return /* @__PURE__ */ new Date();
}
function currentDay() {
  if (global.IS_TESTING || isPlaywright) {
    return "2017-01-01";
  } else {
    return d__namespace.format(/* @__PURE__ */ new Date(), "yyyy-MM-dd");
  }
}
function nextMonth(month) {
  return d__namespace.format(d__namespace.addMonths(_parse(month), 1), "yyyy-MM");
}
function prevMonth(month) {
  return d__namespace.format(d__namespace.subMonths(_parse(month), 1), "yyyy-MM");
}
function addYears(year, n) {
  return d__namespace.format(d__namespace.addYears(_parse(year), n), "yyyy");
}
function addMonths(month, n) {
  return d__namespace.format(d__namespace.addMonths(_parse(month), n), "yyyy-MM");
}
function addWeeks(date, n) {
  return d__namespace.format(d__namespace.addWeeks(_parse(date), n), "yyyy-MM-dd");
}
function differenceInCalendarMonths(month1, month2) {
  return d__namespace.differenceInCalendarMonths(_parse(month1), _parse(month2));
}
function differenceInCalendarDays(month1, month2) {
  return d__namespace.differenceInCalendarDays(_parse(month1), _parse(month2));
}
function subMonths(month, n) {
  return d__namespace.format(d__namespace.subMonths(_parse(month), n), "yyyy-MM");
}
function subWeeks(date, n) {
  return d__namespace.format(d__namespace.subWeeks(_parse(date), n), "yyyy-MM-dd");
}
function addDays(day, n) {
  return d__namespace.format(d__namespace.addDays(_parse(day), n), "yyyy-MM-dd");
}
function subDays(day, n) {
  return d__namespace.format(d__namespace.subDays(_parse(day), n), "yyyy-MM-dd");
}
function isBefore(month1, month2) {
  return d__namespace.isBefore(_parse(month1), _parse(month2));
}
function isAfter(month1, month2) {
  return d__namespace.isAfter(_parse(month1), _parse(month2));
}
function bounds(month) {
  return {
    start: parseInt(d__namespace.format(d__namespace.startOfMonth(_parse(month)), "yyyyMMdd")),
    end: parseInt(d__namespace.format(d__namespace.endOfMonth(_parse(month)), "yyyyMMdd"))
  };
}
function _range(start, end, inclusive = false) {
  const months = [];
  let month = monthFromDate(start);
  const endMonth = monthFromDate(end);
  while (d__namespace.isBefore(_parse(month), _parse(endMonth))) {
    months.push(month);
    month = addMonths(month, 1);
  }
  if (inclusive) {
    months.push(month);
  }
  return months;
}
function range(start, end) {
  return _range(start, end);
}
function rangeInclusive(start, end) {
  return _range(start, end, true);
}
function getMonth(day) {
  return day.slice(0, 7);
}
function getDay(day) {
  return Number(d__namespace.format(_parse(day), "dd"));
}
function getMonthEnd(day) {
  return subDays(nextMonth(day.slice(0, 7)) + "-01", 1);
}
function sheetForMonth(month) {
  return "budget" + month.replace("-", "");
}
function format(month, format2, locale) {
  return d__namespace.format(_parse(month), format2, { locale });
}
memoizeOne((format2) => {
  return new RegExp(
    format2.replace(/d+/g, "\\d{1,2}").replace(/M+/g, "\\d{1,2}").replace(/y+/g, "\\d{4}")
  );
});
memoizeOne((format2) => {
  return format2.replace(/y+/g, "").replace(/[^\w]$/, "").replace(/^[^\w]/, "");
});
memoizeOne((format2) => {
  const regex2 = format2.replace(/y+/g, "").replace(/[^\w]$/, "").replace(/^[^\w]/, "").replace(/d+/g, "\\d{1,2}").replace(/M+/g, "\\d{1,2}");
  return new RegExp("^" + regex2 + "$");
});
memoizeOne((format2) => {
  return format2.replace(/d+/g, "").replace(/[^\w]$/, "").replace(/^[^\w]/, "").replace(/\/\//, "/").replace(/\.\./, ".").replace(/--/, "-");
});
memoizeOne((format2) => {
  const regex2 = format2.replace(/d+/g, "").replace(/[^\w]$/, "").replace(/^[^\w]/, "").replace(/\/\//, "/").replace(/M+/g, "\\d{1,2}").replace(/y+/g, "\\d{2,4}");
  return new RegExp("^" + regex2 + "$");
});
memoizeOne((format2) => {
  return format2.replace(/y+/g, "yy");
});
memoizeOne((format2) => {
  const regex2 = format2.replace(/[^\w]$/, "").replace(/^[^\w]/, "").replace(/d+/g, "\\d{1,2}").replace(/M+/g, "\\d{1,2}").replace(/y+/g, "\\d{2}");
  return new RegExp("^" + regex2 + "$");
});
function last(arr) {
  return arr[arr.length - 1];
}
function getChangedValues(obj1, obj2) {
  const diff2 = {};
  const keys2 = Object.keys(obj2);
  let hasChanged = false;
  if (obj1.id) {
    diff2.id = obj1.id;
  }
  for (let i = 0; i < keys2.length; i++) {
    const key = keys2[i];
    if (obj1[key] !== obj2[key]) {
      diff2[key] = obj2[key];
      hasChanged = true;
    }
  }
  return hasChanged ? diff2 : null;
}
function hasFieldsChanged(obj1, obj2, fields) {
  let changed = false;
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (obj1[field] !== obj2[field]) {
      changed = true;
      break;
    }
  }
  return changed;
}
function partitionByField(data, field) {
  const res = /* @__PURE__ */ new Map();
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const key = item[field];
    const items = res.get(key) || [];
    items.push(item);
    res.set(key, items);
  }
  return res;
}
function groupBy(data, field) {
  const res = /* @__PURE__ */ new Map();
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const key = item[field];
    const existing = res.get(key) || [];
    res.set(key, existing.concat([item]));
  }
  return res;
}
function _groupById(data) {
  const res = /* @__PURE__ */ new Map();
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    res.set(item.id, item);
  }
  return res;
}
function diffItems(items, newItems) {
  const grouped = _groupById(items);
  const newGrouped = _groupById(newItems);
  const added = [];
  const updated = [];
  const deleted = items.filter((item) => !newGrouped.has(item.id)).map((item) => ({ id: item.id }));
  newItems.forEach((newItem) => {
    const item = grouped.get(newItem.id);
    if (!item) {
      added.push(newItem);
    } else {
      const changes = getChangedValues(item, newItem);
      if (changes) {
        updated.push(changes);
      }
    }
  });
  return { added, updated, deleted };
}
function groupById(data) {
  if (!data) {
    return {};
  }
  const res = {};
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    res[item.id] = item;
  }
  return res;
}
function setIn(map, keys2, item) {
  for (let i = 0; i < keys2.length; i++) {
    const key = keys2[i];
    if (i === keys2.length - 1) {
      map.set(key, item);
    } else {
      if (!map.has(key)) {
        map.set(key, /* @__PURE__ */ new Map());
      }
      map = map.get(key);
    }
  }
}
function getIn(map, keys2) {
  let item = map;
  for (let i = 0; i < keys2.length; i++) {
    item = item.get(keys2[i]);
    if (item == null) {
      return item;
    }
  }
  return item;
}
function fastSetMerge(set1, set2) {
  const finalSet = new Set(set1);
  const iter = set2.values();
  let value = iter.next();
  while (!value.done) {
    finalSet.add(value.value);
    value = iter.next();
  }
  return finalSet;
}
let numberFormatConfig = {
  format: "comma-dot",
  hideFraction: false
};
function getNumberFormat({
  format: format2 = numberFormatConfig.format,
  hideFraction = numberFormatConfig.hideFraction,
  decimalPlaces
} = numberFormatConfig) {
  let locale, thousandsSeparator, decimalSeparator;
  const currentFormat = format2 || numberFormatConfig.format;
  const currentHideFraction = typeof hideFraction === "boolean" ? hideFraction : numberFormatConfig.hideFraction;
  switch (format2) {
    case "space-comma":
      locale = "en-SE";
      thousandsSeparator = " ";
      decimalSeparator = ",";
      break;
    case "dot-comma":
      locale = "de-DE";
      thousandsSeparator = ".";
      decimalSeparator = ",";
      break;
    case "apostrophe-dot":
      locale = "de-CH";
      thousandsSeparator = "’";
      decimalSeparator = ".";
      break;
    case "comma-dot-in":
      locale = "en-IN";
      thousandsSeparator = ",";
      decimalSeparator = ".";
      break;
    case "comma-dot":
    default:
      locale = "en-US";
      thousandsSeparator = ",";
      decimalSeparator = ".";
  }
  const fractionDigitsOptions = typeof decimalPlaces === "number" ? {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  } : {
    minimumFractionDigits: currentHideFraction ? 0 : 2,
    maximumFractionDigits: currentHideFraction ? 0 : 2
  };
  return {
    value: currentFormat,
    thousandsSeparator,
    decimalSeparator,
    formatter: new Intl.NumberFormat(locale, fractionDigitsOptions)
  };
}
const MAX_SAFE_NUMBER = 2 ** 51 - 1;
const MIN_SAFE_NUMBER = -2251799813685247;
function safeNumber(value) {
  if (!Number.isInteger(value)) {
    throw new Error(
      "safeNumber: number is not an integer: " + JSON.stringify(value)
    );
  }
  if (value > MAX_SAFE_NUMBER || value < MIN_SAFE_NUMBER) {
    throw new Error(
      "safeNumber: can’t safely perform arithmetic with number: " + value
    );
  }
  return value;
}
function integerToCurrency(integerAmount, formatter = getNumberFormat().formatter, decimalPlaces = 2) {
  const divisor = Math.pow(10, decimalPlaces);
  const amount = safeNumber(integerAmount) / divisor;
  return formatter.format(amount);
}
function stringToInteger(str) {
  const amount = parseInt(str.replace(/[^-0-9.,]/g, ""));
  if (!isNaN(amount)) {
    return amount;
  }
  return null;
}
function amountToInteger$1(amount, decimalPlaces = 2) {
  const multiplier = Math.pow(10, decimalPlaces);
  return Math.round(amount * multiplier);
}
function integerToAmount(integerAmount, decimalPlaces = 2) {
  const divisor = Math.pow(10, decimalPlaces);
  return integerAmount / divisor;
}
function looselyParseAmount(amount) {
  function safeNumber2(v) {
    if (isNaN(v)) {
      return null;
    }
    const value = v * 100;
    if (value > MAX_SAFE_NUMBER || value < MIN_SAFE_NUMBER) {
      return null;
    }
    return v;
  }
  function extractNumbers(v) {
    return v.replace(/[^0-9-]/g, "");
  }
  if (amount.startsWith("(") && amount.endsWith(")")) {
    amount = amount.replace("(", "-").replace(")", "");
  }
  const m = amount.match(/[.,]([^.,]{4,9}|[^.,]{1,2})$/);
  if (!m || m.index === void 0) {
    return safeNumber2(parseFloat(extractNumbers(amount)));
  }
  const left = extractNumbers(amount.slice(0, m.index));
  const right = extractNumbers(amount.slice(m.index + 1));
  return safeNumber2(parseFloat(left + "." + right));
}
function sortByKey(arr, key) {
  return [...arr].sort((item1, item2) => {
    if (item1[key] < item2[key]) {
      return -1;
    } else if (item1[key] > item2[key]) {
      return 1;
    }
    return 0;
  });
}
class App {
  events;
  handlers;
  services;
  unlistenServices;
  constructor() {
    this.handlers = {};
    this.services = [];
    this.events = mitt();
    this.unlistenServices = [];
  }
  method(name, func) {
    if (this.handlers[name] != null) {
      throw new Error(
        "Conflicting method name, names must be globally unique: " + name
      );
    }
    this.handlers[name] = func;
  }
  service(func) {
    this.services.push(func);
  }
  combine(...apps) {
    for (const app2 of apps) {
      Object.keys(app2.handlers).forEach((name) => {
        this.method(name, app2.handlers[name]);
      });
      app2.services.forEach((service) => {
        this.service(service);
      });
      for (const [name, listeners] of app2.events.all.entries()) {
        for (const listener of listeners) {
          this.events.on(name, listener);
        }
      }
    }
  }
  startServices() {
    if (this.unlistenServices.length > 0) {
      captureException(
        new Error(
          "App: startServices called while services are already running"
        )
      );
    }
    this.unlistenServices = this.services.map((service) => service());
  }
  stopServices() {
    this.unlistenServices.forEach((unlisten2) => {
      if (unlisten2) {
        unlisten2();
      }
    });
    this.unlistenServices = [];
  }
}
function createApp() {
  return new App();
}
var jspb = require("google-protobuf");
var goog = jspb;
var global$1 = globalThis;
goog.exportSymbol("proto.EncryptedData", null, global$1);
goog.exportSymbol("proto.Message", null, global$1);
goog.exportSymbol("proto.MessageEnvelope", null, global$1);
goog.exportSymbol("proto.SyncRequest", null, global$1);
goog.exportSymbol("proto.SyncResponse", null, global$1);
proto.EncryptedData = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.EncryptedData, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.EncryptedData.displayName = "proto.EncryptedData";
}
proto.Message = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.Message, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.Message.displayName = "proto.Message";
}
proto.MessageEnvelope = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.MessageEnvelope, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.MessageEnvelope.displayName = "proto.MessageEnvelope";
}
proto.SyncRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.SyncRequest.repeatedFields_, null);
};
goog.inherits(proto.SyncRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.SyncRequest.displayName = "proto.SyncRequest";
}
proto.SyncResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.SyncResponse.repeatedFields_, null);
};
goog.inherits(proto.SyncResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.SyncResponse.displayName = "proto.SyncResponse";
}
if (jspb.Message.GENERATE_TO_OBJECT) {
  proto.EncryptedData.prototype.toObject = function(opt_includeInstance) {
    return proto.EncryptedData.toObject(opt_includeInstance, this);
  };
  proto.EncryptedData.toObject = function(includeInstance, msg) {
    var obj = {
      iv: msg.getIv_asB64(),
      authtag: msg.getAuthtag_asB64(),
      data: msg.getData_asB64()
    };
    if (includeInstance) {
      obj.$jspbMessageInstance = msg;
    }
    return obj;
  };
}
proto.EncryptedData.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.EncryptedData();
  return proto.EncryptedData.deserializeBinaryFromReader(msg, reader);
};
proto.EncryptedData.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
      case 1:
        var value = (
          /** @type {!Uint8Array} */
          reader.readBytes()
        );
        msg.setIv(value);
        break;
      case 2:
        var value = (
          /** @type {!Uint8Array} */
          reader.readBytes()
        );
        msg.setAuthtag(value);
        break;
      case 3:
        var value = (
          /** @type {!Uint8Array} */
          reader.readBytes()
        );
        msg.setData(value);
        break;
      default:
        reader.skipField();
        break;
    }
  }
  return msg;
};
proto.EncryptedData.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.EncryptedData.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};
proto.EncryptedData.serializeBinaryToWriter = function(message, writer) {
  var f2 = void 0;
  f2 = message.getIv_asU8();
  if (f2.length > 0) {
    writer.writeBytes(
      1,
      f2
    );
  }
  f2 = message.getAuthtag_asU8();
  if (f2.length > 0) {
    writer.writeBytes(
      2,
      f2
    );
  }
  f2 = message.getData_asU8();
  if (f2.length > 0) {
    writer.writeBytes(
      3,
      f2
    );
  }
};
proto.EncryptedData.prototype.getIv = function() {
  return (
    /** @type {!(string|Uint8Array)} */
    jspb.Message.getFieldWithDefault(this, 1, "")
  );
};
proto.EncryptedData.prototype.getIv_asB64 = function() {
  return (
    /** @type {string} */
    jspb.Message.bytesAsB64(
      this.getIv()
    )
  );
};
proto.EncryptedData.prototype.getIv_asU8 = function() {
  return (
    /** @type {!Uint8Array} */
    jspb.Message.bytesAsU8(
      this.getIv()
    )
  );
};
proto.EncryptedData.prototype.setIv = function(value) {
  return jspb.Message.setProto3BytesField(this, 1, value);
};
proto.EncryptedData.prototype.getAuthtag = function() {
  return (
    /** @type {!(string|Uint8Array)} */
    jspb.Message.getFieldWithDefault(this, 2, "")
  );
};
proto.EncryptedData.prototype.getAuthtag_asB64 = function() {
  return (
    /** @type {string} */
    jspb.Message.bytesAsB64(
      this.getAuthtag()
    )
  );
};
proto.EncryptedData.prototype.getAuthtag_asU8 = function() {
  return (
    /** @type {!Uint8Array} */
    jspb.Message.bytesAsU8(
      this.getAuthtag()
    )
  );
};
proto.EncryptedData.prototype.setAuthtag = function(value) {
  return jspb.Message.setProto3BytesField(this, 2, value);
};
proto.EncryptedData.prototype.getData = function() {
  return (
    /** @type {!(string|Uint8Array)} */
    jspb.Message.getFieldWithDefault(this, 3, "")
  );
};
proto.EncryptedData.prototype.getData_asB64 = function() {
  return (
    /** @type {string} */
    jspb.Message.bytesAsB64(
      this.getData()
    )
  );
};
proto.EncryptedData.prototype.getData_asU8 = function() {
  return (
    /** @type {!Uint8Array} */
    jspb.Message.bytesAsU8(
      this.getData()
    )
  );
};
proto.EncryptedData.prototype.setData = function(value) {
  return jspb.Message.setProto3BytesField(this, 3, value);
};
if (jspb.Message.GENERATE_TO_OBJECT) {
  proto.Message.prototype.toObject = function(opt_includeInstance) {
    return proto.Message.toObject(opt_includeInstance, this);
  };
  proto.Message.toObject = function(includeInstance, msg) {
    var obj = {
      dataset: jspb.Message.getFieldWithDefault(msg, 1, ""),
      row: jspb.Message.getFieldWithDefault(msg, 2, ""),
      column: jspb.Message.getFieldWithDefault(msg, 3, ""),
      value: jspb.Message.getFieldWithDefault(msg, 4, "")
    };
    if (includeInstance) {
      obj.$jspbMessageInstance = msg;
    }
    return obj;
  };
}
proto.Message.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.Message();
  return proto.Message.deserializeBinaryFromReader(msg, reader);
};
proto.Message.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
      case 1:
        var value = (
          /** @type {string} */
          reader.readString()
        );
        msg.setDataset(value);
        break;
      case 2:
        var value = (
          /** @type {string} */
          reader.readString()
        );
        msg.setRow(value);
        break;
      case 3:
        var value = (
          /** @type {string} */
          reader.readString()
        );
        msg.setColumn(value);
        break;
      case 4:
        var value = (
          /** @type {string} */
          reader.readString()
        );
        msg.setValue(value);
        break;
      default:
        reader.skipField();
        break;
    }
  }
  return msg;
};
proto.Message.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.Message.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};
proto.Message.serializeBinaryToWriter = function(message, writer) {
  var f2 = void 0;
  f2 = message.getDataset();
  if (f2.length > 0) {
    writer.writeString(
      1,
      f2
    );
  }
  f2 = message.getRow();
  if (f2.length > 0) {
    writer.writeString(
      2,
      f2
    );
  }
  f2 = message.getColumn();
  if (f2.length > 0) {
    writer.writeString(
      3,
      f2
    );
  }
  f2 = message.getValue();
  if (f2.length > 0) {
    writer.writeString(
      4,
      f2
    );
  }
};
proto.Message.prototype.getDataset = function() {
  return (
    /** @type {string} */
    jspb.Message.getFieldWithDefault(this, 1, "")
  );
};
proto.Message.prototype.setDataset = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};
proto.Message.prototype.getRow = function() {
  return (
    /** @type {string} */
    jspb.Message.getFieldWithDefault(this, 2, "")
  );
};
proto.Message.prototype.setRow = function(value) {
  return jspb.Message.setProto3StringField(this, 2, value);
};
proto.Message.prototype.getColumn = function() {
  return (
    /** @type {string} */
    jspb.Message.getFieldWithDefault(this, 3, "")
  );
};
proto.Message.prototype.setColumn = function(value) {
  return jspb.Message.setProto3StringField(this, 3, value);
};
proto.Message.prototype.getValue = function() {
  return (
    /** @type {string} */
    jspb.Message.getFieldWithDefault(this, 4, "")
  );
};
proto.Message.prototype.setValue = function(value) {
  return jspb.Message.setProto3StringField(this, 4, value);
};
if (jspb.Message.GENERATE_TO_OBJECT) {
  proto.MessageEnvelope.prototype.toObject = function(opt_includeInstance) {
    return proto.MessageEnvelope.toObject(opt_includeInstance, this);
  };
  proto.MessageEnvelope.toObject = function(includeInstance, msg) {
    var obj = {
      timestamp: jspb.Message.getFieldWithDefault(msg, 1, ""),
      isencrypted: jspb.Message.getBooleanFieldWithDefault(msg, 2, false),
      content: msg.getContent_asB64()
    };
    if (includeInstance) {
      obj.$jspbMessageInstance = msg;
    }
    return obj;
  };
}
proto.MessageEnvelope.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.MessageEnvelope();
  return proto.MessageEnvelope.deserializeBinaryFromReader(msg, reader);
};
proto.MessageEnvelope.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
      case 1:
        var value = (
          /** @type {string} */
          reader.readString()
        );
        msg.setTimestamp(value);
        break;
      case 2:
        var value = (
          /** @type {boolean} */
          reader.readBool()
        );
        msg.setIsencrypted(value);
        break;
      case 3:
        var value = (
          /** @type {!Uint8Array} */
          reader.readBytes()
        );
        msg.setContent(value);
        break;
      default:
        reader.skipField();
        break;
    }
  }
  return msg;
};
proto.MessageEnvelope.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.MessageEnvelope.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};
proto.MessageEnvelope.serializeBinaryToWriter = function(message, writer) {
  var f2 = void 0;
  f2 = message.getTimestamp();
  if (f2.length > 0) {
    writer.writeString(
      1,
      f2
    );
  }
  f2 = message.getIsencrypted();
  if (f2) {
    writer.writeBool(
      2,
      f2
    );
  }
  f2 = message.getContent_asU8();
  if (f2.length > 0) {
    writer.writeBytes(
      3,
      f2
    );
  }
};
proto.MessageEnvelope.prototype.getTimestamp = function() {
  return (
    /** @type {string} */
    jspb.Message.getFieldWithDefault(this, 1, "")
  );
};
proto.MessageEnvelope.prototype.setTimestamp = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};
proto.MessageEnvelope.prototype.getIsencrypted = function() {
  return (
    /** @type {boolean} */
    jspb.Message.getBooleanFieldWithDefault(this, 2, false)
  );
};
proto.MessageEnvelope.prototype.setIsencrypted = function(value) {
  return jspb.Message.setProto3BooleanField(this, 2, value);
};
proto.MessageEnvelope.prototype.getContent = function() {
  return (
    /** @type {!(string|Uint8Array)} */
    jspb.Message.getFieldWithDefault(this, 3, "")
  );
};
proto.MessageEnvelope.prototype.getContent_asB64 = function() {
  return (
    /** @type {string} */
    jspb.Message.bytesAsB64(
      this.getContent()
    )
  );
};
proto.MessageEnvelope.prototype.getContent_asU8 = function() {
  return (
    /** @type {!Uint8Array} */
    jspb.Message.bytesAsU8(
      this.getContent()
    )
  );
};
proto.MessageEnvelope.prototype.setContent = function(value) {
  return jspb.Message.setProto3BytesField(this, 3, value);
};
proto.SyncRequest.repeatedFields_ = [1];
if (jspb.Message.GENERATE_TO_OBJECT) {
  proto.SyncRequest.prototype.toObject = function(opt_includeInstance) {
    return proto.SyncRequest.toObject(opt_includeInstance, this);
  };
  proto.SyncRequest.toObject = function(includeInstance, msg) {
    var obj = {
      messagesList: jspb.Message.toObjectList(
        msg.getMessagesList(),
        proto.MessageEnvelope.toObject,
        includeInstance
      ),
      fileid: jspb.Message.getFieldWithDefault(msg, 2, ""),
      groupid: jspb.Message.getFieldWithDefault(msg, 3, ""),
      keyid: jspb.Message.getFieldWithDefault(msg, 5, ""),
      since: jspb.Message.getFieldWithDefault(msg, 6, "")
    };
    if (includeInstance) {
      obj.$jspbMessageInstance = msg;
    }
    return obj;
  };
}
proto.SyncRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.SyncRequest();
  return proto.SyncRequest.deserializeBinaryFromReader(msg, reader);
};
proto.SyncRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
      case 1:
        var value = new proto.MessageEnvelope();
        reader.readMessage(value, proto.MessageEnvelope.deserializeBinaryFromReader);
        msg.addMessages(value);
        break;
      case 2:
        var value = (
          /** @type {string} */
          reader.readString()
        );
        msg.setFileid(value);
        break;
      case 3:
        var value = (
          /** @type {string} */
          reader.readString()
        );
        msg.setGroupid(value);
        break;
      case 5:
        var value = (
          /** @type {string} */
          reader.readString()
        );
        msg.setKeyid(value);
        break;
      case 6:
        var value = (
          /** @type {string} */
          reader.readString()
        );
        msg.setSince(value);
        break;
      default:
        reader.skipField();
        break;
    }
  }
  return msg;
};
proto.SyncRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.SyncRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};
proto.SyncRequest.serializeBinaryToWriter = function(message, writer) {
  var f2 = void 0;
  f2 = message.getMessagesList();
  if (f2.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f2,
      proto.MessageEnvelope.serializeBinaryToWriter
    );
  }
  f2 = message.getFileid();
  if (f2.length > 0) {
    writer.writeString(
      2,
      f2
    );
  }
  f2 = message.getGroupid();
  if (f2.length > 0) {
    writer.writeString(
      3,
      f2
    );
  }
  f2 = message.getKeyid();
  if (f2.length > 0) {
    writer.writeString(
      5,
      f2
    );
  }
  f2 = message.getSince();
  if (f2.length > 0) {
    writer.writeString(
      6,
      f2
    );
  }
};
proto.SyncRequest.prototype.getMessagesList = function() {
  return (
    /** @type{!Array<!proto.MessageEnvelope>} */
    jspb.Message.getRepeatedWrapperField(this, proto.MessageEnvelope, 1)
  );
};
proto.SyncRequest.prototype.setMessagesList = function(value) {
  return jspb.Message.setRepeatedWrapperField(this, 1, value);
};
proto.SyncRequest.prototype.addMessages = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.MessageEnvelope, opt_index);
};
proto.SyncRequest.prototype.clearMessagesList = function() {
  return this.setMessagesList([]);
};
proto.SyncRequest.prototype.getFileid = function() {
  return (
    /** @type {string} */
    jspb.Message.getFieldWithDefault(this, 2, "")
  );
};
proto.SyncRequest.prototype.setFileid = function(value) {
  return jspb.Message.setProto3StringField(this, 2, value);
};
proto.SyncRequest.prototype.getGroupid = function() {
  return (
    /** @type {string} */
    jspb.Message.getFieldWithDefault(this, 3, "")
  );
};
proto.SyncRequest.prototype.setGroupid = function(value) {
  return jspb.Message.setProto3StringField(this, 3, value);
};
proto.SyncRequest.prototype.getKeyid = function() {
  return (
    /** @type {string} */
    jspb.Message.getFieldWithDefault(this, 5, "")
  );
};
proto.SyncRequest.prototype.setKeyid = function(value) {
  return jspb.Message.setProto3StringField(this, 5, value);
};
proto.SyncRequest.prototype.getSince = function() {
  return (
    /** @type {string} */
    jspb.Message.getFieldWithDefault(this, 6, "")
  );
};
proto.SyncRequest.prototype.setSince = function(value) {
  return jspb.Message.setProto3StringField(this, 6, value);
};
proto.SyncResponse.repeatedFields_ = [1];
if (jspb.Message.GENERATE_TO_OBJECT) {
  proto.SyncResponse.prototype.toObject = function(opt_includeInstance) {
    return proto.SyncResponse.toObject(opt_includeInstance, this);
  };
  proto.SyncResponse.toObject = function(includeInstance, msg) {
    var obj = {
      messagesList: jspb.Message.toObjectList(
        msg.getMessagesList(),
        proto.MessageEnvelope.toObject,
        includeInstance
      ),
      merkle: jspb.Message.getFieldWithDefault(msg, 2, "")
    };
    if (includeInstance) {
      obj.$jspbMessageInstance = msg;
    }
    return obj;
  };
}
proto.SyncResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.SyncResponse();
  return proto.SyncResponse.deserializeBinaryFromReader(msg, reader);
};
proto.SyncResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
      case 1:
        var value = new proto.MessageEnvelope();
        reader.readMessage(value, proto.MessageEnvelope.deserializeBinaryFromReader);
        msg.addMessages(value);
        break;
      case 2:
        var value = (
          /** @type {string} */
          reader.readString()
        );
        msg.setMerkle(value);
        break;
      default:
        reader.skipField();
        break;
    }
  }
  return msg;
};
proto.SyncResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.SyncResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};
proto.SyncResponse.serializeBinaryToWriter = function(message, writer) {
  var f2 = void 0;
  f2 = message.getMessagesList();
  if (f2.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f2,
      proto.MessageEnvelope.serializeBinaryToWriter
    );
  }
  f2 = message.getMerkle();
  if (f2.length > 0) {
    writer.writeString(
      2,
      f2
    );
  }
};
proto.SyncResponse.prototype.getMessagesList = function() {
  return (
    /** @type{!Array<!proto.MessageEnvelope>} */
    jspb.Message.getRepeatedWrapperField(this, proto.MessageEnvelope, 1)
  );
};
proto.SyncResponse.prototype.setMessagesList = function(value) {
  return jspb.Message.setRepeatedWrapperField(this, 1, value);
};
proto.SyncResponse.prototype.addMessages = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.MessageEnvelope, opt_index);
};
proto.SyncResponse.prototype.clearMessagesList = function() {
  return this.setMessagesList([]);
};
proto.SyncResponse.prototype.getMerkle = function() {
  return (
    /** @type {string} */
    jspb.Message.getFieldWithDefault(this, 2, "")
  );
};
proto.SyncResponse.prototype.setMerkle = function(value) {
  return jspb.Message.setProto3StringField(this, 2, value);
};
goog.object.extend(exports, proto);
const SyncPb = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null
}, Symbol.toStringTag, { value: "Module" }));
function emptyTrie() {
  return { hash: 0 };
}
function isNumberTrieNodeKey(input) {
  return ["0", "1", "2"].includes(input);
}
function getKeys(trie) {
  return Object.keys(trie).filter(isNumberTrieNodeKey);
}
function keyToTimestamp(key) {
  const fullkey = key + "0".repeat(16 - key.length);
  return parseInt(fullkey, 3) * 1e3 * 60;
}
function insert$1(trie, timestamp) {
  const hash = timestamp.hash();
  const key = Number(Math.floor(timestamp.millis() / 1e3 / 60)).toString(3);
  trie = Object.assign({}, trie, { hash: (trie.hash || 0) ^ hash });
  return insertKey(trie, key, hash);
}
function insertKey(trie, key, hash) {
  if (key.length === 0) {
    return trie;
  }
  const c = key[0];
  const t = isNumberTrieNodeKey(c) ? trie[c] : void 0;
  const n = t || {};
  return Object.assign({}, trie, {
    [c]: Object.assign({}, n, insertKey(n, key.slice(1), hash), {
      hash: (n.hash || 0) ^ hash
    })
  });
}
function diff(trie1, trie2) {
  if (trie1.hash === trie2.hash) {
    return null;
  }
  let node1 = trie1;
  let node2 = trie2;
  let k = "";
  while (1) {
    const keyset = /* @__PURE__ */ new Set([...getKeys(node1), ...getKeys(node2)]);
    const keys2 = [...keyset.values()];
    keys2.sort();
    let diffkey = null;
    for (let i = 0; i < keys2.length; i++) {
      const key = keys2[i];
      const next1 = node1[key];
      const next2 = node2[key];
      if (!next1 || !next2) {
        break;
      }
      if (next1.hash !== next2.hash) {
        diffkey = key;
        break;
      }
    }
    if (!diffkey) {
      return keyToTimestamp(k);
    }
    k += diffkey;
    node1 = node1[diffkey] || emptyTrie();
    node2 = node2[diffkey] || emptyTrie();
  }
  return null;
}
function prune(trie, n = 2) {
  if (!trie.hash) {
    return trie;
  }
  const keys2 = getKeys(trie);
  keys2.sort();
  const next = { hash: trie.hash };
  for (const k of keys2.slice(-n)) {
    const node = trie[k];
    if (!node) {
      throw new Error(`TrieNode for key ${k} could not be found`);
    }
    next[k] = prune(node, n);
  }
  return next;
}
let clock;
function setClock(clock_) {
  clock = clock_;
}
function getClock() {
  return clock;
}
function makeClock(timestamp, merkle = {}) {
  return { timestamp: MutableTimestamp.from(timestamp), merkle };
}
function serializeClock(clock2) {
  return JSON.stringify({
    timestamp: clock2.timestamp.toString(),
    merkle: clock2.merkle
  });
}
function deserializeClock(clock2) {
  let data;
  try {
    data = JSON.parse(clock2);
  } catch (e) {
    data = {
      timestamp: "1970-01-01T00:00:00.000Z-0000-" + makeClientId(),
      merkle: {}
    };
  }
  const ts = Timestamp.parse(data.timestamp);
  if (!ts) {
    throw new Timestamp.InvalidError(data.timestamp);
  }
  return {
    timestamp: MutableTimestamp.from(ts),
    merkle: data.merkle
  };
}
function makeClientId() {
  return uuid.v4().replace(/-/g, "").slice(-16);
}
const config$1 = {
  // Allow 5 minutes of clock drift
  maxDrift: 5 * 60 * 1e3
};
const MAX_COUNTER = parseInt("0xFFFF");
const MAX_NODE_LENGTH = 16;
class Timestamp {
  _state;
  constructor(millis, counter, node) {
    this._state = {
      millis,
      counter,
      node
    };
  }
  valueOf() {
    return this.toString();
  }
  toString() {
    return [
      new Date(this.millis()).toISOString(),
      ("0000" + this.counter().toString(16).toUpperCase()).slice(-4),
      ("0000000000000000" + this.node()).slice(-16)
    ].join("-");
  }
  millis() {
    return this._state.millis;
  }
  counter() {
    return this._state.counter;
  }
  node() {
    return this._state.node;
  }
  hash() {
    return murmurhash.v3(this.toString());
  }
  // Timestamp generator initialization
  // * sets the node ID to an arbitrary value
  // * useful for mocking/unit testing
  static init(options = {}) {
    if (options.maxDrift) {
      config$1.maxDrift = options.maxDrift;
    }
    setClock(
      makeClock(
        new Timestamp(
          0,
          0,
          options.node ? ("0000000000000000" + options.node).toString().slice(-16) : ""
        )
      )
    );
  }
  /**
   * maximum timestamp
   */
  static max = Timestamp.parse(
    "9999-12-31T23:59:59.999Z-FFFF-FFFFFFFFFFFFFFFF"
  );
  /**
   * timestamp parsing
   * converts a fixed-length string timestamp to the structured value
   */
  static parse(timestamp) {
    if (timestamp instanceof Timestamp) {
      return timestamp;
    }
    if (typeof timestamp === "string") {
      const parts = timestamp.split("-");
      if (parts && parts.length === 5) {
        const millis = Date.parse(parts.slice(0, 3).join("-")).valueOf();
        const counter = parseInt(parts[3], 16);
        const node = parts[4];
        if (!isNaN(millis) && millis >= 0 && !isNaN(counter) && counter <= MAX_COUNTER && typeof node === "string" && node.length <= MAX_NODE_LENGTH) {
          return new Timestamp(millis, counter, node);
        }
      }
    }
    return null;
  }
  /**
   * Timestamp send. Generates a unique, monotonic timestamp suitable
   * for transmission to another system in string format
   */
  static send() {
    if (!clock) {
      return null;
    }
    const phys = Date.now();
    const lOld = clock.timestamp.millis();
    const cOld = clock.timestamp.counter();
    const lNew = Math.max(lOld, phys);
    const cNew = lOld === lNew ? cOld + 1 : 0;
    if (lNew - phys > config$1.maxDrift) {
      throw new Timestamp.ClockDriftError(lNew, phys, config$1.maxDrift);
    }
    if (cNew > MAX_COUNTER) {
      throw new Timestamp.OverflowError();
    }
    clock.timestamp.setMillis(lNew);
    clock.timestamp.setCounter(cNew);
    return new Timestamp(
      clock.timestamp.millis(),
      clock.timestamp.counter(),
      clock.timestamp.node()
    );
  }
  // Timestamp receive. Parses and merges a timestamp from a remote
  // system with the local timeglobal uniqueness and monotonicity are
  // preserved
  static recv(msg) {
    if (!clock) {
      return null;
    }
    const phys = Date.now();
    const lMsg = msg.millis();
    const cMsg = msg.counter();
    if (lMsg - phys > config$1.maxDrift) {
      throw new Timestamp.ClockDriftError();
    }
    const lOld = clock.timestamp.millis();
    const cOld = clock.timestamp.counter();
    const lNew = Math.max(Math.max(lOld, phys), lMsg);
    const cNew = lNew === lOld && lNew === lMsg ? Math.max(cOld, cMsg) + 1 : lNew === lOld ? cOld + 1 : lNew === lMsg ? cMsg + 1 : 0;
    if (lNew - phys > config$1.maxDrift) {
      throw new Timestamp.ClockDriftError();
    }
    if (cNew > MAX_COUNTER) {
      throw new Timestamp.OverflowError();
    }
    clock.timestamp.setMillis(lNew);
    clock.timestamp.setCounter(cNew);
    return new Timestamp(
      clock.timestamp.millis(),
      clock.timestamp.counter(),
      clock.timestamp.node()
    );
  }
  /**
   * zero/minimum timestamp
   */
  static zero = Timestamp.parse(
    "1970-01-01T00:00:00.000Z-0000-0000000000000000"
  );
  static since = (isoString) => isoString + "-0000-0000000000000000";
  /**
   * error classes
   */
  static DuplicateNodeError = class DuplicateNodeError extends Error {
    constructor(node) {
      super("duplicate node identifier " + node);
      this.name = "DuplicateNodeError";
    }
  };
  static ClockDriftError = class ClockDriftError extends Error {
    constructor(...args) {
      super(
        ["maximum clock drift exceeded"].concat(args).join(" ")
      );
      this.name = "ClockDriftError";
    }
  };
  static OverflowError = class OverflowError extends Error {
    constructor() {
      super("timestamp counter overflow");
      this.name = "OverflowError";
    }
  };
  static InvalidError = class InvalidError extends Error {
    constructor(...args) {
      super(["timestamp is not valid"].concat(args.map(String)).join(" "));
      this.name = "InvalidError";
    }
  };
}
class MutableTimestamp extends Timestamp {
  static from(timestamp) {
    return new MutableTimestamp(
      timestamp.millis(),
      timestamp.counter(),
      timestamp.node()
    );
  }
  setMillis(n) {
    this._state.millis = n;
  }
  setCounter(n) {
    this._state.counter = n;
  }
  setNode(n) {
    this._state.node = n;
  }
}
const SyncProtoBuf = SyncPb;
let _uid = 0;
function resetUid() {
  _uid = 0;
}
function uid(tableName) {
  _uid++;
  return tableName + _uid;
}
class CompileError extends Error {
}
function nativeDateToInt(date) {
  const pad = (x) => (x < 10 ? "0" : "") + x;
  return date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate());
}
function dateToInt(date) {
  return parseInt(date.replace(/-/g, ""));
}
function addTombstone(schema2, tableName, tableId, whereStr) {
  const hasTombstone = schema2[tableName].tombstone != null;
  return hasTombstone ? `${whereStr} AND ${tableId}.tombstone = 0` : whereStr;
}
function popPath(path2) {
  const parts = path2.split(".");
  return { path: parts.slice(0, -1).join("."), field: parts[parts.length - 1] };
}
function isKeyword(str) {
  return str === "group";
}
function quoteAlias(alias) {
  return alias.indexOf(".") === -1 && !isKeyword(alias) ? alias : `"${alias}"`;
}
function typed(value, type, { literal = false } = {}) {
  return { value, type, literal };
}
function getFieldDescription(schema2, tableName, field) {
  if (schema2[tableName] == null) {
    throw new CompileError(`Table “${tableName}” does not exist in the schema`);
  }
  const fieldDesc = schema2[tableName][field];
  if (fieldDesc == null) {
    throw new CompileError(
      `Field “${field}” does not exist in table “${tableName}”`
    );
  }
  return fieldDesc;
}
function makePath(state, path2) {
  const { schema: schema2, paths } = state;
  const parts = path2.split(".");
  if (parts.length < 2) {
    throw new CompileError("Invalid path: " + path2);
  }
  const initialTable = parts[0];
  const tableName = parts.slice(1).reduce((tableName2, field) => {
    const table = schema2[tableName2];
    if (table == null) {
      throw new CompileError(`Path error: ${tableName2} table does not exist`);
    }
    if (!table[field] || table[field].ref == null) {
      throw new CompileError(
        `Field not joinable on table ${tableName2}: “${field}”`
      );
    }
    return table[field].ref;
  }, initialTable);
  let joinTable;
  const parentParts = parts.slice(0, -1);
  if (parentParts.length === 1) {
    joinTable = parentParts[0];
  } else {
    const parentPath = parentParts.join(".");
    const parentDesc = paths.get(parentPath);
    if (!parentDesc) {
      throw new CompileError("Path does not exist: " + parentPath);
    }
    joinTable = parentDesc.tableId;
  }
  return {
    tableName,
    tableId: uid(tableName),
    joinField: parts[parts.length - 1],
    joinTable
  };
}
function resolvePath(state, path2) {
  let paths = path2.split(".");
  paths = paths.reduce(
    (acc, name) => {
      const fullName = acc.context + "." + name;
      return {
        context: fullName,
        path: [...acc.path, fullName]
      };
    },
    { context: state.implicitTableName, path: [] }
  ).path;
  paths.forEach((path22) => {
    if (!state.paths.get(path22)) {
      state.paths.set(path22, makePath(state, path22));
    }
  });
  const pathInfo = state.paths.get(paths[paths.length - 1]);
  return pathInfo;
}
function transformField(state, name) {
  if (typeof name !== "string") {
    throw new CompileError("Invalid field name, must be a string");
  }
  const { path: path2, field: originalField } = popPath(name);
  let field = originalField;
  let pathInfo;
  if (path2 === "") {
    pathInfo = {
      tableName: state.implicitTableName,
      tableId: state.implicitTableId
    };
  } else {
    pathInfo = resolvePath(state, path2);
  }
  const fieldDesc = getFieldDescription(
    state.schema,
    pathInfo.tableName,
    field
  );
  if (state.validateRefs && fieldDesc.ref && fieldDesc.type === "id" && field !== "id") {
    const refPath = state.implicitTableName + "." + name;
    let refPathInfo = state.paths.get(refPath);
    if (!refPathInfo) {
      refPathInfo = makePath(state, refPath);
      refPathInfo.noMapping = true;
      state.paths.set(refPath, refPathInfo);
    }
    field = "id";
    pathInfo = refPathInfo;
  }
  const fieldStr = pathInfo.tableId + "." + field;
  return typed(fieldStr, fieldDesc.type);
}
function parseDate(str) {
  const m = str.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (m) {
    return typed(dateToInt(m[1]), "date", { literal: true });
  }
  return null;
}
function parseMonth(str) {
  const m = str.match(/^(\d{4}-\d{2})$/);
  if (m) {
    return typed(dateToInt(m[1]), "date", { literal: true });
  }
  return null;
}
function parseYear(str) {
  const m = str.match(/^(\d{4})$/);
  if (m) {
    return typed(dateToInt(m[1]), "date", { literal: true });
  }
  return null;
}
function badDateFormat(str, type) {
  throw new CompileError(`Bad ${type} format: ${str}`);
}
function inferParam(param, type) {
  const existingType = param.paramType;
  if (existingType) {
    const casts = {
      date: ["string"],
      "date-month": ["date"],
      "date-year": ["date", "date-month"],
      id: ["string"],
      float: ["integer"]
    };
    if (existingType !== type && (!casts[type] || !casts[type].includes(existingType))) {
      throw new Error(
        `Parameter “${param.paramName}” can’t convert to ${type} (already inferred as ${existingType})`
      );
    }
  } else {
    param.paramType = type;
  }
}
function castInput(state, expr, type) {
  if (expr.type === type) {
    return expr;
  } else if (expr.type === "param") {
    inferParam(expr, type);
    return typed(expr.value, type);
  } else if (expr.type === "null") {
    if (!expr.literal) {
      throw new CompileError("A non-literal null doesn’t make sense");
    }
    if (type === "boolean") {
      return typed(0, "boolean", { literal: true });
    }
    return expr;
  }
  if (type === "date") {
    if (expr.type === "string") {
      if (expr.literal) {
        return parseDate(expr.value) || badDateFormat(expr.value, "date");
      } else {
        throw new CompileError(
          "Casting string fields to dates is not supported"
        );
      }
    }
    throw new CompileError(`Can’t cast ${expr.type} to date`);
  } else if (type === "date-month") {
    let expr2;
    if (expr.type === "date") {
      expr2 = expr;
    } else if (expr.type === "string" || expr.type === "any") {
      expr2 = parseMonth(expr.value) || parseDate(expr.value) || badDateFormat(expr.value, "date-month");
    } else {
      throw new CompileError(`Can’t cast ${expr.type} to date-month`);
    }
    if (expr2.literal) {
      return typed(
        dateToInt(expr2.value.toString().slice(0, 6)),
        "date-month",
        { literal: true }
      );
    } else {
      return typed(
        `CAST(SUBSTR(${expr2.value}, 1, 6) AS integer)`,
        "date-month"
      );
    }
  } else if (type === "date-year") {
    let expr2;
    if (expr.type === "date" || expr.type === "date-month") {
      expr2 = expr;
    } else if (expr.type === "string") {
      expr2 = parseYear(expr.value) || parseMonth(expr.value) || parseDate(expr.value) || badDateFormat(expr.value, "date-year");
    } else {
      throw new CompileError(`Can’t cast ${expr.type} to date-year`);
    }
    if (expr2.literal) {
      return typed(dateToInt(expr2.value.toString().slice(0, 4)), "date-year", {
        literal: true
      });
    } else {
      return typed(
        `CAST(SUBSTR(${expr2.value}, 1, 4) AS integer)`,
        "date-year"
      );
    }
  } else if (type === "id") {
    if (expr.type === "string") {
      return typed(expr.value, "id", { literal: expr.literal });
    }
  } else if (type === "float") {
    if (expr.type === "integer") {
      return typed(expr.value, "float", { literal: expr.literal });
    }
  }
  if (expr.type === "any") {
    return typed(expr.value, type, { literal: expr.literal });
  }
  throw new CompileError(`Can’t convert ${expr.type} to ${type}`);
}
function val(state, expr, type) {
  let castedExpr = expr;
  if (type) {
    castedExpr = castInput(state, expr, type);
  }
  if (castedExpr.literal) {
    if (castedExpr.type === "id") {
      return `'${castedExpr.value}'`;
    } else if (castedExpr.type === "string") {
      const value = castedExpr.value.replace(/'/g, "''");
      return `'${value}'`;
    }
  }
  return castedExpr.value;
}
function valArray(state, arr, types) {
  return arr.map((value, idx) => val(state, value, types ? types[idx] : null));
}
function validateArgLength(arr, min, max) {
  if (max == null) {
    max = min;
  }
  if (min != null && arr.length < min) {
    throw new CompileError("Too few arguments");
  }
  if (max != null && arr.length > max) {
    throw new CompileError("Too many arguments");
  }
}
function saveStack(type, func) {
  return (state, ...args) => {
    if (state == null || state.compileStack == null) {
      throw new CompileError(
        "This function cannot track error data. It needs to accept the compiler state as the first argument."
      );
    }
    state.compileStack.push({ type, args });
    const ret = func(state, ...args);
    state.compileStack.pop();
    return ret;
  };
}
function prettyValue(value) {
  if (typeof value === "string") {
    return value;
  } else if (value === void 0) {
    return "undefined";
  }
  const str = JSON.stringify(value);
  if (str.length > 70) {
    const expanded = JSON.stringify(value, null, 2);
    return expanded.split("\n").join("\n  ");
  }
  return str;
}
function getCompileError(error, stack) {
  if (stack.length === 0) {
    return error;
  }
  let stackStr = stack.slice(1).reverse().map((entry) => {
    switch (entry.type) {
      case "expr":
      case "function":
        return prettyValue(entry.args[0]);
      case "op": {
        const [fieldRef, opData] = entry.args;
        return prettyValue({ [fieldRef]: opData });
      }
      case "value":
        return prettyValue(entry.value);
      default:
        return "";
    }
  }).map((str) => "\n  " + str).join("");
  const rootMethod = stack[0].type;
  const methodArgs = stack[0].args[0];
  stackStr += `
  ${rootMethod}(${prettyValue(
    methodArgs.length === 1 ? methodArgs[0] : methodArgs
  )})`;
  if (process.env.NODE_ENV === "production") {
    const err = new CompileError();
    err.message = `${error.message}

Expression stack:` + stackStr;
    err.stack = null;
    return err;
  }
  error.message = `${error.message}

Expression stack:` + stackStr;
  return error;
}
function compileLiteral(value) {
  if (value === void 0) {
    throw new CompileError("`undefined` is not a valid query value");
  } else if (value === null) {
    return typed("NULL", "null", { literal: true });
  } else if (value instanceof Date) {
    return typed(nativeDateToInt(value), "date", { literal: true });
  } else if (typeof value === "string") {
    value = value.replace(/\\\$/g, "$");
    return typed(value, "string", { literal: true });
  } else if (typeof value === "boolean") {
    return typed(value ? 1 : 0, "boolean", { literal: true });
  } else if (typeof value === "number") {
    return typed(value, Number.isInteger(value) ? "integer" : "float", {
      literal: true
    });
  } else if (Array.isArray(value)) {
    return typed(value, "array", { literal: true });
  } else {
    throw new CompileError(
      "Unsupported type of expression: " + JSON.stringify(value)
    );
  }
}
const compileExpr = saveStack("expr", (state, expr) => {
  if (typeof expr === "string") {
    if (expr[0] === "$") {
      const fieldRef = expr === "$" ? state.implicitField : expr.slice(1);
      if (fieldRef == null || fieldRef === "") {
        throw new CompileError("Invalid field reference: " + expr);
      }
      return transformField(state, fieldRef);
    }
    if (expr[0] === ":") {
      const param = { value: "?", type: "param", paramName: expr.slice(1) };
      state.namedParameters.push(param);
      return param;
    }
  }
  if (expr !== null) {
    if (Array.isArray(expr)) {
      return compileLiteral(expr);
    } else if (typeof expr === "object" && Object.keys(expr).find((k) => k[0] === "$")) {
      return compileFunction(state, expr);
    }
  }
  return compileLiteral(expr);
});
const compileFunction = saveStack("function", (state, func) => {
  const [name] = Object.keys(func);
  let argExprs = func[name];
  if (!Array.isArray(argExprs)) {
    argExprs = [argExprs];
  }
  if (name[0] !== "$") {
    throw new CompileError(
      `Unknown property “${name}.” Did you mean to call a function? Try prefixing it with $`
    );
  }
  let args = argExprs;
  if (name !== "$condition") {
    args = argExprs.map((arg) => compileExpr(state, arg));
  }
  switch (name) {
    // aggregate functions
    case "$sum": {
      validateArgLength(args, 1);
      const [arg12] = valArray(state, args, ["float"]);
      return typed(`SUM(${arg12})`, args[0].type);
    }
    case "$sumOver": {
      const [arg12] = valArray(state, args, ["float"]);
      const order = state.orders ? "ORDER BY " + compileOrderBy(state, state.orders) : "";
      return typed(
        `(SUM(${arg12}) OVER (${order} ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING))`,
        args[0].type
      );
    }
    case "$count": {
      validateArgLength(args, 1);
      const [arg12] = valArray(state, args);
      return typed(`COUNT(${arg12})`, "integer");
    }
    // string functions
    case "$substr": {
      validateArgLength(args, 2, 3);
      const [arg12, arg2, arg3] = valArray(state, args, [
        "string",
        "integer",
        "integer"
      ]);
      return typed(`SUBSTR(${arg12}, ${arg2}, ${arg3})`, "string");
    }
    case "$lower": {
      validateArgLength(args, 1);
      const [arg12] = valArray(state, args, ["string"]);
      return typed(`UNICODE_LOWER(${arg12})`, "string");
    }
    // integer/float functions
    case "$neg": {
      validateArgLength(args, 1);
      valArray(state, args, ["float"]);
      return typed(`(-${val(state, args[0])})`, args[0].type);
    }
    case "$abs": {
      validateArgLength(args, 1);
      valArray(state, args, ["float"]);
      return typed(`ABS(${val(state, args[0])})`, args[0].type);
    }
    case "$idiv": {
      validateArgLength(args, 2);
      valArray(state, args, ["integer", "integer"]);
      return typed(
        `(${val(state, args[0])} / ${val(state, args[1])})`,
        args[0].type
      );
    }
    // id functions
    case "$id": {
      validateArgLength(args, 1);
      return typed(val(state, args[0]), args[0].type);
    }
    // date functions
    case "$day": {
      validateArgLength(args, 1);
      return castInput(state, args[0], "date");
    }
    case "$month": {
      validateArgLength(args, 1);
      return castInput(state, args[0], "date-month");
    }
    case "$year": {
      validateArgLength(args, 1);
      return castInput(state, args[0], "date-year");
    }
    // various functions
    case "$condition":
      validateArgLength(args, 1);
      const conds = compileConditions(state, args[0]);
      return typed(conds.join(" AND "), "boolean");
    case "$nocase":
      validateArgLength(args, 1);
      const [arg1] = valArray(state, args, ["string"]);
      return typed(`${arg1} COLLATE NOCASE`, args[0].type);
    case "$literal": {
      validateArgLength(args, 1);
      if (!args[0].literal) {
        throw new CompileError("Literal not passed to $literal");
      }
      return args[0];
    }
    default:
      throw new CompileError(`Unknown function: ${name}`);
  }
});
const compileOp = saveStack("op", (state, fieldRef, opData) => {
  const { $transform, ...opExpr } = opData;
  const [op] = Object.keys(opExpr);
  const rhs = compileExpr(state, opData[op]);
  let lhs;
  if ($transform) {
    lhs = compileFunction(
      { ...state, implicitField: fieldRef },
      typeof $transform === "string" ? { [$transform]: "$" } : $transform
    );
  } else {
    lhs = compileExpr(state, "$" + fieldRef);
  }
  switch (op) {
    case "$gte": {
      const [left, right] = valArray(state, [lhs, rhs], [null, lhs.type]);
      return `${left} >= ${right}`;
    }
    case "$lte": {
      const [left, right] = valArray(state, [lhs, rhs], [null, lhs.type]);
      return `${left} <= ${right}`;
    }
    case "$gt": {
      const [left, right] = valArray(state, [lhs, rhs], [null, lhs.type]);
      return `${left} > ${right}`;
    }
    case "$lt": {
      const [left, right] = valArray(state, [lhs, rhs], [null, lhs.type]);
      return `${left} < ${right}`;
    }
    case "$eq": {
      if (castInput(state, rhs, lhs.type).type === "null") {
        return `${val(state, lhs)} IS NULL`;
      }
      const [left, right] = valArray(state, [lhs, rhs], [null, lhs.type]);
      if (rhs.type === "param") {
        const orders = state.namedParameters.map((param) => {
          return param === rhs || param === lhs ? [param, { ...param }] : param;
        });
        state.namedParameters = [].concat.apply([], orders);
        return `CASE
          WHEN ${left} IS NULL THEN ${right} IS NULL
          ELSE ${left} = ${right}
        END`;
      }
      return `${left} = ${right}`;
    }
    case "$ne": {
      if (castInput(state, rhs, lhs.type).type === "null") {
        return `${val(state, lhs)} IS NOT NULL`;
      }
      const [left, right] = valArray(state, [lhs, rhs], [null, lhs.type]);
      if (rhs.type === "param") {
        const orders = state.namedParameters.map((param) => {
          return param === rhs || param === lhs ? [param, { ...param }] : param;
        });
        state.namedParameters = [].concat.apply([], orders);
        return `CASE
          WHEN ${left} IS NULL THEN ${right} IS NOT NULL
          ELSE ${left} IS NOT ${right}
        END`;
      }
      return `(${left} != ${right} OR ${left} IS NULL)`;
    }
    case "$oneof": {
      const [left, right] = valArray(state, [lhs, rhs], [null, "array"]);
      const ids = [...new Set(right)];
      return `${left} IN (` + ids.map((id) => `'${id}'`).join(",") + ")";
    }
    case "$like": {
      const [left, right] = valArray(state, [lhs, rhs], ["string", "string"]);
      return `UNICODE_LIKE(${getNormalisedString(right)}, NORMALISE(${left}))`;
    }
    case "$regexp": {
      const [left, right] = valArray(state, [lhs, rhs], ["string", "string"]);
      return `REGEXP(${right}, ${left})`;
    }
    case "$notlike": {
      const [left, right] = valArray(state, [lhs, rhs], ["string", "string"]);
      return `(NOT UNICODE_LIKE(${getNormalisedString(right)}, NORMALISE(${left}))
 OR ${left} IS NULL)`;
    }
    default:
      throw new CompileError(`Unknown operator: ${op}`);
  }
});
function compileConditions(state, conds) {
  if (!Array.isArray(conds)) {
    conds = Object.entries(conds).map((cond) => {
      return { [cond[0]]: cond[1] };
    });
  }
  return conds.filter(Boolean).reduce((res, condsObj) => {
    const compiled = Object.entries(condsObj).map(([field, cond]) => {
      if (field === "$and") {
        if (!cond) {
          return null;
        }
        return compileAnd(state, cond);
      } else if (field === "$or") {
        if (!cond || Array.isArray(cond) && cond.length === 0) {
          return null;
        }
        return compileOr(state, cond);
      }
      if (typeof cond === "string" || typeof cond === "number" || typeof cond === "boolean" || cond instanceof Date || cond == null) {
        return compileOp(state, field, { $eq: cond });
      }
      if (Array.isArray(cond)) {
        return cond.map((c) => compileOp(state, field, c)).join(" AND ");
      }
      return compileOp(state, field, cond);
    }).filter(Boolean);
    return [...res, ...compiled];
  }, []);
}
function compileOr(state, conds) {
  if (!conds) {
    return "0";
  }
  const res = compileConditions(state, conds);
  if (res.length === 0) {
    return "0";
  }
  return "(" + res.join("\n  OR ") + ")";
}
function compileAnd(state, conds) {
  if (!conds) {
    return "1";
  }
  const res = compileConditions(state, conds);
  if (res.length === 0) {
    return "1";
  }
  return "(" + res.join("\n  AND ") + ")";
}
const compileWhere = saveStack("filter", (state, conds) => {
  return compileAnd(state, conds);
});
function compileJoins(state, tableRef, internalTableFilters) {
  const joins = [];
  state.paths.forEach((desc, path2) => {
    const { tableName, tableId, joinField, joinTable, noMapping } = state.paths.get(path2);
    let on = `${tableId}.id = ${tableRef(joinTable)}.${quoteAlias(joinField)}`;
    const filters = internalTableFilters(tableName);
    if (filters.length > 0) {
      on += " AND " + compileAnd(
        { ...state, implicitTableName: tableName, implicitTableId: tableId },
        filters
      );
    }
    joins.push(
      `LEFT JOIN ${noMapping ? tableName : tableRef(tableName, true)} ${tableId} ON ${addTombstone(state.schema, tableName, tableId, on)}`
    );
    if (state.dependencies.indexOf(tableName) === -1) {
      state.dependencies.push(tableName);
    }
  });
  return joins.join("\n");
}
function expandStar(state, expr) {
  let path2;
  let pathInfo;
  if (expr === "*") {
    pathInfo = {
      tableName: state.implicitTableName,
      tableId: state.implicitTableId
    };
  } else if (expr.match(/\.\*$/)) {
    const result = popPath(expr);
    path2 = result.path;
    pathInfo = resolvePath(state, result.path);
  }
  const table = state.schema[pathInfo.tableName];
  if (table == null) {
    throw new Error(`Table “${pathInfo.tableName}” does not exist`);
  }
  return Object.keys(table).map((field) => path2 ? `${path2}.${field}` : field);
}
const compileSelect = saveStack(
  "select",
  (state, exprs, isAggregate, orders) => {
    if (!isAggregate && !exprs.includes("id") && !exprs.includes("*")) {
      exprs = exprs.concat(["id"]);
    }
    const select2 = exprs.map((expr) => {
      if (typeof expr === "string") {
        if (expr.indexOf("*") !== -1) {
          const fields = expandStar(state, expr);
          return fields.map((field) => {
            const compiled3 = compileExpr(state, "$" + field);
            state.outputTypes.set(field, compiled3.type);
            return compiled3.value + " AS " + quoteAlias(field);
          }).join(", ");
        }
        const compiled2 = compileExpr(state, "$" + expr);
        state.outputTypes.set(expr, compiled2.type);
        return compiled2.value + " AS " + quoteAlias(expr);
      }
      const [name, value] = Object.entries(expr)[0];
      if (name[0] === "$") {
        state.compileStack.push({ type: "value", value: expr });
        throw new CompileError(
          `Invalid field “${name}”, are you trying to select a function? You need to name the expression`
        );
      }
      if (typeof value === "string") {
        const compiled2 = compileExpr(state, "$" + value);
        state.outputTypes.set(name, compiled2.type);
        return `${compiled2.value} AS ${quoteAlias(name)}`;
      }
      const compiled = compileFunction({ ...state, orders }, value);
      state.outputTypes.set(name, compiled.type);
      return compiled.value + ` AS ${quoteAlias(name)}`;
    });
    return select2.join(", ");
  }
);
const compileGroupBy = saveStack("groupBy", (state, exprs) => {
  const groupBy2 = exprs.map((expr) => {
    if (typeof expr === "string") {
      return compileExpr(state, "$" + expr).value;
    }
    return compileFunction(state, expr).value;
  });
  return groupBy2.join(", ");
});
const compileOrderBy = saveStack("orderBy", (state, exprs) => {
  const orderBy = exprs.map((expr) => {
    let compiled;
    let dir = null;
    if (typeof expr === "string") {
      compiled = compileExpr(state, "$" + expr).value;
    } else {
      const entries = Object.entries(expr);
      const entry = entries[0];
      if (entries.length === 1 && entry[0][0] !== "$") {
        dir = entry[1];
        compiled = compileExpr(state, "$" + entry[0]).value;
      } else {
        const { $dir, ...func } = expr;
        dir = $dir;
        compiled = compileFunction(state, func).value;
      }
    }
    if (dir != null) {
      if (dir !== "desc" && dir !== "asc") {
        throw new CompileError("Invalid order direction: " + dir);
      }
      return `${compiled} ${dir}`;
    }
    return compiled;
  });
  return orderBy.join(", ");
});
const AGGREGATE_FUNCTIONS = ["$sum", "$count"];
function isAggregateFunction(expr) {
  if (typeof expr !== "object" || Array.isArray(expr)) {
    return false;
  }
  const [name, originalArgExprs] = Object.entries(expr)[0];
  let argExprs = originalArgExprs;
  if (!Array.isArray(argExprs)) {
    argExprs = [argExprs];
  }
  if (AGGREGATE_FUNCTIONS.indexOf(name) !== -1) {
    return true;
  }
  return !!argExprs.find((ex) => isAggregateFunction(ex));
}
function isAggregateQuery(queryState) {
  if (queryState.groupExpressions.length > 0) {
    return true;
  }
  return !!queryState.selectExpressions.find((expr) => {
    if (typeof expr !== "string") {
      const [_, value] = Object.entries(expr)[0];
      return isAggregateFunction(value);
    }
    return false;
  });
}
function compileQuery(queryState, schema2, schemaConfig2 = {}) {
  const { withDead, validateRefs = true, tableOptions, rawMode } = queryState;
  const {
    tableViews = {},
    tableFilters = () => [],
    customizeQuery = (queryState2) => queryState2
  } = schemaConfig2;
  const internalTableFilters = (name) => {
    const filters = tableFilters(name);
    for (const filter of filters) {
      if (Array.isArray(filter)) {
        throw new CompileError(
          "Invalid internal table filter: only object filters are supported"
        );
      }
      if (Object.keys(filter)[0].indexOf(".") !== -1) {
        throw new CompileError(
          "Invalid internal table filter: field names cannot contain paths"
        );
      }
    }
    return filters;
  };
  const tableRef = (name, isJoin) => {
    const view = typeof tableViews === "function" ? tableViews(name, { withDead, isJoin, tableOptions }) : tableViews[name];
    return view || name;
  };
  const tableName = queryState.table;
  const {
    filterExpressions,
    selectExpressions,
    groupExpressions,
    orderExpressions,
    limit,
    offset
  } = customizeQuery(queryState);
  let select2 = "";
  let where = "";
  let joins = "";
  let groupBy2 = "";
  let orderBy = "";
  const state = {
    schema: schema2,
    implicitTableName: tableName,
    implicitTableId: tableRef(tableName),
    paths: /* @__PURE__ */ new Map(),
    dependencies: [tableName],
    compileStack: [],
    outputTypes: /* @__PURE__ */ new Map(),
    validateRefs,
    namedParameters: []
  };
  resetUid();
  try {
    select2 = compileSelect(
      state,
      selectExpressions,
      isAggregateQuery(queryState),
      orderExpressions
    );
    if (filterExpressions.length > 0) {
      const result = compileWhere(state, filterExpressions);
      where = "WHERE " + result;
    } else {
      where = "WHERE 1";
    }
    if (!rawMode) {
      const filters = internalTableFilters(tableName);
      if (filters.length > 0) {
        where += " AND " + compileAnd(state, filters);
      }
    }
    if (groupExpressions.length > 0) {
      const result = compileGroupBy(state, groupExpressions);
      groupBy2 = "GROUP BY " + result;
    }
    if (orderExpressions.length > 0) {
      const result = compileOrderBy(state, orderExpressions);
      orderBy = "ORDER BY " + result;
    }
    if (state.paths.size > 0) {
      joins = compileJoins(state, tableRef, internalTableFilters);
    }
  } catch (e) {
    if (e instanceof CompileError) {
      throw getCompileError(e, state.compileStack);
    }
    throw e;
  }
  const sqlPieces = {
    select: select2,
    from: tableRef(tableName),
    joins,
    where,
    groupBy: groupBy2,
    orderBy,
    limit,
    offset
  };
  return {
    sqlPieces,
    state
  };
}
function defaultConstructQuery(queryState, compilerState, sqlPieces) {
  const s = sqlPieces;
  const where = queryState.withDead ? s.where : addTombstone(
    compilerState.schema,
    compilerState.implicitTableName,
    compilerState.implicitTableId,
    s.where
  );
  return `
    SELECT ${s.select} FROM ${s.from}
    ${s.joins}
    ${where}
    ${s.groupBy}
    ${s.orderBy}
    ${s.limit != null ? `LIMIT ${s.limit}` : ""}
    ${s.offset != null ? `OFFSET ${s.offset}` : ""}
  `;
}
class PostError extends Error {
  meta;
  reason;
  type;
  constructor(reason, meta) {
    super("PostError: " + reason);
    this.type = "PostError";
    this.reason = reason;
    this.meta = meta;
  }
}
let BankSyncError$1 = class BankSyncError extends Error {
  reason;
  category;
  code;
  type;
  constructor(reason, category, code) {
    super("BankSyncError: " + reason);
    this.type = "BankSyncError";
    this.reason = reason;
    this.category = category;
    this.code = code;
  }
};
class HTTPError extends Error {
  statusCode;
  responseBody;
  constructor(code, body) {
    super(`HTTPError: unsuccessful status code (${code}): ${body}`);
    this.statusCode = code;
    this.responseBody = body;
  }
}
class SyncError extends Error {
  meta;
  reason;
  constructor(reason, meta) {
    super("SyncError: " + reason);
    this.reason = reason;
    this.meta = meta;
  }
}
class ValidationError extends Error {
}
class TransactionError extends Error {
}
class RuleError extends Error {
  type;
  constructor(name, message) {
    super("RuleError: " + message);
    this.type = name;
  }
}
function APIError(msg, meta) {
  return { type: "APIError", message: msg, meta };
}
function FileDownloadError(reason, meta) {
  return { type: "FileDownloadError", reason, meta };
}
function FileUploadError(reason, meta) {
  return { type: "FileUploadError", reason, meta };
}
function requiredFields(name, row, fields, update2) {
  fields.forEach((field) => {
    if (update2) {
      if (row.hasOwnProperty(field) && row[field] == null) {
        throw new ValidationError(`${name} is missing field ${String(field)}`);
      }
    } else {
      if (!row.hasOwnProperty(field) || row[field] == null) {
        throw new ValidationError(`${name} is missing field ${String(field)}`);
      }
    }
  });
}
function toDateRepr(str) {
  if (typeof str !== "string") {
    throw new Error("toDateRepr not passed a string: " + str);
  }
  return parseInt(str.replace(/-/g, ""));
}
function fromDateRepr(number2) {
  if (typeof number2 !== "number") {
    throw new Error("fromDateRepr not passed a number: " + number2);
  }
  const dateString = number2.toString();
  return dateString.slice(0, 4) + "-" + dateString.slice(4, 6) + "-" + dateString.slice(6);
}
const accountModel$1 = {
  validate(account, { update: update2 } = {}) {
    requiredFields(
      "account",
      account,
      update2 ? ["name", "offbudget", "closed"] : ["name"],
      update2
    );
    return account;
  }
};
const categoryModel$1 = {
  validate(category, { update: update2 } = {}) {
    requiredFields(
      "category",
      category,
      update2 ? ["name", "is_income", "cat_group"] : ["name", "cat_group"],
      update2
    );
    const { sort_order, ...rest } = category;
    return { ...rest };
  },
  toDb(category, { update: update2 } = {}) {
    return update2 ? convertForUpdate(schema, schemaConfig, "categories", category) : convertForInsert(schema, schemaConfig, "categories", category);
  },
  fromDb(category) {
    return convertFromSelect(
      schema,
      schemaConfig,
      "categories",
      category
    );
  }
};
const categoryGroupModel$1 = {
  validate(categoryGroup, { update: update2 } = {}) {
    requiredFields(
      "categoryGroup",
      categoryGroup,
      update2 ? ["name", "is_income"] : ["name"],
      update2
    );
    const { sort_order, ...rest } = categoryGroup;
    return { ...rest };
  },
  toDb(categoryGroup, { update: update2 } = {}) {
    return update2 ? convertForUpdate(
      schema,
      schemaConfig,
      "category_groups",
      categoryGroup
    ) : convertForInsert(
      schema,
      schemaConfig,
      "category_groups",
      categoryGroup
    );
  },
  fromDb(categoryGroup) {
    const { categories, ...rest } = categoryGroup;
    const categoryGroupEntity = convertFromSelect(
      schema,
      schemaConfig,
      "category_groups",
      rest
    );
    return {
      ...categoryGroupEntity,
      categories: categories.filter((category) => category.cat_group === categoryGroup.id).map(categoryModel$1.fromDb)
    };
  }
};
const payeeModel$1 = {
  validate(payee, { update: update2 } = {}) {
    requiredFields("payee", payee, update2 ? [] : ["name"], update2);
    return payee;
  },
  toDb(payee, { update: update2 } = {}) {
    return update2 ? convertForUpdate(schema, schemaConfig, "payees", payee) : convertForInsert(schema, schemaConfig, "payees", payee);
  },
  fromDb(payee) {
    return convertFromSelect(
      schema,
      schemaConfig,
      "payees",
      payee
    );
  }
};
function isRequired(name, fieldDesc) {
  return fieldDesc.required || name === "id";
}
function convertInputType(value, type) {
  if (value === void 0) {
    throw new Error("Query value cannot be undefined");
  } else if (value === null) {
    if (type === "boolean") {
      return 0;
    }
    return null;
  }
  switch (type) {
    case "date":
      if (value instanceof Date) {
        return toDateRepr(dayFromDate(value));
      } else if (value.match(/^\d{4}-\d{2}-\d{2}$/) == null || value.date < "2000-01-01") {
        throw new Error("Invalid date: " + value);
      }
      return toDateRepr(value);
    case "date-month":
      return toDateRepr(value.slice(0, 7));
    case "date-year":
      return toDateRepr(value.slice(0, 4));
    case "boolean":
      return value ? 1 : 0;
    case "id":
      if (typeof value !== "string" && value !== null) {
        throw new Error("Invalid id, must be string: " + value);
      }
      return value;
    case "integer":
      if (typeof value === "number" && Number.isInteger(value)) {
        return value;
      } else {
        throw new Error("Can’t convert to integer: " + JSON.stringify(value));
      }
    case "json":
      return JSON.stringify(value);
  }
  return value;
}
function convertOutputType(value, type) {
  if (value === null) {
    if (type === "boolean") {
      return false;
    }
    return null;
  }
  switch (type) {
    case "date":
      return fromDateRepr(value);
    case "date-month":
      return fromDateRepr(value).slice(0, 7);
    case "date-year":
      return fromDateRepr(value).slice(0, 4);
    case "boolean":
      return value === 1;
    case "json":
    case "json/fallback":
      try {
        return JSON.parse(value);
      } catch (e) {
        return type === "json/fallback" ? value : null;
      }
  }
  return value;
}
function conform(schema2, schemaConfig2, table, obj, { skipNull = false } = {}) {
  const tableSchema = schema2[table];
  if (tableSchema == null) {
    throw new Error(`Table “${table}” does not exist`);
  }
  const views = schemaConfig2.views || {};
  const fieldRef = (field) => {
    if (views[table] && views[table].fields) {
      return views[table].fields[field] || field;
    }
    return field;
  };
  return Object.fromEntries(
    Object.keys(obj).map((field) => {
      if (field[0] === "_") {
        return null;
      }
      const fieldDesc = tableSchema[field];
      if (fieldDesc == null) {
        throw new Error(
          `Field “${field}” does not exist on table ${table}: ${JSON.stringify(
            obj
          )}`
        );
      }
      if (isRequired(field, fieldDesc) && obj[field] == null) {
        throw new Error(
          `“${field}” is required for table “${table}”: ${JSON.stringify(
            obj
          )}`
        );
      }
      if (skipNull && obj[field] == null) {
        return null;
      }
      return [fieldRef(field), convertInputType(obj[field], fieldDesc.type)];
    }).filter(Boolean)
  );
}
function convertForInsert(schema2, schemaConfig2, table, rawObj) {
  const obj = { ...rawObj };
  const tableSchema = schema2[table];
  if (tableSchema == null) {
    throw new Error(`Error inserting: table “${table}” does not exist`);
  }
  Object.keys(tableSchema).forEach((field) => {
    const fieldDesc = tableSchema[field];
    if (obj[field] == null) {
      if (fieldDesc.default !== void 0) {
        obj[field] = typeof fieldDesc.default === "function" ? fieldDesc.default() : fieldDesc.default;
      } else if (isRequired(field, fieldDesc)) {
        throw new Error(
          `“${field}” is required for table “${table}”: ${JSON.stringify(obj)}`
        );
      }
    }
  });
  return conform(schema2, schemaConfig2, table, obj, { skipNull: true });
}
function convertForUpdate(schema2, schemaConfig2, table, rawObj) {
  const obj = { ...rawObj };
  const tableSchema = schema2[table];
  if (tableSchema == null) {
    throw new Error(`Error updating: table “${table}” does not exist`);
  }
  return conform(schema2, schemaConfig2, table, obj);
}
function convertFromSelect(schema2, schemaConfig2, table, obj) {
  const tableSchema = schema2[table];
  if (tableSchema == null) {
    throw new Error(`Table “${table}” does not exist`);
  }
  const fields = Object.keys(tableSchema);
  const result = {};
  for (let i = 0; i < fields.length; i++) {
    const fieldName = fields[i];
    const fieldDesc = tableSchema[fieldName];
    result[fieldName] = convertOutputType(obj[fieldName], fieldDesc.type);
  }
  return result;
}
function applyTypes(data, outputTypes) {
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    Object.keys(item).forEach((name) => {
      item[name] = convertOutputType(item[name], outputTypes.get(name));
    });
  }
}
async function execQuery$1(queryState, compilerState, sqlPieces, params, outputTypes) {
  const sql = defaultConstructQuery(queryState, compilerState, sqlPieces);
  const data = await all(sql, params);
  applyTypes(data, outputTypes);
  return data;
}
async function runCompiledAqlQuery(queryState, sqlPieces, compilerState, { params = {}, executors = {} } = {}) {
  const paramArray = compilerState.namedParameters.map((param) => {
    const name = param.paramName;
    if (params[name] === void 0) {
      throw new Error(`Parameter ${name} not provided to query`);
    }
    return convertInputType(params[name], param.paramType);
  });
  let data = [];
  if (executors[compilerState.implicitTableName]) {
    data = await executors[compilerState.implicitTableName](
      compilerState,
      queryState,
      sqlPieces,
      paramArray,
      compilerState.outputTypes
    );
  } else {
    data = await execQuery$1(
      queryState,
      compilerState,
      sqlPieces,
      paramArray,
      compilerState.outputTypes
    );
  }
  if (queryState.calculation) {
    if (data.length > 0) {
      const row = data[0];
      const k = Object.keys(row)[0];
      return row[k] || 0;
    } else {
      return null;
    }
  }
  return data;
}
async function compileAndRunAqlQuery(schema2, schemaConfig2, queryState, options) {
  const { sqlPieces, state } = compileQuery(queryState, schema2, schemaConfig2);
  const data = await runCompiledAqlQuery(
    queryState,
    sqlPieces,
    state,
    options
  );
  return { data, dependencies: state.dependencies };
}
function f(type, opts) {
  return { type, ...opts };
}
const schema = {
  transactions: {
    id: f("id"),
    is_parent: f("boolean"),
    is_child: f("boolean"),
    parent_id: f("id"),
    account: f("id", { ref: "accounts", required: true }),
    category: f("id", { ref: "categories" }),
    amount: f("integer", { default: 0, required: true }),
    payee: f("id", { ref: "payees" }),
    notes: f("string"),
    date: f("date", { required: true }),
    imported_id: f("string"),
    error: f("json"),
    imported_payee: f("string"),
    starting_balance_flag: f("boolean"),
    transfer_id: f("id"),
    sort_order: f("float", { default: () => Date.now() }),
    cleared: f("boolean", { default: true }),
    reconciled: f("boolean", { default: false }),
    tombstone: f("boolean"),
    schedule: f("id", { ref: "schedules" }),
    raw_synced_data: f("string")
    // subtransactions is a special field added if the table has the
    // `splits: grouped` option
  },
  payees: {
    id: f("id"),
    name: f("string", { required: true }),
    transfer_acct: f("id", { ref: "accounts" }),
    tombstone: f("boolean"),
    favorite: f("boolean"),
    learn_categories: f("boolean")
  },
  accounts: {
    id: f("id"),
    name: f("string", { required: true }),
    offbudget: f("boolean"),
    closed: f("boolean"),
    sort_order: f("float"),
    tombstone: f("boolean"),
    account_id: f("string"),
    official_name: f("string"),
    account_sync_source: f("string"),
    last_reconciled: f("string"),
    last_sync: f("string")
  },
  categories: {
    id: f("id"),
    name: f("string"),
    is_income: f("boolean"),
    hidden: f("boolean"),
    group: f("id", { ref: "category_groups" }),
    goal_def: f("string"),
    sort_order: f("float"),
    tombstone: f("boolean")
  },
  category_groups: {
    id: f("id"),
    name: f("string"),
    is_income: f("boolean"),
    hidden: f("boolean"),
    sort_order: f("float"),
    tombstone: f("boolean")
  },
  schedules: {
    id: f("id"),
    name: f("string"),
    rule: f("id", { ref: "rules", required: true }),
    next_date: f("date"),
    completed: f("boolean"),
    posts_transaction: f("boolean"),
    tombstone: f("boolean"),
    // These are special fields that are actually pulled from the
    // underlying rule
    _payee: f("id", { ref: "payees" }),
    _account: f("id", { ref: "accounts" }),
    _amount: f("json/fallback"),
    _amountOp: f("string"),
    _date: f("json/fallback"),
    _conditions: f("json"),
    _actions: f("json")
  },
  rules: {
    id: f("id"),
    stage: f("string"),
    conditions_op: f("string"),
    conditions: f("json"),
    actions: f("json"),
    tombstone: f("boolean")
  },
  notes: {
    id: f("id"),
    note: f("string")
  },
  preferences: {
    id: f("id"),
    value: f("string")
  },
  transaction_filters: {
    id: f("id"),
    name: f("string"),
    conditions_op: f("string"),
    conditions: f("json"),
    tombstone: f("boolean")
  },
  custom_reports: {
    id: f("id"),
    name: f("string"),
    start_date: f("string", { default: "2023-06" }),
    end_date: f("string", { default: "2023-09" }),
    date_static: f("integer", { default: 0 }),
    date_range: f("string"),
    mode: f("string", { default: "total" }),
    group_by: f("string", { default: "Category" }),
    sort_by: f("string", { default: "desc" }),
    balance_type: f("string", { default: "Expense" }),
    show_empty: f("integer", { default: 0 }),
    show_offbudget: f("integer", { default: 0 }),
    show_hidden: f("integer", { default: 0 }),
    show_uncategorized: f("integer", { default: 0 }),
    include_current: f("integer", { default: 0 }),
    graph_type: f("string", { default: "BarGraph" }),
    conditions: f("json"),
    conditions_op: f("string"),
    metadata: f("json"),
    interval: f("string", { default: "Monthly" }),
    color_scheme: f("json"),
    tombstone: f("boolean")
  },
  reflect_budgets: {
    id: f("id"),
    month: f("integer"),
    category: f("string"),
    amount: f("integer"),
    carryover: f("integer"),
    goal: f("integer"),
    long_goal: f("integer")
  },
  zero_budgets: {
    id: f("id"),
    month: f("integer"),
    category: f("string", { ref: "categories" }),
    amount: f("integer"),
    carryover: f("integer"),
    goal: f("integer"),
    long_goal: f("integer")
  },
  dashboard: {
    id: f("id"),
    type: f("string", { required: true }),
    width: f("integer", { required: true }),
    height: f("integer", { required: true }),
    x: f("integer", { required: true }),
    y: f("integer", { required: true }),
    meta: f("json"),
    tombstone: f("boolean")
  }
};
const schemaConfig = {
  // Note: these views *must* represent the underlying table that we
  // are mapping here. The compiler makes optimizations with this
  // assumption
  tableViews(name, { isJoin, withDead, tableOptions = { splits: void 0 } }) {
    switch (name) {
      case "transactions": {
        if (isJoin) {
          return "v_transactions_internal_alive";
        }
        const splitType = tableOptions.splits || "inline";
        if (!withDead && (splitType === "inline" || splitType === "none")) {
          return "v_transactions_internal_alive";
        }
        return "v_transactions_internal";
      }
      case "schedules":
        return "v_schedules";
      case "categories":
        return "v_categories";
      case "payees":
        return "v_payees";
    }
    return name;
  },
  customizeQuery(queryState) {
    const { table: tableName } = queryState;
    function orderBy(orders) {
      if (orders.length > 0) {
        return orders.concat(["id"]);
      }
      switch (tableName) {
        case "transactions":
          return [
            { date: "desc" },
            "starting_balance_flag",
            { sort_order: "desc" },
            "id"
          ];
        case "category_groups":
          return ["is_income", "sort_order", "id"];
        case "categories":
          return ["sort_order", "id"];
        case "payees":
          return [
            { $condition: { transfer_acct: null }, $dir: "desc" },
            { $nocase: "$name" }
          ];
        case "accounts":
          return ["sort_order", "name"];
        case "schedules":
          return [{ $condition: { completed: true } }, "next_date"];
      }
      return [];
    }
    return {
      ...queryState,
      orderExpressions: orderBy(queryState.orderExpressions)
    };
  },
  views: {
    payees: {
      v_payees: (internalFields2) => {
        const fields = internalFields2({
          name: "COALESCE(__accounts.name, _.name)"
        });
        return `
          SELECT ${fields} FROM payees _
          LEFT JOIN accounts __accounts ON (_.transfer_acct = __accounts.id AND __accounts.tombstone = 0)
          -- We never want to show transfer payees that are pointing to deleted accounts.
          -- Either this is not a transfer payee, if the account exists
          WHERE _.transfer_acct IS NULL OR __accounts.id IS NOT NULL
        `;
      }
    },
    categories: {
      fields: {
        group: "cat_group"
      },
      v_categories: (internalFields2) => {
        const fields = internalFields2({ group: "cat_group" });
        return `SELECT ${fields} FROM categories _`;
      }
    },
    schedules: {
      v_schedules: (internalFields2) => {
        const fields = internalFields2({
          next_date: `
            CASE
              WHEN _nd.local_next_date_ts = _nd.base_next_date_ts THEN _nd.local_next_date
              ELSE _nd.base_next_date
            END
          `,
          _payee: `pm.targetId`,
          _account: `json_extract(_rules.conditions, _paths.account || '.value')`,
          _amount: `json_extract(_rules.conditions, _paths.amount || '.value')`,
          _amountOp: `json_extract(_rules.conditions, _paths.amount || '.op')`,
          _date: `json_extract(_rules.conditions, _paths.date || '.value')`,
          _conditions: "_rules.conditions",
          _actions: "_rules.actions"
        });
        return `
        SELECT ${fields} FROM schedules _
        LEFT JOIN schedules_next_date _nd ON _nd.schedule_id = _.id
        LEFT JOIN schedules_json_paths _paths ON _paths.schedule_id = _.id
        LEFT JOIN rules _rules ON _rules.id = _.rule
        LEFT JOIN payee_mapping pm ON pm.id = json_extract(_rules.conditions, _paths.payee || '.value')
        `;
      }
    },
    transactions: {
      fields: {
        is_parent: "isParent",
        is_child: "isChild",
        account: "acct",
        imported_id: "financial_id",
        imported_payee: "imported_description",
        transfer_id: "transferred_id",
        payee: "description"
      },
      v_transactions_internal: (internalFields2) => {
        const fields = internalFields2({
          payee: "pm.targetId",
          category: `CASE WHEN _.isParent = 1 THEN NULL ELSE cm.transferId END`,
          amount: `IFNULL(_.amount, 0)`,
          parent_id: "CASE WHEN _.isChild = 0 THEN NULL ELSE _.parent_id END"
        });
        return `
          SELECT ${fields} FROM transactions _
          LEFT JOIN category_mapping cm ON cm.id = _.category
          LEFT JOIN payee_mapping pm ON pm.id = _.description
          WHERE
           _.date IS NOT NULL AND
           _.acct IS NOT NULL AND
           (_.isChild = 0 OR _.parent_id IS NOT NULL)
        `;
      },
      // We join on t2 to only include valid child transactions. We
      // want to only include ones with valid parents, which is when
      // an alive parent transaction exists
      v_transactions_internal_alive: `
        SELECT _.* FROM v_transactions_internal _
        LEFT JOIN transactions t2 ON (_.is_child = 1 AND t2.id = _.parent_id)
        WHERE IFNULL(_.tombstone, 0) = 0 AND (_.is_child = 0 OR t2.tombstone = 0)
      `,
      v_transactions: (_, publicFields2) => {
        const fields = publicFields2({
          payee: "p.id",
          category: "c.id",
          account: "a.id"
        });
        return `
          SELECT ${fields} FROM v_transactions_internal_alive _
          LEFT JOIN payees p ON (p.id = _.payee AND p.tombstone = 0)
          LEFT JOIN categories c ON (c.id = _.category AND c.tombstone = 0)
          LEFT JOIN accounts a ON (a.id = _.account AND a.tombstone = 0)
          ORDER BY _.date desc, _.starting_balance_flag, _.sort_order desc, _.id;
        `;
      }
    }
  }
};
async function incrFetch(runQuery2, terms, compare, makeQuery, params = []) {
  const pageCount = 500;
  let results = [];
  let fetchedIds = /* @__PURE__ */ new Set();
  for (let i = 0; i < terms.length; i += pageCount) {
    const slice = terms.slice(i, i + pageCount).filter((id) => !fetchedIds.has(id));
    if (slice.length > 0) {
      const filter = slice.map((id) => compare(id)).join(" OR ");
      const query = makeQuery("(" + filter + ")");
      const rows = await runQuery2(query, params, true);
      fetchedIds = /* @__PURE__ */ new Set([...fetchedIds, ...slice]);
      results = results.concat(rows);
    }
  }
  return results;
}
function whereIn(ids, field) {
  const ids2 = [...new Set(ids)];
  const filter = `${field} IN (` + ids2.map((id) => `'${id}'`).join(",") + ")";
  return filter;
}
function toGroup(parents, children, mapper = (x) => x) {
  return parents.reduce((list, parent) => {
    const childs = children.get(parent.id) || [];
    list.push({
      ...mapper(parent),
      subtransactions: childs.map(mapper)
    });
    return list;
  }, []);
}
function execTransactions(compilerState, queryState, sqlPieces, params, outputTypes) {
  const tableOptions = queryState.tableOptions || {};
  const splitType = tableOptions.splits ? tableOptions.splits : "inline";
  if (!isValidSplitsOption(splitType)) {
    throw new Error(`Invalid “splits” option for transactions: “${splitType}”`);
  }
  if (splitType === "all" || splitType === "inline" || splitType === "none") {
    return execTransactionsBasic(
      compilerState,
      queryState,
      sqlPieces,
      params,
      splitType,
      outputTypes
    );
  } else if (splitType === "grouped") {
    return execTransactionsGrouped(
      compilerState,
      queryState,
      sqlPieces,
      params,
      outputTypes
    );
  }
}
function _isUnhappy(filter) {
  for (const key of Object.keys(filter)) {
    if (key === "$or" || key === "$and") {
      if (filter[key] && _isUnhappy(filter[key])) {
        return true;
      }
    } else if (!(key.indexOf("account") === 0 || key === "date")) {
      return true;
    }
  }
  return false;
}
function isHappyPathQuery(queryState) {
  return queryState.filterExpressions.find(_isUnhappy) == null;
}
async function execTransactionsGrouped(compilerState, queryState, sqlPieces, params, outputTypes) {
  const { withDead } = queryState;
  const whereDead = withDead ? "" : `AND ${sqlPieces.from}.tombstone = 0`;
  if (isAggregateQuery(queryState)) {
    const s = { ...sqlPieces };
    s.where = `${s.where} AND ${s.from}.is_parent = 0`;
    if (!withDead) {
      s.from = "v_transactions_internal_alive v_transactions_internal";
    }
    return execQuery$1(queryState, compilerState, s, params, outputTypes);
  }
  let rows;
  let matched = null;
  if (isHappyPathQuery(queryState)) {
    const rowSql = `
      SELECT ${sqlPieces.from}.id as group_id
      FROM ${sqlPieces.from}
      ${sqlPieces.joins}
      ${sqlPieces.where} AND is_child = 0 ${whereDead}
      ${sqlPieces.orderBy}
      ${sqlPieces.limit != null ? `LIMIT ${sqlPieces.limit}` : ""}
      ${sqlPieces.offset != null ? `OFFSET ${sqlPieces.offset}` : ""}
    `;
    rows = await all(rowSql, params);
  } else {
    const rowSql = `
      SELECT group_id, matched FROM (
        SELECT
          group_id,
          GROUP_CONCAT(id) as matched
          FROM (
            SELECT ${sqlPieces.from}.id, IFNULL(${sqlPieces.from}.parent_id, ${sqlPieces.from}.id) as group_id
            FROM ${sqlPieces.from}
            LEFT JOIN transactions _t2 ON ${sqlPieces.from}.is_child = 1 AND _t2.id = ${sqlPieces.from}.parent_id
            ${sqlPieces.joins}
            ${sqlPieces.where} AND ${sqlPieces.from}.tombstone = 0 AND IFNULL(_t2.tombstone, 0) = 0
          )
        GROUP BY group_id
      )
      LEFT JOIN ${sqlPieces.from} ON ${sqlPieces.from}.id = group_id
      ${sqlPieces.joins}
      ${sqlPieces.orderBy}
      ${sqlPieces.limit != null ? `LIMIT ${sqlPieces.limit}` : ""}
      ${sqlPieces.offset != null ? `OFFSET ${sqlPieces.offset}` : ""}
    `;
    rows = await all(rowSql, params);
    matched = new Set(
      [].concat.apply(
        [],
        rows.map((row) => row.matched.split(","))
      )
    );
  }
  const where = whereIn(
    rows.map((row) => row.group_id),
    `IFNULL(${sqlPieces.from}.parent_id, ${sqlPieces.from}.id)`
  );
  const finalSql = `
    SELECT ${sqlPieces.select}, parent_id AS _parent_id FROM ${sqlPieces.from}
    ${sqlPieces.joins}
    WHERE ${where} ${whereDead}
    ${sqlPieces.orderBy}
  `;
  const allRows = await all(finalSql);
  const { parents, children } = allRows.reduce(
    (acc, trans) => {
      const pid = trans._parent_id;
      delete trans._parent_id;
      if (pid == null) {
        acc.parents.push(trans);
      } else {
        const arr = acc.children.get(pid) || [];
        arr.push(trans);
        acc.children.set(pid, arr);
      }
      return acc;
    },
    { parents: [], children: /* @__PURE__ */ new Map() }
  );
  const mapper = (trans) => {
    Object.keys(trans).forEach((name) => {
      trans[name] = convertOutputType(trans[name], outputTypes.get(name));
    });
    if (matched && !matched.has(trans.id)) {
      trans._unmatched = true;
    }
    return trans;
  };
  return toGroup(parents, children, mapper);
}
async function execTransactionsBasic(compilerState, queryState, sqlPieces, params, splitType, outputTypes) {
  const s = { ...sqlPieces };
  if (splitType !== "all") {
    if (splitType === "none") {
      s.where = `${s.where} AND ${s.from}.parent_id IS NULL`;
    } else {
      s.where = `${s.where} AND ${s.from}.is_parent = 0`;
    }
  }
  return execQuery$1(queryState, compilerState, s, params, outputTypes);
}
function isValidSplitsOption(splits) {
  return ["all", "inline", "none", "grouped"].includes(splits);
}
async function execCategoryGroups(compilerState, queryState, sqlPieces, params, outputTypes) {
  const tableOptions = queryState.tableOptions || {};
  const categoriesOption = tableOptions.categories ? tableOptions.categories : "all";
  if (!isValidCategoriesOption(categoriesOption)) {
    throw new Error(
      `Invalid “categories” option for category_groups: “${categoriesOption}”`
    );
  }
  if (categoriesOption !== "none") {
    return execCategoryGroupsWithCategories(
      compilerState,
      queryState,
      sqlPieces,
      params,
      categoriesOption,
      outputTypes
    );
  }
  return execCategoryGroupsBasic(
    compilerState,
    queryState,
    sqlPieces,
    params,
    outputTypes
  );
}
async function execCategoryGroupsWithCategories(compilerState, queryState, sqlPieces, params, categoriesOption, outputTypes) {
  const categoryGroups = await execCategoryGroupsBasic(
    compilerState,
    queryState,
    sqlPieces,
    params,
    outputTypes
  );
  if (categoriesOption === "none") {
    return categoryGroups;
  }
  const { data: categories } = await aqlQuery(
    q("categories").filter({
      group: { $oneof: categoryGroups.map((cg) => cg.id) }
    }).select("*")
  );
  return categoryGroups.map((group) => {
    const cats = categories.filter((cat) => cat.group === group.id);
    return {
      ...group,
      categories: cats
    };
  });
}
async function execCategoryGroupsBasic(compilerState, queryState, sqlPieces, params, outputTypes) {
  return execQuery$1(queryState, compilerState, sqlPieces, params, outputTypes);
}
function isValidCategoriesOption(categories) {
  return ["all", "none"].includes(categories);
}
const schemaExecutors = {
  transactions: execTransactions,
  category_groups: execCategoryGroups
};
function selectFields(fields) {
  return Object.keys(fields).map((as) => {
    let field = fields[as];
    const needsAs = field !== as;
    if (!field.match(/[ .]/)) {
      field = `_.${field}`;
    }
    return needsAs ? `${field} AS ${quoteAlias(as)}` : `${field}`;
  }).join(", ");
}
function makeViews(schema2, schemaConfig2) {
  const views = schemaConfig2.views;
  const viewStrs = [];
  Object.keys(views).forEach((table) => {
    const { fields: fieldMappings = {}, ...tableViews } = views[table];
    const publicFields2 = Object.fromEntries(
      Object.keys(schema2[table]).map((name) => [name, name])
    );
    const internalFields2 = { ...publicFields2, ...fieldMappings };
    Object.keys(tableViews).forEach((viewName) => {
      const publicMaker = (overrides) => {
        const fields = { ...publicFields2, ...overrides };
        return selectFields(fields);
      };
      const internalMaker = (overrides) => {
        const fields = { ...internalFields2, ...overrides };
        return selectFields(fields);
      };
      let sql;
      if (typeof tableViews[viewName] === "function") {
        sql = tableViews[viewName](internalMaker, publicMaker);
      } else {
        sql = tableViews[viewName];
      }
      sql = sql.trim().replace(/;$/, "");
      viewStrs.push(`
        DROP VIEW IF EXISTS ${viewName};
        CREATE VIEW ${viewName} AS ${sql};
      `);
    });
  });
  return viewStrs.join("\n");
}
function aqlCompiledQuery(queryState, sqlPieces, compilerState, params) {
  return runCompiledAqlQuery(queryState, sqlPieces, compilerState, {
    params,
    executors: schemaExecutors
  });
}
function aqlQuery(query, params) {
  if (query instanceof Query) {
    query = query.serialize();
  }
  return compileAndRunAqlQuery(schema, schemaConfig, query, {
    params,
    executors: schemaExecutors
  });
}
const logger = {
  info: (...args) => {
    console.log(...args);
  },
  warn: (...args) => {
    console.warn(...args);
  }
};
function sequential(fn) {
  const sequenceState = {
    running: null,
    queue: []
  };
  function pump() {
    const next = sequenceState.queue.shift();
    if (next !== void 0) {
      run2(next.args, next.resolve, next.reject);
    } else {
      sequenceState.running = null;
    }
  }
  function run2(args, resolve, reject) {
    sequenceState.running = fn.apply(null, args).then(
      (val2) => {
        pump();
        resolve(val2);
      },
      (err) => {
        pump();
        reject(err);
      }
    );
  }
  return (...args) => {
    if (!sequenceState.running) {
      return new Promise((resolve, reject) => {
        return run2(args, resolve, reject);
      });
    } else {
      return new Promise((resolve, reject) => {
        sequenceState.queue.push({ resolve, reject, args });
      });
    }
  };
}
function once(fn) {
  let promise = null;
  return (...args) => {
    if (!promise) {
      promise = fn.apply(null, args).finally(() => {
        promise = null;
      });
      return promise;
    }
    return promise;
  };
}
function Graph() {
  const graph = {
    addNode,
    removeNode,
    adjacent,
    adjacentIncoming,
    addEdge,
    removeEdge,
    removeIncomingEdges,
    topologicalSort,
    generateDOT,
    getEdges
  };
  const edges = /* @__PURE__ */ new Map();
  const incomingEdges = /* @__PURE__ */ new Map();
  function getEdges() {
    return { edges, incomingEdges };
  }
  function addNode(node) {
    edges.set(node, adjacent(node));
    incomingEdges.set(node, adjacentIncoming(node));
    return graph;
  }
  function removeIncomingEdges(node) {
    const incoming = adjacentIncoming(node);
    incomingEdges.set(node, /* @__PURE__ */ new Set());
    const iter = incoming.values();
    let cur = iter.next();
    while (!cur.done) {
      removeEdge(cur.value, node);
      cur = iter.next();
    }
  }
  function removeNode(node) {
    removeIncomingEdges(node);
    edges.delete(node);
    incomingEdges.delete(node);
    return graph;
  }
  function adjacent(node) {
    return edges.get(node) || /* @__PURE__ */ new Set();
  }
  function adjacentIncoming(node) {
    return incomingEdges.get(node) || /* @__PURE__ */ new Set();
  }
  function addEdge(node1, node2) {
    addNode(node1);
    addNode(node2);
    adjacent(node1).add(node2);
    adjacentIncoming(node2).add(node1);
    return graph;
  }
  function removeEdge(node1, node2) {
    if (edges.has(node1)) {
      adjacent(node1).delete(node2);
    }
    if (incomingEdges.has(node2)) {
      adjacentIncoming(node2).delete(node1);
    }
    return graph;
  }
  function topologicalSort(sourceNodes) {
    const visited = /* @__PURE__ */ new Set();
    const sorted = [];
    sourceNodes.forEach((name) => {
      if (!visited.has(name)) {
        topologicalSortIterable(name, visited, sorted);
      }
    });
    return sorted;
  }
  function topologicalSortIterable(name, visited, sorted) {
    const stackTrace = [];
    stackTrace.push({
      count: -1,
      value: name,
      parent: "",
      level: 0
    });
    while (stackTrace.length > 0) {
      const current = stackTrace.slice(-1)[0];
      const adjacents = adjacent(current.value);
      if (current.count === -1) {
        current.count = adjacents.size;
      }
      if (current.count > 0) {
        const iter = adjacents.values();
        let cur = iter.next();
        while (!cur.done) {
          if (!visited.has(cur.value)) {
            stackTrace.push({
              count: -1,
              parent: current.value,
              value: cur.value,
              level: current.level + 1
            });
          } else {
            current.count--;
          }
          cur = iter.next();
        }
      } else {
        if (!visited.has(current.value)) {
          visited.add(current.value);
          sorted.unshift(current.value);
        }
        const removed = stackTrace.pop();
        for (let i = 0; i < stackTrace.length; i++) {
          if (stackTrace[i].value === removed.parent) {
            stackTrace[i].count--;
          }
        }
      }
    }
  }
  function generateDOT() {
    const edgeStrings = [];
    edges.forEach(function(adj, edge) {
      if (adj.length !== 0) {
        edgeStrings.push(`${edge} -> {${adj.join(",")}}`);
      }
    });
    return `
    digraph G {
      ${edgeStrings.join("\n").replace(/!/g, "_")}
    }
    `;
  }
  return graph;
}
function unresolveName(name) {
  const idx = name.indexOf("!");
  if (idx !== -1) {
    return {
      sheet: name.slice(0, idx),
      name: name.slice(idx + 1)
    };
  }
  return { sheet: null, name };
}
function resolveName(sheet, name) {
  return sheet + "!" + name;
}
class Spreadsheet {
  _meta;
  cacheBarrier;
  computeQueue;
  dirtyCells;
  events;
  graph;
  nodes;
  running;
  saveCache;
  setCacheStatus;
  transactionDepth;
  constructor(saveCache, setCacheStatus2) {
    this.graph = new Graph();
    this.nodes = /* @__PURE__ */ new Map();
    this.transactionDepth = 0;
    this.saveCache = saveCache;
    this.setCacheStatus = setCacheStatus2;
    this.dirtyCells = [];
    this.computeQueue = [];
    this.events = mitt();
    this._meta = {
      createdMonths: /* @__PURE__ */ new Set(),
      budgetType: "envelope"
    };
  }
  meta() {
    return this._meta;
  }
  setMeta(meta) {
    this._meta = meta;
  }
  // Spreadsheet interface
  _getNode(name) {
    const { sheet } = unresolveName(name);
    if (!this.nodes.has(name)) {
      this.nodes.set(name, {
        name,
        expr: null,
        value: null,
        sheet
      });
    }
    return this.nodes.get(name);
  }
  getNode(name) {
    return this._getNode(name);
  }
  hasCell(name) {
    return this.nodes.has(name);
  }
  add(name, expr) {
    this.set(name, expr);
  }
  getNodes() {
    return this.nodes;
  }
  serialize() {
    return {
      graph: this.graph.getEdges(),
      nodes: [...this.nodes.entries()]
    };
  }
  transaction(func) {
    this.startTransaction();
    try {
      func();
    } catch (e) {
      console.log(e);
    }
    return this.endTransaction();
  }
  startTransaction() {
    this.transactionDepth++;
  }
  endTransaction() {
    this.transactionDepth--;
    if (this.transactionDepth === 0) {
      const cells = this.dirtyCells;
      this.dirtyCells = [];
      this.queueComputation(this.graph.topologicalSort(cells));
    }
    return [];
  }
  queueComputation(cellNames) {
    this.computeQueue = this.computeQueue.concat(cellNames);
    Promise.resolve().then(() => {
      if (!this.running) {
        this.runComputations();
      }
    });
  }
  runComputations(idx = 0) {
    this.running = true;
    while (idx < this.computeQueue.length) {
      const name = this.computeQueue[idx];
      let node;
      let result;
      try {
        node = this.getNode(name);
        if (node._run) {
          const args = node._dependencies.map((dep) => {
            return this.getNode(dep).value;
          });
          result = node._run(...args);
          if (result instanceof Promise) {
            console.warn(
              `dynamic cell ${name} returned a promise! this is discouraged because errors are not handled properly`
            );
          }
        } else if (node.sql) {
          result = aqlCompiledQuery(
            node.query,
            node.sql.sqlPieces,
            node.sql.state
          );
        } else {
          idx++;
          continue;
        }
      } catch (e) {
        console.log("Error while evaluating " + name + ":", e);
        this.running = false;
        this.computeQueue = [];
        return;
      }
      if (result instanceof Promise) {
        result.then(
          (value) => {
            node.value = value;
            this.runComputations(idx + 1);
          },
          (err) => {
            console.warn(`Failed running ${node.name}!`, err);
            this.runComputations(idx + 1);
          }
        );
        return;
      } else {
        node.value = result;
      }
      idx++;
    }
    if (idx === this.computeQueue.length) {
      this.events.emit("change", { names: this.computeQueue });
      if (typeof this.saveCache === "function") {
        this.saveCache(this.computeQueue);
      }
      this.markCacheSafe();
      this.running = false;
      this.computeQueue = [];
    }
  }
  markCacheSafe() {
    if (!this.cacheBarrier) {
      if (this.setCacheStatus) {
        this.setCacheStatus({ clean: true });
      }
    }
  }
  markCacheDirty() {
    if (this.setCacheStatus) {
      this.setCacheStatus({ clean: false });
    }
  }
  startCacheBarrier() {
    this.cacheBarrier = true;
    this.markCacheDirty();
  }
  endCacheBarrier() {
    this.cacheBarrier = false;
    const pendingChange = this.running || this.computeQueue.length > 0;
    if (!pendingChange) {
      this.markCacheSafe();
    }
  }
  addEventListener(name, func) {
    this.events.on(name, func);
    return () => this.events.off(name, func);
  }
  onFinish(func) {
    if (this.transactionDepth !== 0) {
      throw new Error(
        "onFinish called while inside a spreadsheet transaction. This is not allowed as it will lead to race conditions"
      );
    }
    if (!this.running && this.computeQueue.length === 0) {
      func([]);
      return () => {
      };
    }
    const remove = this.addEventListener("change", (...args) => {
      remove();
      return func(...args);
    });
    return remove;
  }
  unload() {
    this.events.all.clear();
  }
  getValue(name) {
    return this.getNode(name).value;
  }
  getExpr(name) {
    return this.getNode(name).expr;
  }
  getCellValue(sheet, name) {
    return this.getNode(resolveName(sheet, name)).value;
  }
  getCellExpr(sheet, name) {
    return this.getNode(resolveName(sheet, name)).expr;
  }
  getCellValueLoose(sheetName, cellName) {
    const name = resolveName(sheetName, cellName);
    if (this.nodes.has(name)) {
      return this.getNode(name).value;
    }
    return null;
  }
  bootup(onReady) {
    this.onFinish(() => {
      onReady();
    });
  }
  load(name, value) {
    const node = this._getNode(name);
    node.expr = value;
    node.value = value;
  }
  create(name, value) {
    return this.transaction(() => {
      const node = this._getNode(name);
      node.expr = value;
      node.value = value;
      this._markDirty(name);
    });
  }
  set(name, value) {
    this.create(name, value);
  }
  recompute(name) {
    this.transaction(() => {
      this.dirtyCells.push(name);
    });
  }
  recomputeAll() {
    this.transaction(() => {
      this.dirtyCells = [...this.nodes.keys()];
    });
  }
  createQuery(sheetName, cellName, query) {
    const name = resolveName(sheetName, cellName);
    const node = this._getNode(name);
    if (node.query !== query) {
      node.query = query;
      const { sqlPieces, state } = compileQuery(
        node.query,
        schema,
        schemaConfig
      );
      node.sql = { sqlPieces, state };
      this.transaction(() => {
        this._markDirty(name);
      });
    }
  }
  createStatic(sheetName, cellName, initialValue) {
    const name = resolveName(sheetName, cellName);
    const exists2 = this.nodes.has(name);
    if (!exists2) {
      this.create(name, initialValue);
    }
  }
  createDynamic(sheetName, cellName, {
    dependencies = [],
    run: run2,
    initialValue,
    refresh = false
  }) {
    const name = resolveName(sheetName, cellName);
    const node = this._getNode(name);
    if (node.dynamic) {
      return;
    }
    node.dynamic = true;
    node._run = run2;
    dependencies = dependencies.map((dep) => {
      let resolved;
      if (!unresolveName(dep).sheet) {
        resolved = resolveName(sheetName, dep);
      } else {
        resolved = dep;
      }
      return resolved;
    });
    node._dependencies = dependencies;
    this.graph.removeIncomingEdges(name);
    dependencies.forEach((dep) => {
      this.graph.addEdge(dep, name);
    });
    if (node.value == null || refresh) {
      this.transaction(() => {
        node.value = initialValue;
        this._markDirty(name);
      });
    }
  }
  clearSheet(sheetName) {
    for (const [name, node] of this.nodes.entries()) {
      if (node.sheet === sheetName) {
        this.nodes.delete(name);
      }
    }
  }
  voidCell(sheetName, name, voidValue = null) {
    const node = this.getNode(resolveName(sheetName, name));
    node._run = null;
    node.dynamic = false;
    node.value = voidValue;
  }
  deleteCell(sheetName, name) {
    this.voidCell(sheetName, name);
    this.nodes.delete(resolveName(sheetName, name));
  }
  addDependencies(sheetName, cellName, deps) {
    const name = resolveName(sheetName, cellName);
    deps = deps.map((dep) => {
      if (!unresolveName(dep).sheet) {
        return resolveName(sheetName, dep);
      }
      return dep;
    });
    const node = this.getNode(name);
    const newDeps = deps.filter(
      (dep) => (node._dependencies || []).indexOf(dep) === -1
    );
    if (newDeps.length > 0) {
      node._dependencies = (node._dependencies || []).concat(newDeps);
      newDeps.forEach((dep) => {
        this.graph.addEdge(dep, name);
      });
      this.recompute(name);
    }
  }
  removeDependencies(sheetName, cellName, deps) {
    const name = resolveName(sheetName, cellName);
    deps = deps.map((dep) => {
      if (!unresolveName(dep).sheet) {
        return resolveName(sheetName, dep);
      }
      return dep;
    });
    const node = this.getNode(name);
    node._dependencies = (node._dependencies || []).filter(
      (dep) => deps.indexOf(dep) === -1
    );
    deps.forEach((dep) => {
      this.graph.removeEdge(dep, name);
    });
    this.recompute(name);
  }
  _markDirty(name) {
    this.dirtyCells.push(name);
  }
  triggerDatabaseChanges(oldValues, newValues) {
    const tables = /* @__PURE__ */ new Set([...oldValues.keys(), ...newValues.keys()]);
    this.startTransaction();
    this.nodes.forEach((node) => {
      if (node.sql && node.sql.state.dependencies.some((dep) => tables.has(dep))) {
        this._markDirty(node.name);
      }
    });
    this.endTransaction();
  }
}
let globalSheet;
let globalOnChange;
let globalCacheDb;
function get$1() {
  return globalSheet;
}
async function updateSpreadsheetCache(rawDb, names) {
  await transaction$1(rawDb, () => {
    names.forEach((name) => {
      const node = globalSheet._getNode(name);
      if (node.sql == null) {
        runQuery$1(
          rawDb,
          "INSERT OR REPLACE INTO kvcache (key, value) VALUES (?, ?)",
          [name, JSON.stringify(node.value)]
        );
      }
    });
  });
}
function setCacheStatus(mainDb, cacheDb, { clean }) {
  if (clean) {
    const num2 = Math.random() * 1e7;
    runQuery$1(
      cacheDb,
      "INSERT OR REPLACE INTO kvcache_key (id, key) VALUES (1, ?)",
      [num2]
    );
    if (mainDb) {
      runQuery$1(
        mainDb,
        "INSERT OR REPLACE INTO kvcache_key (id, key) VALUES (1, ?)",
        [num2]
      );
    }
  } else {
    runQuery$1(cacheDb, "DELETE FROM kvcache_key");
  }
}
function isCacheDirty(mainDb, cacheDb) {
  let rows = runQuery$1(
    cacheDb,
    "SELECT key FROM kvcache_key WHERE id = 1",
    [],
    true
  );
  const num2 = rows.length === 0 ? null : rows[0].key;
  if (num2 == null) {
    return true;
  }
  if (mainDb) {
    const rows2 = runQuery$1(
      mainDb,
      "SELECT key FROM kvcache_key WHERE id = 1",
      [],
      true
    );
    if (rows2.length === 0 || rows2[0].key !== num2) {
      return true;
    }
  }
  rows = runQuery$1(cacheDb, "SELECT * FROM kvcache LIMIT 1", [], true);
  return rows.length === 0;
}
async function loadSpreadsheet(db2, onSheetChange2) {
  const cacheEnabled = process.env.NODE_ENV !== "test";
  const mainDb = db2.getDatabase();
  let cacheDb;
  if (cacheEnabled) {
    const cachePath = db2.getDatabasePath().replace(/db\.sqlite$/, "cache.sqlite");
    globalCacheDb = cacheDb = openDatabase$1(cachePath);
    execQuery$2(
      cacheDb,
      `
        CREATE TABLE IF NOT EXISTS kvcache (key TEXT PRIMARY KEY, value TEXT);
        CREATE TABLE IF NOT EXISTS kvcache_key (id INTEGER PRIMARY KEY, key REAL)
      `
    );
  } else {
    cacheDb = mainDb;
  }
  let sheet;
  if (cacheEnabled) {
    sheet = new Spreadsheet(
      updateSpreadsheetCache.bind(null, cacheDb),
      setCacheStatus.bind(null, mainDb, cacheDb)
    );
  } else {
    sheet = new Spreadsheet();
  }
  globalSheet = sheet;
  globalOnChange = onSheetChange2;
  if (onSheetChange2) {
    sheet.addEventListener("change", onSheetChange2);
  }
  if (cacheEnabled && !isCacheDirty(mainDb, cacheDb)) {
    const cachedRows = await runQuery$1(
      cacheDb,
      "SELECT * FROM kvcache",
      [],
      true
    );
    console.log(`Loaded spreadsheet from cache (${cachedRows.length} items)`);
    for (const row of cachedRows) {
      const parsed = JSON.parse(row.value);
      sheet.load(row.key, parsed);
    }
  } else {
    console.log("Loading fresh spreadsheet");
    await loadUserBudgets(db2);
  }
  return sheet;
}
function unloadSpreadsheet() {
  if (globalSheet) {
    globalSheet.unload();
    globalSheet = null;
  }
  if (globalCacheDb) {
    closeDatabase$1(globalCacheDb);
    globalCacheDb = null;
  }
}
async function reloadSpreadsheet(db2) {
  if (globalSheet) {
    unloadSpreadsheet();
    return loadSpreadsheet(db2, globalOnChange);
  }
}
async function loadUserBudgets(db2) {
  const sheet = globalSheet;
  const { value: budgetType = "envelope" } = await db2.first(
    "SELECT value from preferences WHERE id = ?",
    ["budgetType"]
  ) ?? {};
  const table = budgetType === "tracking" ? "reflect_budgets" : "zero_budgets";
  const budgets = await db2.all(`
      SELECT * FROM ${table} b
      LEFT JOIN categories c ON c.id = b.category
      WHERE c.tombstone = 0
    `);
  sheet.startTransaction();
  for (const budget of budgets) {
    if (budget.month && budget.category) {
      const sheetName = `budget${budget.month}`;
      sheet.set(`${sheetName}!budget-${budget.category}`, budget.amount);
      sheet.set(
        `${sheetName}!carryover-${budget.category}`,
        budget.carryover === 1 ? true : false
      );
      sheet.set(`${sheetName}!goal-${budget.category}`, budget.goal);
      sheet.set(`${sheetName}!long-goal-${budget.category}`, budget.long_goal);
    }
  }
  if (budgetType !== "tracking") {
    const budgetMonths = await db2.all(
      "SELECT * FROM zero_budget_months"
    );
    for (const budgetMonth of budgetMonths) {
      const sheetName = sheetForMonth(budgetMonth.id);
      sheet.set(`${sheetName}!buffered`, budgetMonth.buffered);
    }
  }
  sheet.endTransaction();
}
function getCell$1(sheet, name) {
  return globalSheet._getNode(resolveName(sheet, name));
}
function getCellValue(sheet, name) {
  return globalSheet.getValue(resolveName(sheet, name));
}
function startTransaction() {
  if (globalSheet) {
    globalSheet.startTransaction();
  }
}
function endTransaction() {
  if (globalSheet) {
    globalSheet.endTransaction();
  }
}
function waitOnSpreadsheet() {
  return new Promise((resolve) => {
    if (globalSheet) {
      globalSheet.onFinish(resolve);
    } else {
      resolve(void 0);
    }
  });
}
function getLocale(language) {
  if (!language || typeof language !== "string") {
    return locales__namespace.enUS;
  }
  let localeKey = language.replace("-", "");
  if (localeKey in locales__namespace) {
    return locales__namespace[localeKey];
  }
  localeKey = language.replace("-", "").substring(0, 2);
  if (localeKey in locales__namespace) {
    return locales__namespace[localeKey];
  }
  return locales__namespace.enUS;
}
async function getSheetValue(sheetName, cell) {
  const node = await getCell$1(sheetName, cell);
  return safeNumber(typeof node.value === "number" ? node.value : 0);
}
async function getSheetBoolean(sheetName, cell) {
  const node = await getCell$1(sheetName, cell);
  return typeof node.value === "boolean" ? node.value : false;
}
function calcBufferedAmount(toBudget, buffered, amount) {
  amount = Math.min(Math.max(amount, -buffered), Math.max(toBudget, 0));
  return buffered + amount;
}
function getBudgetTable() {
  return isReflectBudget() ? "reflect_budgets" : "zero_budgets";
}
function isReflectBudget() {
  const budgetType = firstSync(
    `SELECT value FROM preferences WHERE id = ?`,
    ["budgetType"]
  );
  const val2 = budgetType ? budgetType.value : "envelope";
  return val2 === "tracking";
}
function dbMonth(month) {
  return parseInt(month.replace("-", ""));
}
function getBudgetData(table, month) {
  return all(
    `
    SELECT b.*, c.is_income FROM v_categories c
    LEFT JOIN ${table} b ON b.category = c.id
    WHERE c.tombstone = 0 AND b.month = ?
  `,
    [month]
  );
}
function getAllMonths(startMonth) {
  const { createdMonths } = get$1().meta();
  let latest = null;
  for (const month of createdMonths) {
    if (latest == null || month > latest) {
      latest = month;
    }
  }
  return rangeInclusive(startMonth, latest);
}
function getBudget({
  category,
  month
}) {
  const table = getBudgetTable();
  const existing = firstSync(
    `SELECT * FROM ${table} WHERE month = ? AND category = ?`,
    [dbMonth(month), category]
  );
  return existing ? existing.amount || 0 : 0;
}
function setBudget({
  category,
  month,
  amount
}) {
  amount = safeNumber(typeof amount === "number" ? amount : 0);
  const table = getBudgetTable();
  const existing = firstSync(`SELECT id FROM ${table} WHERE month = ? AND category = ?`, [
    dbMonth(month),
    category
  ]);
  if (existing) {
    return update(table, { id: existing.id, amount });
  }
  return insert(table, {
    id: `${dbMonth(month)}-${category}`,
    month: dbMonth(month),
    category,
    amount
  });
}
function setGoal({ month, category, goal, long_goal }) {
  const table = getBudgetTable();
  const existing = firstSync(`SELECT id FROM ${table} WHERE month = ? AND category = ?`, [
    dbMonth(month),
    category
  ]);
  if (existing) {
    return update(table, {
      id: existing.id,
      goal,
      long_goal
    });
  }
  return insert(table, {
    id: `${dbMonth(month)}-${category}`,
    month: dbMonth(month),
    category,
    goal,
    long_goal
  });
}
function setBuffer(month, amount) {
  const existing = firstSync(
    `SELECT id FROM zero_budget_months WHERE id = ?`,
    [month]
  );
  if (existing) {
    return update("zero_budget_months", {
      id: existing.id,
      buffered: amount
    });
  }
  return insert("zero_budget_months", { id: month, buffered: amount });
}
function setCarryover(table, category, month, flag) {
  const existing = firstSync(`SELECT id FROM ${table} WHERE month = ? AND category = ?`, [
    month,
    category
  ]);
  if (existing) {
    return update(table, { id: existing.id, carryover: flag ? 1 : 0 });
  }
  return insert(table, {
    id: `${month}-${category}`,
    month,
    category,
    carryover: flag ? 1 : 0
  });
}
async function copyPreviousMonth({
  month
}) {
  const prevMonth$1 = dbMonth(prevMonth(month));
  const table = getBudgetTable();
  const budgetData = await getBudgetData(table, prevMonth$1.toString());
  await batchMessages(async () => {
    budgetData.forEach((prevBudget) => {
      if (prevBudget.is_income === 1 && !isReflectBudget()) {
        return;
      }
      setBudget({
        category: prevBudget.category,
        month,
        amount: prevBudget.amount
      });
    });
  });
}
async function copySinglePreviousMonth({
  month,
  category
}) {
  const prevMonth$1 = prevMonth(month);
  const newAmount = await getSheetValue(
    sheetForMonth(prevMonth$1),
    "budget-" + category
  );
  await batchMessages(async () => {
    setBudget({ category, month, amount: newAmount });
  });
}
async function setZero({ month }) {
  const categories = await all(
    "SELECT * FROM v_categories WHERE tombstone = 0"
  );
  await batchMessages(async () => {
    categories.forEach((cat) => {
      if (cat.is_income === 1 && !isReflectBudget()) {
        return;
      }
      setBudget({ category: cat.id, month, amount: 0 });
    });
  });
}
async function set3MonthAvg({
  month
}) {
  const categories = await all(
    `
  SELECT c.*
  FROM categories c
  LEFT JOIN category_groups g ON c.cat_group = g.id
  WHERE c.tombstone = 0 AND c.hidden = 0 AND g.hidden = 0
  `
  );
  const prevMonth1 = prevMonth(month);
  const prevMonth2 = prevMonth(prevMonth1);
  const prevMonth3 = prevMonth(prevMonth2);
  await batchMessages(async () => {
    for (const cat of categories) {
      if (cat.is_income === 1 && !isReflectBudget()) {
        continue;
      }
      const spent1 = await getSheetValue(
        sheetForMonth(prevMonth1),
        "sum-amount-" + cat.id
      );
      const spent2 = await getSheetValue(
        sheetForMonth(prevMonth2),
        "sum-amount-" + cat.id
      );
      const spent3 = await getSheetValue(
        sheetForMonth(prevMonth3),
        "sum-amount-" + cat.id
      );
      let avg = Math.round((spent1 + spent2 + spent3) / 3);
      if (cat.is_income === 0) {
        avg *= -1;
      }
      setBudget({ category: cat.id, month, amount: avg });
    }
  });
}
async function set12MonthAvg({
  month
}) {
  const categories = await all(
    `
  SELECT c.*
  FROM categories c
  LEFT JOIN category_groups g ON c.cat_group = g.id
  WHERE c.tombstone = 0 AND c.hidden = 0 AND g.hidden = 0
  `
  );
  await batchMessages(async () => {
    for (const cat of categories) {
      if (cat.is_income === 1 && !isReflectBudget()) {
        continue;
      }
      setNMonthAvg({ month, N: 12, category: cat.id });
    }
  });
}
async function set6MonthAvg({
  month
}) {
  const categories = await all(
    `
  SELECT c.*
  FROM categories c
  LEFT JOIN category_groups g ON c.cat_group = g.id
  WHERE c.tombstone = 0 AND c.hidden = 0 AND g.hidden = 0
  `
  );
  await batchMessages(async () => {
    for (const cat of categories) {
      if (cat.is_income === 1 && !isReflectBudget()) {
        continue;
      }
      setNMonthAvg({ month, N: 6, category: cat.id });
    }
  });
}
async function setNMonthAvg({
  month,
  N,
  category
}) {
  const categoryFromDb = await first(
    "SELECT is_income FROM v_categories WHERE id = ?",
    [category]
  );
  let prevMonth$1 = prevMonth(month);
  let sumAmount = 0;
  for (let l = 0; l < N; l++) {
    sumAmount += await getSheetValue(
      sheetForMonth(prevMonth$1),
      "sum-amount-" + category
    );
    prevMonth$1 = prevMonth(prevMonth$1);
  }
  await batchMessages(async () => {
    let avg = Math.round(sumAmount / N);
    if (categoryFromDb.is_income === 0) {
      avg *= -1;
    }
    setBudget({ category, month, amount: avg });
  });
}
async function holdForNextMonth({
  month,
  amount
}) {
  const row = await first(
    "SELECT buffered FROM zero_budget_months WHERE id = ?",
    [month]
  );
  const sheetName = sheetForMonth(month);
  const toBudget = await getSheetValue(sheetName, "to-budget");
  if (toBudget > 0) {
    const bufferedAmount = calcBufferedAmount(
      toBudget,
      row && row.buffered || 0,
      amount
    );
    await setBuffer(month, bufferedAmount);
    return true;
  }
  return false;
}
async function resetHold({ month }) {
  await setBuffer(month, 0);
}
async function coverOverspending({
  month,
  to,
  from
}) {
  const sheetName = sheetForMonth(month);
  const toBudgeted = await getSheetValue(sheetName, "budget-" + to);
  const leftover = await getSheetValue(sheetName, "leftover-" + to);
  const leftoverFrom = await getSheetValue(
    sheetName,
    from === "to-budget" ? "to-budget" : "leftover-" + from
  );
  if (leftover >= 0 || leftoverFrom <= 0) {
    return;
  }
  const amountCovered = Math.min(-leftover, leftoverFrom);
  if (from !== "to-budget") {
    const fromBudgeted = await getSheetValue(sheetName, "budget-" + from);
    await setBudget({
      category: from,
      month,
      amount: fromBudgeted - amountCovered
    });
  }
  await batchMessages(async () => {
    await setBudget({
      category: to,
      month,
      amount: toBudgeted + amountCovered
    });
    await addMovementNotes({
      month,
      amount: amountCovered,
      to,
      from
    });
  });
}
async function transferAvailable({
  month,
  amount,
  category
}) {
  const sheetName = sheetForMonth(month);
  const leftover = await getSheetValue(sheetName, "to-budget");
  amount = Math.max(Math.min(amount, leftover), 0);
  const budgeted = await getSheetValue(sheetName, "budget-" + category);
  await setBudget({ category, month, amount: budgeted + amount });
}
async function coverOverbudgeted({
  month,
  category
}) {
  const sheetName = sheetForMonth(month);
  const toBudget = await getSheetValue(sheetName, "to-budget");
  const categoryBudget = await getSheetValue(sheetName, "budget-" + category);
  await batchMessages(async () => {
    await setBudget({ category, month, amount: categoryBudget + toBudget });
    await addMovementNotes({
      month,
      amount: -toBudget,
      from: category,
      to: "overbudgeted"
    });
  });
}
async function transferCategory({
  month,
  amount,
  from,
  to
}) {
  const sheetName = sheetForMonth(month);
  const fromBudgeted = await getSheetValue(sheetName, "budget-" + from);
  await batchMessages(async () => {
    await setBudget({ category: from, month, amount: fromBudgeted - amount });
    if (to !== "to-budget") {
      const toBudgeted = await getSheetValue(sheetName, "budget-" + to);
      await setBudget({ category: to, month, amount: toBudgeted + amount });
    }
    await addMovementNotes({
      month,
      amount,
      to,
      from
    });
  });
}
async function setCategoryCarryover({
  startMonth,
  category,
  flag
}) {
  const table = getBudgetTable();
  const months = getAllMonths(startMonth);
  await batchMessages(async () => {
    for (const month of months) {
      setCarryover(table, category, dbMonth(month).toString(), flag);
    }
  });
}
function addNewLine(notes) {
  return !notes ? "" : `${notes}${notes && "\n"}`;
}
async function addMovementNotes({
  month,
  amount,
  to,
  from
}) {
  const displayAmount = integerToCurrency(amount);
  const monthBudgetNotesId = `budget-${month}`;
  const existingMonthBudgetNotes = addNewLine(
    firstSync(
      `SELECT n.note FROM notes n WHERE n.id = ?`,
      [monthBudgetNotesId]
    )?.note
  );
  const locale = getLocale(await getItem("language"));
  const displayDay = format(
    currentDate(),
    "MMMM dd",
    locale
  );
  const categories = await getCategories$3(
    [from, to].filter((c) => c !== "to-budget" && c !== "overbudgeted")
  );
  const fromCategoryName = from === "to-budget" ? "To Budget" : categories.find((c) => c.id === from)?.name;
  const toCategoryName = to === "to-budget" ? "To Budget" : to === "overbudgeted" ? "Overbudgeted" : categories.find((c) => c.id === to)?.name;
  const note = `Reassigned ${displayAmount} from ${fromCategoryName} → ${toCategoryName} on ${displayDay}`;
  await update("notes", {
    id: monthBudgetNotesId,
    note: `${existingMonthBudgetNotes}- ${note}`
  });
}
async function resetIncomeCarryover({
  month
}) {
  const table = getBudgetTable();
  const categories = await all(
    "SELECT * FROM v_categories WHERE is_income = 1 AND tombstone = 0"
  );
  await batchMessages(async () => {
    for (const category of categories) {
      await setCarryover(table, category.id, dbMonth(month).toString(), false);
    }
  });
}
function number$1(v) {
  if (typeof v === "number") {
    return v;
  } else if (typeof v === "string") {
    const parsed = parseFloat(v);
    if (isNaN(parsed)) {
      return 0;
    }
    return parsed;
  }
  return 0;
}
function sumAmounts(...amounts) {
  return safeNumber(
    amounts.reduce((total, amount) => {
      return total + number$1(amount);
    }, 0)
  );
}
function flatten2(arr) {
  return Array.prototype.concat.apply([], arr);
}
function unflatten2(arr) {
  const res = [];
  for (let i = 0; i < arr.length; i += 2) {
    res.push([arr[i], arr[i + 1]]);
  }
  return res;
}
function getBlankSheet(months) {
  const blankMonth = prevMonth(months[0]);
  return sheetForMonth(blankMonth);
}
function createBlankCategory(cat, months) {
  if (months.length > 0) {
    const sheetName = getBlankSheet(months);
    get$1().createStatic(sheetName, `carryover-${cat.id}`, false);
    get$1().createStatic(sheetName, `leftover-${cat.id}`, 0);
    get$1().createStatic(sheetName, `leftover-pos-${cat.id}`, 0);
  }
}
function createBlankMonth(categories, sheetName, months) {
  get$1().createStatic(sheetName, "is-blank", true);
  get$1().createStatic(sheetName, "to-budget", 0);
  get$1().createStatic(sheetName, "buffered", 0);
  categories.forEach((cat) => createBlankCategory(cat, months));
}
function createCategory$4(cat, sheetName, prevSheetName) {
  if (!cat.is_income) {
    get$1().createStatic(sheetName, `budget-${cat.id}`, 0);
    if (get$1().getCellValue(sheetName, `budget-${cat.id}`) == null) {
      get$1().set(resolveName(sheetName, `budget-${cat.id}`), 0);
    }
    get$1().createStatic(sheetName, `carryover-${cat.id}`, false);
    get$1().createDynamic(sheetName, `leftover-${cat.id}`, {
      initialValue: 0,
      dependencies: [
        `budget-${cat.id}`,
        `sum-amount-${cat.id}`,
        `${prevSheetName}!carryover-${cat.id}`,
        `${prevSheetName}!leftover-${cat.id}`,
        `${prevSheetName}!leftover-pos-${cat.id}`
      ],
      run: (budgeted, spent, prevCarryover, prevLeftover, prevLeftoverPos) => {
        return safeNumber(
          number$1(budgeted) + number$1(spent) + (prevCarryover ? number$1(prevLeftover) : number$1(prevLeftoverPos))
        );
      }
    });
    get$1().createDynamic(sheetName, "leftover-pos-" + cat.id, {
      initialValue: 0,
      dependencies: [`leftover-${cat.id}`],
      run: (leftover) => {
        return leftover < 0 ? 0 : leftover;
      }
    });
  }
}
function createCategoryGroup$3(group, sheetName) {
  get$1().createDynamic(sheetName, "group-sum-amount-" + group.id, {
    initialValue: 0,
    dependencies: group.categories.map((cat) => `sum-amount-${cat.id}`),
    run: sumAmounts
  });
  if (!group.is_income) {
    get$1().createDynamic(sheetName, "group-budget-" + group.id, {
      initialValue: 0,
      dependencies: group.categories.map((cat) => `budget-${cat.id}`),
      run: sumAmounts
    });
    get$1().createDynamic(sheetName, "group-leftover-" + group.id, {
      initialValue: 0,
      dependencies: group.categories.map((cat) => `leftover-${cat.id}`),
      run: sumAmounts
    });
  }
}
function createSummary$1(groups, categories, prevSheetName, sheetName) {
  const incomeGroup = groups.filter((group) => group.is_income)[0];
  const expenseCategories = categories.filter((cat) => !cat.is_income);
  const incomeCategories = categories.filter((cat) => cat.is_income);
  get$1().createStatic(sheetName, "buffered", 0);
  get$1().createDynamic(sheetName, "from-last-month", {
    initialValue: 0,
    dependencies: [
      `${prevSheetName}!to-budget`,
      `${prevSheetName}!buffered-selected`
    ],
    run: (toBudget, buffered) => safeNumber(number$1(toBudget) + number$1(buffered))
  });
  get$1().createDynamic(sheetName, "total-income", {
    initialValue: 0,
    dependencies: [`group-sum-amount-${incomeGroup.id}`],
    run: (amount) => amount
  });
  get$1().createDynamic(sheetName, "available-funds", {
    initialValue: 0,
    dependencies: ["total-income", "from-last-month"],
    run: (income, fromLastMonth) => safeNumber(number$1(income) + number$1(fromLastMonth))
  });
  get$1().createDynamic(sheetName, "last-month-overspent", {
    initialValue: 0,
    dependencies: flatten2(
      expenseCategories.map((cat) => [
        `${prevSheetName}!leftover-${cat.id}`,
        `${prevSheetName}!carryover-${cat.id}`
      ])
    ),
    run: (...data) => {
      data = unflatten2(data);
      return safeNumber(
        data.reduce((total, [leftover, carryover]) => {
          if (carryover) {
            return total;
          }
          return total + Math.min(0, number$1(leftover));
        }, 0)
      );
    }
  });
  get$1().createDynamic(sheetName, "total-budgeted", {
    initialValue: 0,
    dependencies: groups.filter((group) => !group.is_income).map((group) => `group-budget-${group.id}`),
    run: (...amounts) => {
      return -sumAmounts(...amounts);
    }
  });
  get$1().createDynamic(sheetName, "buffered", { initialValue: 0 });
  get$1().createDynamic(sheetName, "buffered-auto", {
    initialValue: 0,
    dependencies: flatten2(
      incomeCategories.map((c) => [
        `${sheetName}!sum-amount-${c.id}`,
        `${sheetName}!carryover-${c.id}`
      ])
    ),
    run: (...data) => {
      data = unflatten2(data);
      return safeNumber(
        data.reduce((total, [sumAmount, carryover]) => {
          if (carryover) {
            return total + sumAmount;
          }
          return total;
        }, 0)
      );
    }
  });
  get$1().createDynamic(sheetName, "buffered-selected", {
    initialValue: 0,
    dependencies: [`${sheetName}!buffered`, `${sheetName}!buffered-auto`],
    run: (man, auto) => {
      if (man !== 0) {
        return man;
      }
      return auto;
    }
  });
  get$1().createDynamic(sheetName, "to-budget", {
    initialValue: 0,
    dependencies: [
      "available-funds",
      "last-month-overspent",
      "total-budgeted",
      "buffered-selected"
    ],
    run: (available, lastOverspent, totalBudgeted, buffered) => {
      return safeNumber(
        number$1(available) + number$1(lastOverspent) + number$1(totalBudgeted) - number$1(buffered)
      );
    }
  });
  get$1().createDynamic(sheetName, "total-spent", {
    initialValue: 0,
    dependencies: groups.filter((group) => !group.is_income).map((group) => `group-sum-amount-${group.id}`),
    run: sumAmounts
  });
  get$1().createDynamic(sheetName, "total-leftover", {
    initialValue: 0,
    dependencies: groups.filter((group) => !group.is_income).map((group) => `group-leftover-${group.id}`),
    run: sumAmounts
  });
}
function createBudget$3(meta, categories, months) {
  const blankSheet = getBlankSheet(months);
  if (meta.blankSheet !== blankSheet) {
    get$1().clearSheet(meta.blankSheet);
    createBlankMonth(categories, blankSheet, months);
    meta.blankSheet = blankSheet;
  }
}
function handleCategoryChange$1(months, oldValue, newValue) {
  function addDeps(sheetName, groupId, catId) {
    get$1().addDependencies(sheetName, `group-sum-amount-${groupId}`, [
      `sum-amount-${catId}`
    ]);
    get$1().addDependencies(sheetName, `group-budget-${groupId}`, [
      `budget-${catId}`
    ]);
    get$1().addDependencies(sheetName, `group-leftover-${groupId}`, [
      `leftover-${catId}`
    ]);
  }
  function removeDeps(sheetName, groupId, catId) {
    get$1().removeDependencies(sheetName, `group-sum-amount-${groupId}`, [
      `sum-amount-${catId}`
    ]);
    get$1().removeDependencies(sheetName, `group-budget-${groupId}`, [
      `budget-${catId}`
    ]);
    get$1().removeDependencies(sheetName, `group-leftover-${groupId}`, [
      `leftover-${catId}`
    ]);
  }
  if (oldValue && oldValue.tombstone === 0 && newValue.tombstone === 1) {
    const id = newValue.id;
    const groupId = newValue.cat_group;
    months.forEach((month) => {
      const sheetName = sheetForMonth(month);
      removeDeps(sheetName, groupId, id);
    });
  } else if (newValue.tombstone === 0 && (!oldValue || oldValue.tombstone === 1)) {
    createBlankCategory(newValue, months);
    months.forEach((month) => {
      const prevMonth$1 = prevMonth(month);
      const prevSheetName = sheetForMonth(prevMonth$1);
      const sheetName = sheetForMonth(month);
      const { start, end } = bounds(month);
      createCategory$2(newValue, sheetName, prevSheetName, start, end);
      const id = newValue.id;
      const groupId = newValue.cat_group;
      get$1().addDependencies(sheetName, "last-month-overspent", [
        `${prevSheetName}!leftover-${id}`,
        `${prevSheetName}!carryover-${id}`
      ]);
      addDeps(sheetName, groupId, id);
    });
  } else if (oldValue && oldValue.cat_group !== newValue.cat_group) {
    const id = newValue.id;
    months.forEach((month) => {
      const sheetName = sheetForMonth(month);
      removeDeps(sheetName, oldValue.cat_group, id);
      addDeps(sheetName, newValue.cat_group, id);
    });
  }
}
function handleCategoryGroupChange$1(months, oldValue, newValue) {
  function addDeps(sheetName, groupId) {
    get$1().addDependencies(sheetName, "total-budgeted", [
      `group-budget-${groupId}`
    ]);
    get$1().addDependencies(sheetName, "total-spent", [
      `group-sum-amount-${groupId}`
    ]);
    get$1().addDependencies(sheetName, "total-leftover", [
      `group-leftover-${groupId}`
    ]);
  }
  function removeDeps(sheetName, groupId) {
    get$1().removeDependencies(sheetName, "total-budgeted", [
      `group-budget-${groupId}`
    ]);
    get$1().removeDependencies(sheetName, "total-spent", [
      `group-sum-amount-${groupId}`
    ]);
    get$1().removeDependencies(sheetName, "total-leftover", [
      `group-leftover-${groupId}`
    ]);
  }
  if (newValue.tombstone === 1 && oldValue && oldValue.tombstone === 0) {
    const id = newValue.id;
    months.forEach((month) => {
      const sheetName = sheetForMonth(month);
      removeDeps(sheetName, id);
    });
  } else if (newValue.tombstone === 0 && (!oldValue || oldValue.tombstone === 1)) {
    const group = newValue;
    if (!group.is_income) {
      months.forEach((month) => {
        const sheetName = sheetForMonth(month);
        const categories = runQuery(
          "SELECT * FROM categories WHERE tombstone = 0 AND cat_group = ?",
          [group.id],
          true
        );
        createCategoryGroup$3({ ...group, categories }, sheetName);
        addDeps(sheetName, group.id);
      });
    }
  }
}
async function createCategory$3(cat, sheetName, prevSheetName) {
  get$1().createStatic(sheetName, `budget-${cat.id}`, 0);
  if (get$1().getCellValue(sheetName, `budget-${cat.id}`) == null) {
    get$1().set(resolveName(sheetName, `budget-${cat.id}`), 0);
  }
  get$1().createDynamic(sheetName, `leftover-${cat.id}`, {
    initialValue: 0,
    dependencies: [
      `budget-${cat.id}`,
      `sum-amount-${cat.id}`,
      `${prevSheetName}!carryover-${cat.id}`,
      `${prevSheetName}!leftover-${cat.id}`
    ],
    run: (budgeted, sumAmount, prevCarryover, prevLeftover) => {
      if (cat.is_income) {
        return safeNumber(
          number$1(budgeted) - number$1(sumAmount) + (prevCarryover ? number$1(prevLeftover) : 0)
        );
      }
      return safeNumber(
        number$1(budgeted) + number$1(sumAmount) + (prevCarryover ? number$1(prevLeftover) : 0)
      );
    }
  });
  get$1().createDynamic(sheetName, `spent-with-carryover-${cat.id}`, {
    initialValue: 0,
    dependencies: [
      `budget-${cat.id}`,
      `sum-amount-${cat.id}`,
      `carryover-${cat.id}`
    ],
    // TODO: Why refresh??
    refresh: true,
    run: (budgeted, sumAmount, carryover) => {
      return carryover ? Math.max(0, safeNumber(number$1(budgeted) + number$1(sumAmount))) : sumAmount;
    }
  });
  get$1().createStatic(sheetName, `carryover-${cat.id}`, false);
}
function createCategoryGroup$2(group, sheetName) {
  get$1().createDynamic(sheetName, "group-sum-amount-" + group.id, {
    initialValue: 0,
    dependencies: group.categories.filter((cat) => !cat.hidden).map((cat) => `sum-amount-${cat.id}`),
    run: sumAmounts
  });
  get$1().createDynamic(sheetName, "group-budget-" + group.id, {
    initialValue: 0,
    dependencies: group.categories.filter((cat) => !cat.hidden).map((cat) => `budget-${cat.id}`),
    run: sumAmounts
  });
  get$1().createDynamic(sheetName, "group-leftover-" + group.id, {
    initialValue: 0,
    dependencies: group.categories.filter((cat) => !cat.hidden).map((cat) => `leftover-${cat.id}`),
    run: sumAmounts
  });
}
function createSummary(groups, sheetName) {
  const incomeGroup = groups.filter((group) => group.is_income)[0];
  const expenseGroups = groups.filter(
    (group) => !group.is_income && !group.hidden
  );
  get$1().createDynamic(sheetName, "total-budgeted", {
    initialValue: 0,
    dependencies: expenseGroups.map((group) => `group-budget-${group.id}`),
    run: sumAmounts
  });
  get$1().createDynamic(sheetName, "total-spent", {
    initialValue: 0,
    refresh: true,
    dependencies: expenseGroups.map((group) => `group-sum-amount-${group.id}`),
    run: sumAmounts
  });
  get$1().createDynamic(sheetName, "total-income", {
    initialValue: 0,
    dependencies: [`group-sum-amount-${incomeGroup.id}`],
    run: (amount) => amount
  });
  get$1().createDynamic(sheetName, "total-leftover", {
    initialValue: 0,
    dependencies: expenseGroups.map((g) => `group-leftover-${g.id}`),
    run: sumAmounts
  });
  get$1().createDynamic(sheetName, "total-budget-income", {
    initialValue: 0,
    dependencies: [`group-budget-${incomeGroup.id}`],
    run: (amount) => amount
  });
  get$1().createDynamic(sheetName, "total-saved", {
    initialValue: 0,
    dependencies: ["total-budget-income", "total-budgeted"],
    run: (income, budgeted) => {
      return income - budgeted;
    }
  });
  get$1().createDynamic(sheetName, "real-saved", {
    initialValue: 0,
    dependencies: ["total-income", "total-spent"],
    run: (income, spent) => {
      return safeNumber(income - -spent);
    }
  });
}
function handleCategoryChange(months, oldValue, newValue) {
  function addDeps(sheetName, groupId, catId) {
    get$1().addDependencies(sheetName, `group-sum-amount-${groupId}`, [
      `sum-amount-${catId}`
    ]);
    get$1().addDependencies(sheetName, `group-budget-${groupId}`, [
      `budget-${catId}`
    ]);
    get$1().addDependencies(sheetName, `group-leftover-${groupId}`, [
      `leftover-${catId}`
    ]);
  }
  function removeDeps(sheetName, groupId, catId) {
    get$1().removeDependencies(sheetName, `group-sum-amount-${groupId}`, [
      `sum-amount-${catId}`
    ]);
    get$1().removeDependencies(sheetName, `group-budget-${groupId}`, [
      `budget-${catId}`
    ]);
    get$1().removeDependencies(sheetName, `group-leftover-${groupId}`, [
      `leftover-${catId}`
    ]);
  }
  if (oldValue && oldValue.tombstone === 0 && newValue.tombstone === 1) {
    const id = newValue.id;
    const groupId = newValue.cat_group;
    months.forEach((month) => {
      const sheetName = sheetForMonth(month);
      removeDeps(sheetName, groupId, id);
    });
  } else if (newValue.tombstone === 0 && (!oldValue || oldValue.tombstone === 1)) {
    months.forEach((month) => {
      const prevMonth$1 = prevMonth(month);
      const prevSheetName = sheetForMonth(prevMonth$1);
      const sheetName = sheetForMonth(month);
      const { start, end } = bounds(month);
      createCategory$2(newValue, sheetName, prevSheetName, start, end);
      const id = newValue.id;
      const groupId = newValue.cat_group;
      addDeps(sheetName, groupId, id);
    });
  } else if (oldValue && oldValue.cat_group !== newValue.cat_group) {
    const id = newValue.id;
    months.forEach((month) => {
      const sheetName = sheetForMonth(month);
      removeDeps(sheetName, oldValue.cat_group, id);
      addDeps(sheetName, newValue.cat_group, id);
    });
  } else if (oldValue && oldValue.hidden !== newValue.hidden) {
    const id = newValue.id;
    const groupId = newValue.cat_group;
    months.forEach((month) => {
      const sheetName = sheetForMonth(month);
      if (newValue.hidden) {
        removeDeps(sheetName, groupId, id);
      } else {
        addDeps(sheetName, groupId, id);
      }
    });
  }
}
function handleCategoryGroupChange(months, oldValue, newValue) {
  function addDeps(sheetName, groupId) {
    get$1().addDependencies(sheetName, "total-budgeted", [
      `group-budget-${groupId}`
    ]);
    get$1().addDependencies(sheetName, "total-spent", [
      `group-sum-amount-${groupId}`
    ]);
    get$1().addDependencies(sheetName, "total-leftover", [
      `group-leftover-${groupId}`
    ]);
  }
  function removeDeps(sheetName, groupId) {
    get$1().removeDependencies(sheetName, "total-budgeted", [
      `group-budget-${groupId}`
    ]);
    get$1().removeDependencies(sheetName, "total-spent", [
      `group-sum-amount-${groupId}`
    ]);
    get$1().removeDependencies(sheetName, "total-leftover", [
      `group-leftover-${groupId}`
    ]);
  }
  if (newValue.tombstone === 1 && oldValue && oldValue.tombstone === 0) {
    const id = newValue.id;
    months.forEach((month) => {
      const sheetName = sheetForMonth(month);
      removeDeps(sheetName, id);
    });
  } else if (newValue.tombstone === 0 && (!oldValue || oldValue.tombstone === 1)) {
    const group = newValue;
    months.forEach((month) => {
      const sheetName = sheetForMonth(month);
      const categories = runQuery(
        "SELECT * FROM categories WHERE tombstone = 0 AND cat_group = ?",
        [group.id],
        true
      );
      createCategoryGroup$2({ ...group, categories }, sheetName);
      addDeps(sheetName, group.id);
    });
  } else if (oldValue && oldValue.hidden !== newValue.hidden) {
    const group = newValue;
    months.forEach((month) => {
      const sheetName = sheetForMonth(month);
      if (newValue.hidden) {
        removeDeps(sheetName, group.id);
      } else {
        addDeps(sheetName, group.id);
      }
    });
  }
}
function getBudgetType() {
  const meta = get$1().meta();
  return meta.budgetType || "envelope";
}
function getBudgetRange(start, end) {
  start = getMonth(start);
  end = getMonth(end);
  if (start > end) {
    start = end;
  }
  start = subMonths(start, 3);
  end = addMonths(end, 12);
  return { start, end, range: rangeInclusive(start, end) };
}
function createCategory$2(cat, sheetName, prevSheetName, start, end) {
  get$1().createDynamic(sheetName, "sum-amount-" + cat.id, {
    initialValue: 0,
    run: () => {
      const rows = runQuery(
        `SELECT SUM(amount) as amount FROM v_transactions_internal_alive t
           LEFT JOIN accounts a ON a.id = t.account
         WHERE t.date >= ${start} AND t.date <= ${end}
           AND category = '${cat.id}' AND a.offbudget = 0`,
        [],
        true
      );
      const row = rows[0];
      const amount = row ? row.amount : 0;
      return amount || 0;
    }
  });
  if (getBudgetType() === "envelope") {
    createCategory$4(cat, sheetName, prevSheetName);
  } else {
    createCategory$3(cat, sheetName, prevSheetName);
  }
}
function handleAccountChange(months, oldValue, newValue) {
  if (!oldValue || oldValue.offbudget !== newValue.offbudget) {
    const rows = runQuery(
      `
        SELECT DISTINCT(category) as category FROM transactions
        WHERE acct = ?
      `,
      [newValue.id],
      true
    );
    months.forEach((month) => {
      const sheetName = sheetForMonth(month);
      rows.forEach((row) => {
        get$1().recompute(resolveName(sheetName, "sum-amount-" + row.category));
      });
    });
  }
}
function handleTransactionChange(transaction2, changedFields) {
  if ((changedFields.has("date") || changedFields.has("acct") || changedFields.has("amount") || changedFields.has("category") || changedFields.has("tombstone") || changedFields.has("isParent")) && transaction2.date && transaction2.category) {
    const month = monthFromDate(fromDateRepr(transaction2.date));
    const sheetName = sheetForMonth(month);
    get$1().recompute(resolveName(sheetName, "sum-amount-" + transaction2.category));
  }
}
function handleCategoryMappingChange(months, oldValue, newValue) {
  months.forEach((month) => {
    const sheetName = sheetForMonth(month);
    if (oldValue) {
      get$1().recompute(resolveName(sheetName, "sum-amount-" + oldValue.transferId));
    }
    get$1().recompute(resolveName(sheetName, "sum-amount-" + newValue.transferId));
  });
}
function handleBudgetMonthChange(budget) {
  const sheetName = sheetForMonth(budget.id);
  get$1().set(`${sheetName}!buffered`, budget.buffered);
}
function handleBudgetChange(budget) {
  if (budget.category) {
    const sheetName = sheetForMonth(budget.month.toString());
    get$1().set(`${sheetName}!budget-${budget.category}`, budget.amount || 0);
    get$1().set(
      `${sheetName}!carryover-${budget.category}`,
      budget.carryover === 1 ? true : false
    );
    get$1().set(`${sheetName}!goal-${budget.category}`, budget.goal);
    get$1().set(`${sheetName}!long-goal-${budget.category}`, budget.long_goal);
  }
}
function triggerBudgetChanges(oldValues, newValues) {
  const { createdMonths = /* @__PURE__ */ new Set() } = get$1().meta();
  const budgetType = getBudgetType();
  startTransaction();
  try {
    newValues.forEach((items, table) => {
      const old = oldValues.get(table);
      items.forEach((newValue) => {
        const oldValue = old && old.get(newValue.id);
        if (table === "zero_budget_months") {
          handleBudgetMonthChange(newValue);
        } else if (table === "zero_budgets" || table === "reflect_budgets") {
          handleBudgetChange(newValue);
        } else if (table === "transactions") {
          const changed = new Set(
            Object.keys(getChangedValues(oldValue || {}, newValue) || {})
          );
          if (oldValue) {
            handleTransactionChange(oldValue, changed);
          }
          handleTransactionChange(newValue, changed);
        } else if (table === "category_mapping") {
          handleCategoryMappingChange(createdMonths, oldValue, newValue);
        } else if (table === "categories") {
          if (budgetType === "envelope") {
            handleCategoryChange$1(
              createdMonths,
              oldValue,
              newValue
            );
          } else {
            handleCategoryChange(createdMonths, oldValue, newValue);
          }
        } else if (table === "category_groups") {
          if (budgetType === "envelope") {
            handleCategoryGroupChange$1(
              createdMonths,
              oldValue,
              newValue
            );
          } else {
            handleCategoryGroupChange(createdMonths, oldValue, newValue);
          }
        } else if (table === "accounts") {
          handleAccountChange(createdMonths, oldValue, newValue);
        }
      });
    });
  } finally {
    endTransaction();
  }
}
async function doTransfer(categoryIds, transferId) {
  const { createdMonths: months } = get$1().meta();
  [...months].forEach((month) => {
    const totalValue = categoryIds.map((id) => {
      return getBudget({ month, category: id });
    }).reduce((total, value) => total + value, 0);
    const transferValue = getBudget({
      month,
      category: transferId
    });
    setBudget({
      month,
      category: transferId,
      amount: totalValue + transferValue
    });
  });
}
async function createBudget$2(months) {
  const { data: groups } = await aqlQuery(
    q("category_groups").select("*")
  );
  const categories = groups.flatMap((group) => group.categories);
  startTransaction();
  const meta = get$1().meta();
  meta.createdMonths = meta.createdMonths || /* @__PURE__ */ new Set();
  const budgetType = getBudgetType();
  if (budgetType === "envelope") {
    createBudget$3(meta, categories, months);
  }
  months.forEach((month) => {
    if (!meta.createdMonths.has(month)) {
      const prevMonth$1 = prevMonth(month);
      const { start, end } = bounds(month);
      const sheetName = sheetForMonth(month);
      const prevSheetName = sheetForMonth(prevMonth$1);
      categories.forEach((cat) => {
        createCategory$2(cat, sheetName, prevSheetName, start, end);
      });
      groups.forEach((group) => {
        if (budgetType === "envelope") {
          createCategoryGroup$3(group, sheetName);
        } else {
          createCategoryGroup$2(group, sheetName);
        }
      });
      if (budgetType === "envelope") {
        createSummary$1(
          groups,
          categories,
          prevSheetName,
          sheetName
        );
      } else {
        createSummary(groups, sheetName);
      }
      meta.createdMonths.add(month);
    }
  });
  get$1().setMeta(meta);
  endTransaction();
  await waitOnSpreadsheet();
}
async function createAllBudgets() {
  const earliestTransaction = await first(
    "SELECT * FROM transactions WHERE isChild=0 AND date IS NOT NULL ORDER BY date ASC LIMIT 1"
  );
  const earliestDate = earliestTransaction && fromDateRepr(earliestTransaction.date);
  const currentMonth$1 = currentMonth();
  const { start, end, range: range2 } = getBudgetRange(
    earliestDate || currentMonth$1,
    currentMonth$1
  );
  const meta = get$1().meta();
  const createdMonths = meta.createdMonths || /* @__PURE__ */ new Set();
  const newMonths = range2.filter((m) => !createdMonths.has(m));
  if (newMonths.length > 0) {
    await createBudget$2(range2);
  }
  return { start, end };
}
async function setType(type) {
  const meta = get$1().meta();
  if (type === meta.budgetType) {
    return;
  }
  meta.budgetType = type;
  meta.createdMonths = /* @__PURE__ */ new Set();
  const nodes = get$1().getNodes();
  transaction(() => {
    for (const name of nodes.keys()) {
      const [sheetName, cellName] = name.split("!");
      if (sheetName.match(/^budget\d+/)) {
        get$1().deleteCell(sheetName, cellName);
      }
    }
  });
  get$1().startCacheBarrier();
  loadUserBudgets(db$1);
  const bounds2 = await createAllBudgets();
  get$1().endCacheBarrier();
  return bounds2;
}
const app$j = createApp();
app$j.events.on("sync", (event) => {
});
const runningMethods = /* @__PURE__ */ new Set();
let currentContext = null;
const mutatingMethods = /* @__PURE__ */ new WeakMap();
let _latestHandlerNames = [];
function mutator(handler) {
  mutatingMethods.set(handler, true);
  return handler;
}
async function flushRunningMethods() {
  await wait(200);
  while (runningMethods.size > 0) {
    await Promise.all([...runningMethods.values()]);
    await wait(100);
  }
}
function wait(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
async function runHandler(handler, args, { undoTag, name } = {}) {
  _latestHandlerNames.push(name);
  if (_latestHandlerNames.length > 5) {
    _latestHandlerNames = _latestHandlerNames.slice(-5);
  }
  if (mutatingMethods.has(handler)) {
    return runMutator(() => handler(args), { undoTag });
  }
  if (name === "close-budget") {
    await flushRunningMethods();
  }
  const promise = handler(args);
  runningMethods.add(promise);
  promise.then(() => {
    runningMethods.delete(promise);
  });
  return promise;
}
function _runMutator(func, initialContext = {}) {
  currentContext = initialContext;
  return func().finally(() => {
    currentContext = null;
  });
}
const runMutator = sequential(_runMutator);
function withMutatorContext(context, func) {
  if (currentContext == null && true) {
    captureBreadcrumb("Recent methods: " + _latestHandlerNames.join(", "));
    captureException(new Error("withMutatorContext: mutator not running"));
    return func();
  }
  const prevContext = currentContext;
  currentContext = { ...currentContext, ...context };
  return func().finally(() => {
    currentContext = prevContext;
  });
}
function getMutatorContext() {
  if (currentContext == null) {
    captureBreadcrumb({
      message: "Recent methods: " + _latestHandlerNames.join(", ")
    });
    return {};
  }
  return currentContext;
}
const fetch$1 = globalThis.fetch;
function throwIfNot200(res, text) {
  if (res.status !== 200) {
    if (res.status === 500) {
      throw new PostError(res.status === 500 ? "internal" : text);
    }
    const contentType = res.headers.get("Content-Type");
    if (contentType.toLowerCase().indexOf("application/json") !== -1) {
      const json = JSON.parse(text);
      throw new PostError(json.reason);
    }
    const tunnelErrorHeaders = ["ngrok-error-code"];
    const tunnelError = tunnelErrorHeaders.some(
      (header) => res.headers.has(header)
    );
    if (tunnelError) {
      throw new PostError("network-failure");
    }
    throw new PostError(text);
  }
}
async function post(url, data, headers = {}, timeout = null) {
  let text;
  let res;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const signal = timeout ? controller.signal : null;
    res = await fetch$1(url, {
      method: "POST",
      body: JSON.stringify(data),
      signal,
      headers: {
        ...headers,
        "Content-Type": "application/json"
      }
    });
    clearTimeout(timeoutId);
    text = await res.text();
  } catch (err) {
    throw new PostError("network-failure");
  }
  throwIfNot200(res, text);
  let responseData;
  try {
    responseData = JSON.parse(text);
  } catch (err) {
    throw new PostError("parse-json", { meta: text });
  }
  if (responseData.status !== "ok") {
    console.log(
      "API call failed: " + url + "\nData: " + JSON.stringify(data, null, 2) + "\nResponse: " + JSON.stringify(res, null, 2)
    );
    throw new PostError(
      responseData.description || responseData.reason || "unknown"
    );
  }
  return responseData.data;
}
async function del(url, data, headers = {}, timeout = null) {
  let text;
  let res;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const signal = timeout ? controller.signal : null;
    res = await fetch$1(url, {
      method: "DELETE",
      body: JSON.stringify(data),
      signal,
      headers: {
        ...headers,
        "Content-Type": "application/json"
      }
    });
    clearTimeout(timeoutId);
    text = await res.text();
  } catch (err) {
    throw new PostError("network-failure");
  }
  throwIfNot200(res, text);
  try {
    res = JSON.parse(text);
  } catch (err) {
    throw new PostError("parse-json", { meta: text });
  }
  if (res.status !== "ok") {
    console.log(
      "API call failed: " + url + "\nData: " + JSON.stringify(data, null, 2) + "\nResponse: " + JSON.stringify(res, null, 2)
    );
    throw new PostError(res.description || res.reason || "unknown");
  }
  return res.data;
}
async function patch(url, data, headers = {}, timeout = null) {
  let text;
  let res;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const signal = timeout ? controller.signal : null;
    res = await fetch$1(url, {
      method: "PATCH",
      body: JSON.stringify(data),
      signal,
      headers: {
        ...headers,
        "Content-Type": "application/json"
      }
    });
    clearTimeout(timeoutId);
    text = await res.text();
  } catch (err) {
    throw new PostError("network-failure");
  }
  throwIfNot200(res, text);
  try {
    res = JSON.parse(text);
  } catch (err) {
    throw new PostError("parse-json", { meta: text });
  }
  if (res.status !== "ok") {
    console.log(
      "API call failed: " + url + "\nData: " + JSON.stringify(data, null, 2) + "\nResponse: " + JSON.stringify(res, null, 2)
    );
    throw new PostError(res.description || res.reason || "unknown");
  }
  return res.data;
}
async function postBinary(url, data, headers) {
  let res;
  try {
    res = await fetch$1(url, {
      method: "POST",
      body: isBrowser ? data : Buffer.from(data),
      headers: {
        "Content-Length": data.length,
        "Content-Type": "application/actual-sync",
        ...headers
      }
    });
  } catch (err) {
    throw new PostError("network-failure");
  }
  let buffer;
  if (res.arrayBuffer) {
    buffer = Buffer.from(await res.arrayBuffer());
  } else {
    buffer = await res.buffer();
  }
  throwIfNot200(res, buffer.toString());
  return buffer;
}
function get(url, opts) {
  return fetch$1(url, opts).then((res) => res.text());
}
let prefs = null;
async function loadPrefs(id) {
  if (process.env.NODE_ENV === "test" && !id) {
    prefs = getDefaultPrefs("test", "test_LocalPrefs");
    return prefs;
  }
  const fullpath = join$1(getBudgetDir(id), "metadata.json");
  try {
    prefs = JSON.parse(await readFile(fullpath));
  } catch (e) {
    prefs = { id, budgetName: id };
  }
  prefs.id = id;
  return prefs;
}
async function savePrefs(prefsToSet, { avoidSync = false } = {}) {
  Object.assign(prefs, prefsToSet);
  if (!avoidSync) {
    const messages = Object.keys(prefsToSet).map((key) => {
      if (key === "budgetName") {
        return {
          dataset: "prefs",
          row: key,
          column: "value",
          value: prefsToSet[key],
          timestamp: Timestamp.send()
        };
      }
      return null;
    }).filter((x) => x);
    if (messages.length > 0) {
      await sendMessages(messages);
    }
  }
  if (process.env.NODE_ENV !== "test") {
    const prefsPath = join$1(getBudgetDir(prefs.id), "metadata.json");
    await writeFile(prefsPath, JSON.stringify(prefs));
  }
}
function unloadPrefs() {
  prefs = null;
}
function getPrefs() {
  return prefs;
}
function getDefaultPrefs(id, budgetName) {
  return { id, budgetName };
}
let config = null;
function joinURL(base, ...paths) {
  const url = new URL(base);
  url.pathname = join$1(url.pathname, ...paths);
  return url.toString();
}
function isValidBaseURL(base) {
  try {
    return Boolean(new URL(base));
  } catch (error) {
    return false;
  }
}
function setServer(url) {
  if (url == null) {
    config = null;
  } else {
    config = getServer(url);
  }
}
function getServer(url) {
  if (url) {
    try {
      return {
        BASE_SERVER: url,
        SYNC_SERVER: joinURL(url, "/sync"),
        SIGNUP_SERVER: joinURL(url, "/account"),
        GOCARDLESS_SERVER: joinURL(url, "/gocardless"),
        SIMPLEFIN_SERVER: joinURL(url, "/simplefin"),
        PLUGGYAI_SERVER: joinURL(url, "/pluggyai")
      };
    } catch (error) {
      console.warn(
        "Unable to parse server URL - using the global config.",
        { config },
        error
      );
      return config;
    }
  }
  return config;
}
let MESSAGE_HISTORY = [
  { type: "marker" }
];
let CURSOR = 0;
const HISTORY_SIZE = 20;
function trimHistory() {
  MESSAGE_HISTORY = MESSAGE_HISTORY.slice(0, CURSOR + 1);
  const markers = MESSAGE_HISTORY.filter((item) => item.type === "marker");
  if (markers.length > HISTORY_SIZE) {
    const slice = markers.slice(-20);
    const cutoff = MESSAGE_HISTORY.indexOf(slice[0]);
    MESSAGE_HISTORY = MESSAGE_HISTORY.slice(cutoff);
    CURSOR = MESSAGE_HISTORY.length - 1;
  }
}
function appendMessages(messages, oldData) {
  const context = getMutatorContext();
  if (context.undoListening && messages.length > 0) {
    trimHistory();
    const { undoTag } = context;
    MESSAGE_HISTORY.push({
      type: "messages",
      messages,
      oldData,
      undoTag
    });
    CURSOR++;
  }
}
function clearUndo() {
  MESSAGE_HISTORY = [{ type: "marker" }];
  CURSOR = 0;
}
function withUndo(func, meta) {
  const context = getMutatorContext();
  if (context.undoDisabled || context.undoListening) {
    return func();
  }
  MESSAGE_HISTORY = MESSAGE_HISTORY.slice(0, CURSOR + 1);
  const marker = { type: "marker", meta };
  if (MESSAGE_HISTORY[MESSAGE_HISTORY.length - 1].type === "marker") {
    MESSAGE_HISTORY[MESSAGE_HISTORY.length - 1] = marker;
  } else {
    MESSAGE_HISTORY.push(marker);
    CURSOR++;
  }
  return withMutatorContext(
    { undoListening: true, undoTag: context.undoTag },
    func
  );
}
function undoable(func, metaFunc) {
  return (...args) => {
    return withUndo(
      () => {
        return func.apply(null, args);
      },
      metaFunc ? metaFunc(...args) : void 0
    );
  };
}
async function applyUndoAction(messages, meta, undoTag) {
  await withMutatorContext({ undoListening: false }, () => {
    return sendMessages(
      messages.map((msg) => ({ ...msg, timestamp: Timestamp.send() }))
    );
  });
  messages.reduce((acc, message) => {
    if (!acc.includes(message.dataset)) {
      acc.push(message.dataset);
    }
    return acc;
  }, []);
}
async function undo() {
  const end = CURSOR;
  CURSOR = Math.max(CURSOR - 1, 0);
  while (CURSOR > 0 && MESSAGE_HISTORY[CURSOR].type !== "marker") {
    CURSOR--;
  }
  const meta = MESSAGE_HISTORY[CURSOR].meta;
  const start = Math.max(CURSOR, 0);
  const entries = MESSAGE_HISTORY.slice(start, end + 1).filter(
    (entry) => entry.type === "messages"
  );
  if (entries.length > 0) {
    const toApply = entries.reduce((acc, entry) => {
      return acc.concat(
        entry.messages.map((message) => undoMessage(message, entry.oldData)).filter((x) => x)
      );
    }, []).reverse();
    await applyUndoAction(toApply, meta, entries[0].undoTag);
  }
}
function undoMessage(message, oldData) {
  const oldItem = getIn(oldData, [message.dataset, message.row]);
  if (oldItem) {
    let column = message.column;
    if (message.dataset === "spreadsheet_cells") {
      column = "cachedValue";
    }
    return { ...message, value: oldItem[column] };
  } else {
    if (message.dataset === "spreadsheet_cells") {
      if (message.column === "expr") {
        return { ...message, value: null };
      }
      return message;
    } else if (
      // The mapping fields aren't ever deleted... this should be
      // harmless since all they are is meta information. Maybe we
      // should fix this though.
      message.dataset !== "category_mapping" && message.dataset !== "payee_mapping"
    ) {
      if (message.dataset === "zero_budget_months" || message.dataset === "zero_budgets" || message.dataset === "reflect_budgets") {
        if (["buffered", "amount", "carryover"].includes(message.column)) {
          return { ...message, value: 0 };
        }
        return null;
      } else if (message.dataset === "notes") {
        return { ...message, value: null };
      }
      return { ...message, column: "tombstone", value: 1 };
    }
  }
  return null;
}
async function redo() {
  const meta = MESSAGE_HISTORY[CURSOR].type === "marker" ? MESSAGE_HISTORY[CURSOR].meta : null;
  const start = CURSOR;
  CURSOR = Math.min(CURSOR + 1, MESSAGE_HISTORY.length - 1);
  while (CURSOR < MESSAGE_HISTORY.length - 1 && MESSAGE_HISTORY[CURSOR].type !== "marker") {
    CURSOR++;
  }
  const end = CURSOR;
  const entries = MESSAGE_HISTORY.slice(start + 1, end + 1).filter(
    (entry) => entry.type === "messages"
  );
  if (entries.length > 0) {
    const toApply = entries.reduce((acc, entry) => {
      return acc.concat(entry.messages).concat(redoResurrections(entry.messages, entry.oldData));
    }, []);
    await applyUndoAction(toApply, meta, entries[entries.length - 1].undoTag);
  }
}
function redoResurrections(messages, oldData) {
  const resurrect = /* @__PURE__ */ new Set();
  messages.forEach((message) => {
    const oldItem = getIn(oldData, [message.dataset, message.row]);
    if (!oldItem && ![
      "zero_budget_months",
      "zero_budgets",
      "reflect_budgets",
      "notes",
      "category_mapping",
      "payee_mapping"
    ].includes(message.dataset)) {
      resurrect.add(message.dataset + "." + message.row);
    }
  });
  return [...resurrect].map((desc) => {
    const [table, row] = desc.split(".");
    return {
      dataset: table,
      row,
      column: "tombstone",
      value: 0,
      timestamp: Timestamp.send()
    };
  });
}
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
function randomBytes$1(n) {
  return crypto.randomBytes(n);
}
function encrypt$1(masterKey, value) {
  const masterKeyBuffer = masterKey.getValue().raw;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    ENCRYPTION_ALGORITHM,
    masterKeyBuffer,
    iv
  );
  let encrypted = cipher.update(value);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    value: encrypted,
    meta: {
      keyId: masterKey.getId(),
      algorithm: ENCRYPTION_ALGORITHM,
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64")
    }
  };
}
function decrypt$1(masterKey, encrypted, meta) {
  const masterKeyBuffer = masterKey.getValue().raw;
  const { algorithm, iv: originalIv, authTag: originalAuthTag } = meta;
  const iv = Buffer.from(originalIv, "base64");
  const authTag = Buffer.from(originalAuthTag, "base64");
  const decipher = crypto.createDecipheriv(algorithm, masterKeyBuffer, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted;
}
function createKey$1({ secret, salt }) {
  const buffer = createKeyBuffer({ secret, salt });
  return {
    raw: buffer,
    base64: buffer.toString("base64")
  };
}
function importKey(str) {
  return {
    raw: Buffer.from(str, "base64"),
    base64: str
  };
}
function createKeyBuffer({
  numBytes,
  secret,
  salt
}) {
  return crypto.pbkdf2Sync(
    secret || crypto.randomBytes(128).toString("base64"),
    salt || crypto.randomBytes(32).toString("base64"),
    1e4,
    numBytes || 32,
    "sha512"
  );
}
let keys = {};
class Key {
  id;
  value;
  constructor({ id }) {
    this.id = id || uuid.v4();
  }
  async createFromPassword({ password, salt }) {
    this.value = await createKey$1({ secret: password, salt });
  }
  async createFromBase64(str) {
    this.value = await importKey(str);
  }
  getId() {
    return this.id;
  }
  getValue() {
    return this.value;
  }
  serialize() {
    return {
      id: this.id,
      base64: this.value.base64
    };
  }
}
function getKey(keyId) {
  if (keyId == null || keys[keyId] == null) {
    throw new Error("missing-key");
  }
  return keys[keyId];
}
function hasKey(keyId) {
  return keyId in keys;
}
function encrypt(value, keyId) {
  return encrypt$1(getKey(keyId), value);
}
function decrypt(encrypted, meta) {
  return decrypt$1(getKey(meta.keyId), encrypted, meta);
}
function randomBytes(n) {
  return randomBytes$1(n);
}
async function loadKey(key) {
  let keyInstance;
  if (!(key instanceof Key)) {
    keyInstance = new Key({ id: key.id });
    await keyInstance.createFromBase64(key.base64);
  } else {
    keyInstance = key;
  }
  keys[keyInstance.getId()] = keyInstance;
}
function unloadKey(key) {
  delete keys[key.getId()];
}
function unloadAllKeys() {
  keys = {};
}
async function createKey({ id, password, salt }) {
  const key = new Key({ id });
  await key.createFromPassword({ password, salt });
  return key;
}
function coerceBuffer(value) {
  if (!Buffer.isBuffer(value)) {
    return Buffer.from(value);
  }
  return value;
}
async function encode(groupId, fileId, since, messages) {
  const { encryptKeyId } = getPrefs();
  const requestPb = new SyncProtoBuf.SyncRequest();
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const envelopePb = new SyncProtoBuf.MessageEnvelope();
    envelopePb.setTimestamp(msg.timestamp.toString());
    const messagePb = new SyncProtoBuf.Message();
    messagePb.setDataset(msg.dataset);
    messagePb.setRow(msg.row);
    messagePb.setColumn(msg.column);
    messagePb.setValue(msg.value);
    const binaryMsg = messagePb.serializeBinary();
    if (encryptKeyId) {
      const encrypted = new SyncProtoBuf.EncryptedData();
      let result;
      try {
        result = await encrypt(binaryMsg, encryptKeyId);
      } catch (e) {
        throw new SyncError("encrypt-failure", {
          isMissingKey: e.message === "missing-key"
        });
      }
      encrypted.setData(result.value);
      encrypted.setIv(Buffer.from(result.meta.iv, "base64"));
      encrypted.setAuthtag(Buffer.from(result.meta.authTag, "base64"));
      envelopePb.setContent(encrypted.serializeBinary());
      envelopePb.setIsencrypted(true);
    } else {
      envelopePb.setContent(binaryMsg);
    }
    requestPb.addMessages(envelopePb);
  }
  requestPb.setGroupid(groupId);
  requestPb.setFileid(fileId);
  requestPb.setKeyid(encryptKeyId);
  requestPb.setSince(since.toString());
  return requestPb.serializeBinary();
}
async function decode(data) {
  const { encryptKeyId } = getPrefs();
  const responsePb = SyncProtoBuf.SyncResponse.deserializeBinary(data);
  const merkle = JSON.parse(responsePb.getMerkle());
  const list = responsePb.getMessagesList();
  const messages = [];
  for (let i = 0; i < list.length; i++) {
    const envelopePb = list[i];
    const timestamp = Timestamp.parse(envelopePb.getTimestamp());
    const encrypted = envelopePb.getIsencrypted();
    let msg;
    if (encrypted) {
      const binary = SyncProtoBuf.EncryptedData.deserializeBinary(
        envelopePb.getContent()
      );
      let decrypted;
      try {
        decrypted = await decrypt(coerceBuffer(binary.getData()), {
          keyId: encryptKeyId,
          algorithm: "aes-256-gcm",
          iv: coerceBuffer(binary.getIv()),
          authTag: coerceBuffer(binary.getAuthtag())
        });
      } catch (e) {
        console.log(e);
        throw new SyncError("decrypt-failure", {
          isMissingKey: e.message === "missing-key"
        });
      }
      msg = SyncProtoBuf.Message.deserializeBinary(decrypted);
    } else {
      msg = SyncProtoBuf.Message.deserializeBinary(
        envelopePb.getContent()
      );
    }
    messages.push({
      timestamp,
      dataset: msg.getDataset(),
      row: msg.getRow(),
      column: msg.getColumn(),
      value: msg.getValue()
    });
  }
  return { messages, merkle };
}
function rebuildMerkleHash() {
  const rows = runQuery(
    "SELECT timestamp FROM messages_crdt",
    [],
    true
  );
  let trie = emptyTrie();
  for (let i = 0; i < rows.length; i++) {
    trie = insert$1(trie, Timestamp.parse(rows[i].timestamp));
  }
  return {
    numMessages: rows.length,
    trie
  };
}
async function repairSync$1() {
  const rebuilt = rebuildMerkleHash();
  const clock2 = getClock();
  clock2.merkle = rebuilt.trie;
  runQuery(
    cache("INSERT OR REPLACE INTO messages_clock (id, clock) VALUES (1, ?)"),
    [serializeClock(clock2)]
  );
}
function isError(value) {
  return value.error !== void 0;
}
async function randomString() {
  return (await randomBytes(12)).toString();
}
async function makeTestMessage(keyId) {
  const messagePb = new SyncProtoBuf.Message();
  messagePb.setDataset(await randomString());
  messagePb.setRow(await randomString());
  messagePb.setColumn(await randomString());
  messagePb.setValue(await randomString());
  const binaryMsg = messagePb.serializeBinary();
  return await encrypt(binaryMsg, keyId);
}
const UPLOAD_FREQUENCY_IN_DAYS = 7;
async function checkHTTPStatus(res) {
  if (res.status !== 200) {
    if (res.status === 403) {
      try {
        const text = await res.text();
        const data = JSON.parse(text)?.data;
        if (data?.reason === "token-expired") {
          await removeItem("user-token");
          throw new HTTPError(403, "token-expired");
        }
      } catch (e) {
        if (e instanceof HTTPError) throw e;
      }
    }
    return res.text().then((str) => {
      throw new HTTPError(res.status, str);
    });
  } else {
    return res;
  }
}
async function fetchJSON(...args) {
  let res = await fetch$1(...args);
  res = await checkHTTPStatus(res);
  return res.json();
}
async function checkKey() {
  const userToken = await getItem("user-token");
  const { cloudFileId, encryptKeyId } = getPrefs();
  let res;
  try {
    res = await post(getServer().SYNC_SERVER + "/user-get-key", {
      token: userToken,
      fileId: cloudFileId
    });
  } catch (e) {
    console.log(e);
    return { valid: false, error: { reason: "network" } };
  }
  return {
    valid: (
      // This == comparison is important, they could be null or undefined
      // eslint-disable-next-line eqeqeq
      res.id == encryptKeyId && (encryptKeyId == null || hasKey(encryptKeyId))
    )
  };
}
async function resetSyncState(newKeyState) {
  const userToken = await getItem("user-token");
  const { cloudFileId } = getPrefs();
  try {
    await post(getServer().SYNC_SERVER + "/reset-user-file", {
      token: userToken,
      fileId: cloudFileId
    });
  } catch (e) {
    if (e instanceof PostError) {
      return {
        error: {
          reason: e.reason === "unauthorized" ? "unauthorized" : "network"
        }
      };
    }
    return { error: { reason: "internal" } };
  }
  if (newKeyState) {
    try {
      await post(getServer().SYNC_SERVER + "/user-create-key", {
        token: userToken,
        fileId: cloudFileId,
        keyId: newKeyState.key.getId(),
        keySalt: newKeyState.salt,
        testContent: newKeyState.testContent
      });
    } catch (e) {
      if (e instanceof PostError) {
        return { error: { reason: "network" } };
      }
      return { error: { reason: "internal" } };
    }
  }
  return {};
}
async function exportBuffer() {
  const { id, budgetName } = getPrefs();
  if (!budgetName) {
    return null;
  }
  const budgetDir = getBudgetDir(id);
  const zipped = new AdmZip();
  await runMutator(async () => {
    const rawDbContent = await readFile(
      join$1(budgetDir, "db.sqlite"),
      "binary"
    );
    const memDb = await openDatabase$1(rawDbContent);
    execQuery$2(
      memDb,
      `
        DELETE FROM kvcache;
        DELETE FROM kvcache_key;
      `
    );
    const dbContent = await exportDatabase(memDb);
    closeDatabase$1(memDb);
    const meta = JSON.parse(
      await readFile(join$1(budgetDir, "metadata.json"))
    );
    meta.resetClock = true;
    const metaContent = Buffer.from(JSON.stringify(meta), "utf8");
    zipped.addFile("db.sqlite", Buffer.from(dbContent));
    zipped.addFile("metadata.json", metaContent);
  });
  return Buffer.from(zipped.toBuffer());
}
async function importBuffer(fileData, buffer) {
  let zipped, entries;
  try {
    zipped = new AdmZip(buffer);
    entries = zipped.getEntries();
  } catch (err) {
    throw FileDownloadError("not-zip-file");
  }
  const dbEntry = entries.find((e) => e.entryName.includes("db.sqlite"));
  const metaEntry = entries.find((e) => e.entryName.includes("metadata.json"));
  if (!dbEntry || !metaEntry) {
    throw FileDownloadError("invalid-zip-file");
  }
  const dbContent = zipped.readFile(dbEntry);
  const metaContent = zipped.readFile(metaEntry);
  let meta;
  try {
    meta = JSON.parse(metaContent.toString("utf8"));
  } catch (err) {
    throw FileDownloadError("invalid-meta-file");
  }
  meta = {
    ...meta,
    cloudFileId: fileData.fileId,
    groupId: fileData.groupId,
    lastUploaded: currentDay(),
    encryptKeyId: fileData.encryptMeta ? fileData.encryptMeta.keyId : null
  };
  const budgetDir = getBudgetDir(meta.id);
  if (await exists(budgetDir)) {
    const dbFile = join$1(budgetDir, "db.sqlite");
    const metaFile = join$1(budgetDir, "metadata.json");
    if (await exists(dbFile)) {
      await removeFile$1(dbFile);
    }
    if (await exists(metaFile)) {
      await removeFile$1(metaFile);
    }
  } else {
    await mkdir(budgetDir);
  }
  await writeFile(join$1(budgetDir, "db.sqlite"), dbContent);
  await writeFile(join$1(budgetDir, "metadata.json"), JSON.stringify(meta));
  return { id: meta.id };
}
async function upload() {
  const userToken = await getItem("user-token");
  if (!userToken) {
    throw FileUploadError("unauthorized");
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
    encryptKeyId
  } = getPrefs();
  let cloudFileId = originalCloudFileId;
  let uploadContent = zipContent;
  let uploadMeta = null;
  if (encryptKeyId) {
    let encrypted;
    try {
      encrypted = await encrypt(zipContent, encryptKeyId);
    } catch (e) {
      throw FileUploadError("encrypt-failure", {
        isMissingKey: e.message === "missing-key"
      });
    }
    uploadContent = encrypted.value;
    uploadMeta = encrypted.meta;
  }
  if (!cloudFileId) {
    cloudFileId = uuid.v4();
  }
  let res;
  try {
    res = await fetchJSON(getServer().SYNC_SERVER + "/upload-user-file", {
      method: "POST",
      headers: {
        "Content-Length": uploadContent.length,
        "Content-Type": "application/encrypted-file",
        "X-ACTUAL-TOKEN": userToken,
        "X-ACTUAL-FILE-ID": cloudFileId,
        "X-ACTUAL-NAME": encodeURIComponent(budgetName),
        "X-ACTUAL-FORMAT": 2,
        ...uploadMeta ? { "X-ACTUAL-ENCRYPT-META": JSON.stringify(uploadMeta) } : null,
        ...groupId ? { "X-ACTUAL-GROUP-ID": groupId } : null
        // TODO: fix me
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      },
      body: uploadContent
    });
  } catch (err) {
    console.log("Upload failure", err);
    if (err instanceof PostError) {
      throw FileUploadError(
        err.reason === "unauthorized" ? "unauthorized" : err.reason || "network"
      );
    }
    throw FileUploadError("internal");
  }
  if (res.status === "ok") {
    if (getPrefs() && getPrefs().id === id) {
      await savePrefs({
        lastUploaded: currentDay(),
        cloudFileId,
        groupId: res.groupId
      });
    }
  } else {
    throw FileUploadError("internal");
  }
}
async function possiblyUpload() {
  const { cloudFileId, groupId, lastUploaded } = getPrefs();
  const threshold = lastUploaded && addDays(lastUploaded, UPLOAD_FREQUENCY_IN_DAYS);
  const currentDay$1 = currentDay();
  if (lastUploaded && currentDay$1 < threshold) {
    return;
  }
  if (!cloudFileId || !groupId) {
    return;
  }
  upload().catch(() => {
  });
}
async function removeFile(fileId) {
  const userToken = await getItem("user-token");
  await post(getServer().SYNC_SERVER + "/delete-user-file", {
    token: userToken,
    fileId
  });
}
async function listRemoteFiles() {
  const userToken = await getItem("user-token");
  if (!userToken) {
    return null;
  }
  let res;
  try {
    res = await fetchJSON(getServer().SYNC_SERVER + "/list-user-files", {
      headers: {
        "X-ACTUAL-TOKEN": userToken
      }
    });
  } catch (e) {
    console.log("Unexpected error fetching file list from server", e);
    return null;
  }
  if (res.status === "error") {
    console.log("Error fetching file list from server", res);
    return null;
  }
  return res.data.map((file) => ({
    ...file,
    hasKey: hasKey(file.encryptKeyId)
  })).filter(Boolean);
}
async function getRemoteFile(fileId) {
  const userToken = await getItem("user-token");
  if (!userToken) {
    return null;
  }
  let res;
  try {
    res = await fetchJSON(getServer().SYNC_SERVER + "/get-user-file-info", {
      headers: {
        "X-ACTUAL-TOKEN": userToken,
        "X-ACTUAL-FILE-ID": fileId
      }
    });
  } catch (e) {
    console.log("Unexpected error fetching file from server", e);
    return null;
  }
  if (res.status === "error") {
    console.log("Error fetching file from server", res);
    return null;
  }
  return {
    ...res.data,
    hasKey: hasKey(res.data.encryptKeyId)
  };
}
async function download(cloudFileId) {
  const userToken = await getItem("user-token");
  const syncServer = getServer().SYNC_SERVER;
  const userFileFetch = fetch$1(`${syncServer}/download-user-file`, {
    headers: {
      "X-ACTUAL-TOKEN": userToken,
      "X-ACTUAL-FILE-ID": cloudFileId
    }
  }).then(checkHTTPStatus).then((res) => {
    if (res.arrayBuffer) {
      return res.arrayBuffer().then((ab) => Buffer.from(ab));
    }
    return res.buffer();
  }).catch((err) => {
    console.log("Download failure", err);
    throw FileDownloadError("download-failure");
  });
  const userFileInfoFetch = fetchJSON(`${syncServer}/get-user-file-info`, {
    headers: {
      "X-ACTUAL-TOKEN": userToken,
      "X-ACTUAL-FILE-ID": cloudFileId
    }
  }).catch((err) => {
    console.log("Error fetching file info", err);
    throw FileDownloadError("internal", { fileId: cloudFileId });
  });
  const [userFileInfoRes, userFileRes] = await Promise.all([
    userFileInfoFetch,
    userFileFetch
  ]);
  if (userFileInfoRes.status !== "ok") {
    console.log(
      "Could not download file from the server. Are you sure you have the right file ID?",
      userFileInfoRes
    );
    throw FileDownloadError("internal", { fileId: cloudFileId });
  }
  const fileData = userFileInfoRes.data;
  let buffer = userFileRes;
  if (fileData.encryptMeta) {
    try {
      buffer = await decrypt(buffer, fileData.encryptMeta);
    } catch (e) {
      throw FileDownloadError("decrypt-failure", {
        isMissingKey: e.message === "missing-key"
      });
    }
  }
  return importBuffer(fileData, buffer);
}
async function resetSync$1(keyState) {
  if (!keyState) {
    const { valid, error: error2 } = await checkKey();
    if (error2) {
      return { error: error2 };
    } else if (!valid) {
      return { error: { reason: "file-has-new-key" } };
    }
  }
  const { error } = await resetSyncState(keyState);
  if (error) {
    return { error };
  }
  await runMutator(async () => {
    await execQuery(`
      DELETE FROM messages_crdt;
      DELETE FROM messages_clock;
      DELETE FROM transactions WHERE tombstone = 1;
      DELETE FROM accounts WHERE tombstone = 1;
      DELETE FROM payees WHERE tombstone = 1;
      DELETE FROM categories WHERE tombstone = 1;
      DELETE FROM category_groups WHERE tombstone = 1;
      DELETE FROM schedules WHERE tombstone = 1;
      DELETE FROM rules WHERE tombstone = 1;
      ANALYZE;
      VACUUM;
    `);
    await loadClock();
  });
  await savePrefs({
    groupId: null,
    lastSyncedTimestamp: null,
    lastUploaded: null
  });
  if (keyState) {
    const { key } = keyState;
    const { cloudFileId } = getPrefs();
    const keys2 = JSON.parse(
      await getItem(`encrypt-keys`) || "{}"
    );
    keys2[cloudFileId] = key.serialize();
    await setItem("encrypt-keys", JSON.stringify(keys2));
    await savePrefs({ encryptKeyId: key.getId() });
  }
  try {
    await upload();
  } catch (e) {
    if (e.reason) {
      return { error: e };
    }
    captureException(e);
    return { error: { reason: "upload-failure" } };
  } finally {
  }
  return {};
}
const FULL_SYNC_DELAY = 1e3;
let SYNCING_MODE = "enabled";
function setSyncingMode(mode) {
  const prevMode = SYNCING_MODE;
  switch (mode) {
    case "enabled":
      SYNCING_MODE = "enabled";
      break;
    case "offline":
      SYNCING_MODE = "offline";
      break;
    case "disabled":
      SYNCING_MODE = "disabled";
      break;
    case "import":
      SYNCING_MODE = "import";
      break;
    default:
      throw new Error("setSyncingMode: invalid mode: " + mode);
  }
  return prevMode;
}
function checkSyncingMode(mode) {
  switch (mode) {
    case "enabled":
      return SYNCING_MODE === "enabled" || SYNCING_MODE === "offline";
    case "disabled":
      return SYNCING_MODE === "disabled" || SYNCING_MODE === "import";
    case "offline":
      return SYNCING_MODE === "offline";
    case "import":
      return SYNCING_MODE === "import";
    default:
      throw new Error("checkSyncingMode: invalid mode: " + mode);
  }
}
function apply(msg, prev) {
  const { dataset, row, column, value } = msg;
  if (dataset === "prefs") ;
  else {
    let query;
    try {
      if (prev) {
        query = {
          sql: `UPDATE ${dataset} SET ${column} = ? WHERE id = ?`,
          params: [value, row]
        };
      } else {
        query = {
          sql: `INSERT INTO ${dataset} (id, ${column}) VALUES (?, ?)`,
          params: [row, value]
        };
      }
      runQuery(cache(query.sql), query.params);
    } catch (error) {
      throw new SyncError("invalid-schema", {
        error: { message: error.message, stack: error.stack },
        query
      });
    }
  }
}
async function fetchAll(table, ids) {
  let results = [];
  const batchSize = 100;
  for (let i = 0; i < ids.length; i += batchSize) {
    const partIds = ids.slice(i, i + batchSize);
    let sql;
    let column = `${table}.id`;
    if (table === "transactions") {
      sql = `
        SELECT t.*, c.transferId AS category
        FROM transactions t
        LEFT JOIN category_mapping c ON c.id = t.category
      `;
      column = "t.id";
    } else {
      sql = `SELECT * FROM ${table}`;
    }
    sql += ` WHERE `;
    sql += partIds.map(() => `${column} = ?`).join(" OR ");
    try {
      const rows = await runQuery(sql, partIds, true);
      results = results.concat(rows);
    } catch (error) {
      throw new SyncError("invalid-schema", {
        error: {
          message: error.message,
          stack: error.stack
        },
        query: { sql, params: partIds }
      });
    }
  }
  return results;
}
function serializeValue(value) {
  if (value === null) {
    return "0:";
  } else if (typeof value === "number") {
    return "N:" + value;
  } else if (typeof value === "string") {
    return "S:" + value;
  }
  throw new Error("Unserializable value type: " + JSON.stringify(value));
}
function deserializeValue(value) {
  const type = value[0];
  switch (type) {
    case "0":
      return null;
    case "N":
      return parseFloat(value.slice(2));
    case "S":
      return value.slice(2);
  }
  throw new Error("Invalid type key for value: " + value);
}
let _syncListeners = [];
function addSyncListener(func) {
  _syncListeners.push(func);
  return () => {
    _syncListeners = _syncListeners.filter((f2) => f2 !== func);
  };
}
async function compareMessages(messages) {
  const newMessages = [];
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const { dataset, row, column, timestamp } = message;
    const timestampStr = timestamp.toString();
    const res = runQuery(
      cache(
        "SELECT timestamp FROM messages_crdt WHERE dataset = ? AND row = ? AND column = ? AND timestamp >= ?"
      ),
      [dataset, row, column, timestampStr],
      true
    );
    if (res.length === 0) {
      newMessages.push(message);
    } else if (res[0].timestamp !== timestampStr) {
      newMessages.push({ ...message, old: true });
    }
  }
  return newMessages;
}
function applyMessagesForImport(messages) {
  transaction(() => {
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const { dataset } = msg;
      if (!msg.old) {
        try {
          apply(msg);
        } catch (e) {
          apply(msg, true);
        }
        if (dataset === "prefs") {
          throw new Error("Cannot set prefs while importing");
        }
      }
    }
  });
}
const applyMessages = sequential(async (messages) => {
  if (checkSyncingMode("import")) {
    applyMessagesForImport(messages);
    return void 0;
  } else if (checkSyncingMode("enabled")) {
    messages = await compareMessages(messages);
  }
  messages = [...messages].sort((m1, m2) => {
    const t1 = m1.timestamp ? m1.timestamp.toString() : "";
    const t2 = m2.timestamp ? m2.timestamp.toString() : "";
    if (t1 < t2) {
      return -1;
    } else if (t1 > t2) {
      return 1;
    }
    return 0;
  });
  const idsPerTable = {};
  messages.forEach((msg) => {
    if (msg.dataset === "prefs") {
      return;
    }
    if (idsPerTable[msg.dataset] == null) {
      idsPerTable[msg.dataset] = [];
    }
    idsPerTable[msg.dataset].push(msg.row);
  });
  async function fetchData() {
    const data = /* @__PURE__ */ new Map();
    for (const table of Object.keys(idsPerTable)) {
      const rows = await fetchAll(table, idsPerTable[table]);
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        setIn(data, [table, row.id], row);
      }
    }
    return data;
  }
  const prefsToSet = {};
  const oldData = await fetchData();
  appendMessages(messages, oldData);
  let clock2;
  let currentMerkle;
  if (checkSyncingMode("enabled")) {
    clock2 = getClock();
    currentMerkle = clock2.merkle;
  }
  if (get$1()) {
    get$1().startCacheBarrier();
  }
  transaction(() => {
    const added = /* @__PURE__ */ new Set();
    for (const msg of messages) {
      const { dataset, row, column, timestamp, value } = msg;
      if (!msg.old) {
        apply(msg, getIn(oldData, [dataset, row]) || added.has(dataset + row));
        if (dataset === "prefs") {
          prefsToSet[row] = value;
        } else {
          added.add(dataset + row);
        }
      }
      if (checkSyncingMode("enabled")) {
        runQuery(
          cache(`INSERT INTO messages_crdt (timestamp, dataset, row, column, value)
           VALUES (?, ?, ?, ?, ?)`),
          [timestamp.toString(), dataset, row, column, serializeValue(value)]
        );
        currentMerkle = insert$1(currentMerkle, timestamp);
      }
      if (dataset === "preferences" && row === "budgetType") {
        setType(value);
      }
    }
    if (checkSyncingMode("enabled")) {
      currentMerkle = prune(currentMerkle);
      runQuery(
        cache(
          "INSERT OR REPLACE INTO messages_clock (id, clock) VALUES (1, ?)"
        ),
        [serializeClock({ ...clock2, merkle: currentMerkle })]
      );
    }
  });
  if (checkSyncingMode("enabled")) {
    clock2.merkle = currentMerkle;
  }
  if (Object.keys(prefsToSet).length > 0) {
    savePrefs(prefsToSet, { avoidSync: true });
  }
  const newData = await fetchData();
  if (get$1()) {
    startTransaction();
    triggerBudgetChanges(oldData, newData);
    get$1().triggerDatabaseChanges(oldData, newData);
    endTransaction();
    get$1().endCacheBarrier();
  }
  _syncListeners.forEach((func) => func(oldData, newData));
  const tables = getTablesFromMessages(messages.filter((msg) => !msg.old));
  app$j.events.emit("sync", {
    type: "applied",
    tables,
    data: newData,
    prevData: oldData
  });
  return messages;
});
function receiveMessages(messages) {
  messages.forEach((msg) => {
    Timestamp.recv(msg.timestamp);
  });
  return runMutator(() => applyMessages(messages));
}
async function _sendMessages(messages) {
  try {
    await applyMessages(messages);
  } catch (e) {
    if (e instanceof SyncError) {
      if (e.reason === "invalid-schema") {
        app$j.events.emit("sync", {
          type: "error",
          subtype: "apply-failure",
          meta: e.meta
        });
      } else {
        app$j.events.emit("sync", { type: "error", meta: e.meta });
      }
    }
    throw e;
  }
  await scheduleFullSync();
}
let IS_BATCHING = false;
let _BATCHED = [];
async function batchMessages(func) {
  if (IS_BATCHING) {
    await func();
    return;
  }
  IS_BATCHING = true;
  let batched = [];
  try {
    await func();
  } finally {
    IS_BATCHING = false;
    batched = _BATCHED;
    _BATCHED = [];
  }
  if (batched.length > 0) {
    await _sendMessages(batched);
  }
}
async function sendMessages(messages) {
  if (IS_BATCHING) {
    _BATCHED = _BATCHED.concat(messages);
  } else {
    return _sendMessages(messages);
  }
}
function getMessagesSince(since) {
  return runQuery(
    "SELECT timestamp, dataset, row, column, value FROM messages_crdt WHERE timestamp > ?",
    [since],
    true
  );
}
function clearFullSyncTimeout() {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }
}
let syncTimeout = null;
function scheduleFullSync() {
  clearFullSyncTimeout();
  if (checkSyncingMode("enabled") && !checkSyncingMode("offline")) {
    if (process.env.NODE_ENV === "test") {
      return fullSync().then((res) => {
        if (isError(res)) {
          throw res.error;
        }
        return res;
      });
    } else {
      syncTimeout = setTimeout(fullSync, FULL_SYNC_DELAY);
    }
  }
}
function getTablesFromMessages(messages) {
  return messages.reduce((acc, message) => {
    const dataset = message.dataset === "schedules_next_date" ? "schedules" : message.dataset;
    if (!acc.includes(dataset)) {
      acc.push(dataset);
    }
    return acc;
  }, []);
}
async function initialFullSync() {
  const result = await fullSync();
  if (isError(result)) {
    await waitOnSpreadsheet();
    return result;
  }
  return {};
}
const fullSync = once(async function() {
  app$j.events.emit("sync", { type: "start" });
  let messages;
  try {
    messages = await _fullSync(null, 0, null);
  } catch (e) {
    console.log(e);
    if (e instanceof SyncError) {
      if (e.reason === "out-of-sync") {
        captureException(e);
        app$j.events.emit("sync", {
          type: "error",
          subtype: "out-of-sync",
          meta: e.meta
        });
      } else if (e.reason === "invalid-schema") {
        app$j.events.emit("sync", {
          type: "error",
          subtype: "invalid-schema",
          meta: e.meta
        });
      } else if (e.reason === "decrypt-failure" || e.reason === "encrypt-failure") {
        app$j.events.emit("sync", {
          type: "error",
          subtype: e.reason,
          meta: e.meta
        });
      } else {
        app$j.events.emit("sync", { type: "error", meta: e.meta });
      }
    } else if (e instanceof PostError) {
      console.log(e);
      if (e.reason === "unauthorized") {
        app$j.events.emit("sync", { type: "unauthorized" });
        setItem("readOnly", "true");
      } else if (e.reason === "network-failure") {
        app$j.events.emit("sync", { type: "error", subtype: "network" });
      } else {
        app$j.events.emit("sync", { type: "error", subtype: e.reason });
      }
    } else {
      captureException(e);
      app$j.events.emit("sync", { type: "error" });
    }
    return { error: { message: e.message, reason: e.reason, meta: e.meta } };
  }
  const tables = getTablesFromMessages(messages);
  app$j.events.emit("sync", {
    type: "success",
    tables,
    syncDisabled: checkSyncingMode("disabled")
  });
  return { messages };
});
async function _fullSync(sinceTimestamp, count, prevDiffTime) {
  const { cloudFileId, groupId, lastSyncedTimestamp } = getPrefs() || {};
  clearFullSyncTimeout();
  if (checkSyncingMode("disabled") || checkSyncingMode("offline")) {
    return [];
  }
  const currentTime = getClock().timestamp.toString();
  const since = sinceTimestamp || lastSyncedTimestamp || // Default to 5 minutes ago
  new Timestamp(Date.now() - 5 * 60 * 1e3, 0, "0").toString();
  const messages = getMessagesSince(since);
  const userToken = await getItem("user-token");
  logger.info(
    "Syncing since",
    since,
    messages.length,
    "(attempt: " + count + ")"
  );
  const buffer = await encode(groupId, cloudFileId, since, messages);
  const resBuffer = await postBinary(
    getServer().SYNC_SERVER + "/sync",
    buffer,
    {
      "X-ACTUAL-TOKEN": userToken
    }
  );
  if (!getPrefs() || getPrefs().groupId !== groupId) {
    return [];
  }
  const res = await decode(resBuffer);
  logger.info("Got messages from server", res.messages.length);
  const localTimeChanged = getClock().timestamp.toString() !== currentTime;
  let receivedMessages = [];
  if (res.messages.length > 0) {
    receivedMessages = await receiveMessages(
      res.messages.map((msg) => ({
        ...msg,
        value: deserializeValue(msg.value)
      }))
    );
  }
  const diffTime = diff(res.merkle, getClock().merkle);
  if (diffTime !== null) {
    if (count >= 10 && diffTime === prevDiffTime || count >= 100) {
      logger.info("SENT -------");
      logger.info(JSON.stringify(messages));
      logger.info("RECEIVED -------");
      logger.info(JSON.stringify(res.messages));
      const rebuiltMerkle = rebuildMerkleHash();
      console.log(
        count,
        "messages:",
        messages.length,
        messages.length > 0 ? messages[0] : null,
        "res.messages:",
        res.messages.length,
        res.messages.length > 0 ? res.messages[0] : null,
        "clientId",
        getClock().timestamp.node(),
        "groupId",
        groupId,
        "diffTime:",
        diffTime,
        diffTime === prevDiffTime,
        "local clock:",
        getClock().timestamp.toString(),
        getClock().merkle.hash,
        "rebuilt hash:",
        rebuiltMerkle.numMessages,
        rebuiltMerkle.trie.hash,
        "server hash:",
        res.merkle.hash,
        "localTimeChanged:",
        localTimeChanged
      );
      if (rebuiltMerkle.trie.hash === res.merkle.hash) {
        const clocks = await all(
          "SELECT * FROM messages_clock"
        );
        if (clocks.length !== 1) {
          console.log("Bad number of clocks:", clocks.length);
        }
        const hash = deserializeClock(clocks[0].clock).merkle.hash;
        console.log("Merkle hash in db:", hash);
      }
      throw new SyncError("out-of-sync");
    }
    receivedMessages = receivedMessages.concat(
      await _fullSync(
        new Timestamp(diffTime, 0, "0").toString(),
        // If something local changed while we were syncing, always
        // reset, token the counter. We never want to think syncing failed
        // because we tried to syncing many times and couldn't sync,
        // but it was because the user kept changing stuff in the
        // middle of syncing.
        localTimeChanged ? 0 : count + 1,
        diffTime
      )
    );
  } else {
    const requiresUpdate = getClock().timestamp.toString() !== lastSyncedTimestamp;
    if (requiresUpdate) {
      await savePrefs({
        lastSyncedTimestamp: getClock().timestamp.toString()
      });
    }
  }
  return receivedMessages;
}
const SORT_INCREMENT = 16384;
function midpoint(items, to) {
  const below = items[to - 1];
  const above = items[to];
  if (!below) {
    return above.sort_order / 2;
  } else if (!above) {
    return below.sort_order + SORT_INCREMENT;
  } else {
    return (below.sort_order + above.sort_order) / 2;
  }
}
function shoveSortOrders(items, targetId = null) {
  const to = items.findIndex((item) => item.id === targetId);
  const target = items[to];
  const before = items[to - 1];
  const updates = [];
  if (!targetId || to === -1) {
    let order;
    if (items.length > 0) {
      order = items[items.length - 1].sort_order + SORT_INCREMENT;
    } else {
      order = SORT_INCREMENT;
    }
    return { updates, sort_order: order };
  } else {
    if (target.sort_order - (before ? before.sort_order : 0) <= 2) {
      let next = to;
      let order = Math.floor(items[next].sort_order) + SORT_INCREMENT;
      while (next < items.length) {
        if (order <= items[next].sort_order) {
          break;
        }
        updates.push({ id: items[next].id, sort_order: order });
        next++;
        order += SORT_INCREMENT;
      }
    }
    return { updates, sort_order: midpoint(items, to) };
  }
}
let dbPath = null;
let db = null;
function getDatabasePath() {
  return dbPath;
}
async function openDatabase(id) {
  if (db) {
    await closeDatabase$1(db);
  }
  dbPath = join$1(getBudgetDir(id), "db.sqlite");
  setDatabase(await openDatabase$1(dbPath));
}
async function closeDatabase() {
  if (db) {
    await closeDatabase$1(db);
    setDatabase(null);
  }
}
function setDatabase(db_) {
  db = db_;
  resetQueryCache();
}
function getDatabase() {
  return db;
}
async function loadClock() {
  const row = await first("SELECT * FROM messages_clock");
  if (row) {
    const clock2 = deserializeClock(row.clock);
    setClock(clock2);
  } else {
    const timestamp = new Timestamp(0, 0, makeClientId());
    const clock2 = makeClock(timestamp);
    setClock(clock2);
    await runQuery("INSERT INTO messages_clock (id, clock) VALUES (?, ?)", [
      1,
      serializeClock(clock2)
    ]);
  }
}
function runQuery(sql, params, fetchAll2) {
  if (fetchAll2) {
    return runQuery$1(db, sql, params, true);
  } else {
    return runQuery$1(db, sql, params, false);
  }
}
function execQuery(sql) {
  execQuery$2(db, sql);
}
let _queryCache = new lruCache.LRUCache({ max: 100 });
function cache(sql) {
  const cached = _queryCache.get(sql);
  if (cached) {
    return cached;
  }
  const prepared = prepare(db, sql);
  _queryCache.set(sql, prepared);
  return prepared;
}
function resetQueryCache() {
  _queryCache = new lruCache.LRUCache({ max: 100 });
}
function transaction(fn) {
  return transaction$1(db, fn);
}
function asyncTransaction(fn) {
  return asyncTransaction$1(db, fn);
}
async function all(sql, params) {
  return runQuery(sql, params, true);
}
async function first(sql, params) {
  const arr = await runQuery(sql, params, true);
  return arr.length === 0 ? null : arr[0];
}
function firstSync(sql, params) {
  const arr = runQuery(sql, params, true);
  return arr.length === 0 ? null : arr[0];
}
async function run(sql, params) {
  return runQuery(sql, params);
}
async function select(table, id) {
  const rows = await runQuery(
    "SELECT * FROM " + table + " WHERE id = ?",
    [id],
    true
  );
  return rows[0];
}
async function update(table, params) {
  const fields = Object.keys(params).filter((k) => k !== "id");
  if (params.id == null) {
    throw new Error("update: id is required");
  }
  await sendMessages(
    fields.map((k) => {
      return {
        dataset: table,
        row: params.id,
        column: k,
        value: params[k],
        timestamp: Timestamp.send()
      };
    })
  );
}
async function insertWithUUID(table, row) {
  if (!row.id) {
    row = { ...row, id: uuid.v4() };
  }
  await insert(table, row);
  return row.id;
}
async function insert(table, row) {
  const fields = Object.keys(row).filter((k) => k !== "id");
  if (row.id == null) {
    throw new Error("insert: id is required");
  }
  await sendMessages(
    fields.map((k) => {
      return {
        dataset: table,
        row: row.id,
        column: k,
        value: row[k],
        timestamp: Timestamp.send()
      };
    })
  );
}
async function delete_(table, id) {
  await sendMessages([
    {
      dataset: table,
      row: id,
      column: "tombstone",
      value: 1,
      timestamp: Timestamp.send()
    }
  ]);
}
async function deleteAll(table) {
  const rows = await all(`
    SELECT id FROM ${table} WHERE tombstone = 0
  `);
  await Promise.all(rows.map(({ id }) => delete_(table, id)));
}
async function selectWithSchema(table, sql, params) {
  const rows = await runQuery(sql, params, true);
  const convertedRows = rows.map((row) => convertFromSelect(schema, schemaConfig, table, row)).filter(Boolean);
  return convertedRows;
}
async function selectFirstWithSchema(table, sql, params) {
  const rows = await selectWithSchema(table, sql, params);
  return rows.length > 0 ? rows[0] : null;
}
function insertWithSchema(table, row) {
  if (!row.id) {
    row = { ...row, id: uuid.v4() };
  }
  return insertWithUUID(
    table,
    convertForInsert(schema, schemaConfig, table, row)
  );
}
function updateWithSchema(table, fields) {
  return update(table, convertForUpdate(schema, schemaConfig, table, fields));
}
async function getCategories$3(ids) {
  const whereIn2 = ids ? `c.id IN (${toSqlQueryParameters(ids)}) AND` : "";
  const query = `SELECT c.* FROM categories c WHERE ${whereIn2} c.tombstone = 0 ORDER BY c.sort_order, c.id`;
  return ids ? await all(query, [...ids]) : await all(query);
}
async function getCategoriesGrouped(ids) {
  const categoryGroupWhereIn = ids ? `cg.id IN (${toSqlQueryParameters(ids)}) AND` : "";
  const categoryGroupQuery = `SELECT cg.* FROM category_groups cg WHERE ${categoryGroupWhereIn} cg.tombstone = 0
    ORDER BY cg.is_income, cg.sort_order, cg.id`;
  const categoryWhereIn = ids ? `c.cat_group IN (${toSqlQueryParameters(ids)}) AND` : "";
  const categoryQuery = `SELECT c.* FROM categories c WHERE ${categoryWhereIn} c.tombstone = 0
    ORDER BY c.sort_order, c.id`;
  const groups = ids ? await all(categoryGroupQuery, [...ids]) : await all(categoryGroupQuery);
  const categories = ids ? await all(categoryQuery, [...ids]) : await all(categoryQuery);
  return groups.map((group) => ({
    ...group,
    categories: categories.filter((c) => c.cat_group === group.id)
  }));
}
async function insertCategoryGroup(group) {
  const existingGroup = await first(
    `SELECT id, name, hidden FROM category_groups WHERE UPPER(name) = ? and tombstone = 0 LIMIT 1`,
    [group.name.toUpperCase()]
  );
  if (existingGroup) {
    throw new Error(
      `A ${existingGroup.hidden ? "hidden " : ""}’${existingGroup.name}’ category group already exists.`
    );
  }
  const lastGroup = await first(`
    SELECT sort_order FROM category_groups WHERE tombstone = 0 ORDER BY sort_order DESC, id DESC LIMIT 1
  `);
  const sort_order = (lastGroup ? lastGroup.sort_order : 0) + SORT_INCREMENT;
  group = {
    ...categoryGroupModel$1.validate(group),
    sort_order
  };
  const id = await insertWithUUID(
    "category_groups",
    group
  );
  return id;
}
function updateCategoryGroup$1(group) {
  group = categoryGroupModel$1.validate(group, { update: true });
  return update("category_groups", group);
}
async function moveCategoryGroup$1(id, targetId) {
  const groups = await all(
    `SELECT id, sort_order FROM category_groups WHERE tombstone = 0 ORDER BY sort_order, id`
  );
  const { updates, sort_order } = shoveSortOrders(groups, targetId);
  for (const info of updates) {
    await update("category_groups", info);
  }
  await update("category_groups", { id, sort_order });
}
async function deleteCategoryGroup$1(group, transferId) {
  const categories = await all(
    "SELECT * FROM categories WHERE cat_group = ?",
    [group.id]
  );
  await Promise.all(categories.map((cat) => deleteCategory$1(cat, transferId)));
  await delete_("category_groups", group.id);
}
async function insertCategory(category, { atEnd } = { atEnd: void 0 }) {
  let sort_order;
  let id_;
  await batchMessages(async () => {
    const existingCatInGroup = await first(
      `SELECT id FROM categories WHERE cat_group = ? and UPPER(name) = ? and tombstone = 0 LIMIT 1`,
      [category.cat_group, category.name.toUpperCase()]
    );
    if (existingCatInGroup) {
      throw new Error(
        `Category ‘${category.name}’ already exists in group ‘${category.cat_group}’`
      );
    }
    if (atEnd) {
      const lastCat = await first(`
        SELECT sort_order FROM categories WHERE tombstone = 0 ORDER BY sort_order DESC, id DESC LIMIT 1
      `);
      sort_order = (lastCat ? lastCat.sort_order : 0) + SORT_INCREMENT;
    } else {
      const categories = await all(
        `SELECT id, sort_order FROM categories WHERE cat_group = ? AND tombstone = 0 ORDER BY sort_order, id`,
        [category.cat_group]
      );
      const { updates, sort_order: order } = shoveSortOrders(
        categories,
        categories.length > 0 ? categories[0].id : null
      );
      for (const info of updates) {
        await update("categories", info);
      }
      sort_order = order;
    }
    category = {
      ...categoryModel$1.validate(category),
      sort_order
    };
    const id = await insertWithUUID("categories", category);
    await insert("category_mapping", { id, transferId: id });
    id_ = id;
  });
  return id_;
}
function updateCategory$1(category) {
  category = categoryModel$1.validate(category, { update: true });
  return update("categories", category);
}
async function moveCategory$1(id, groupId, targetId) {
  if (!groupId) {
    throw new Error("moveCategory: groupId is required");
  }
  const categories = await all(
    `SELECT id, sort_order FROM categories WHERE cat_group = ? AND tombstone = 0 ORDER BY sort_order, id`,
    [groupId]
  );
  const { updates, sort_order } = shoveSortOrders(categories, targetId);
  for (const info of updates) {
    await update("categories", info);
  }
  await update("categories", { id, sort_order, cat_group: groupId });
}
async function deleteCategory$1(category, transferId) {
  if (transferId) {
    const existingTransfers = await all(
      "SELECT * FROM category_mapping WHERE transferId = ?",
      [category.id]
    );
    for (const mapping of existingTransfers) {
      await update("category_mapping", {
        id: mapping.id,
        transferId
      });
    }
    await update("category_mapping", { id: category.id, transferId });
  }
  return delete_("categories", category.id);
}
async function getPayee$1(id) {
  return first(`SELECT * FROM payees WHERE id = ?`, [id]);
}
async function getAccount(id) {
  return first(`SELECT * FROM accounts WHERE id = ?`, [id]);
}
async function insertPayee(payee) {
  payee = payeeModel$1.validate(payee);
  let id;
  await batchMessages(async () => {
    id = await insertWithUUID("payees", payee);
    await insert("payee_mapping", { id, targetId: id });
  });
  return id;
}
async function deletePayee(payee) {
  const { transfer_acct } = await first(
    "SELECT * FROM payees WHERE id = ?",
    [payee.id]
  );
  if (transfer_acct) {
    return;
  }
  return delete_("payees", payee.id);
}
async function deleteTransferPayee(payee) {
  return delete_("payees", payee.id);
}
function updatePayee(payee) {
  payee = payeeModel$1.validate(payee, { update: true });
  return update("payees", payee);
}
async function mergePayees$1(target, ids) {
  const dbPayees = await all("SELECT * FROM payees");
  const payees = groupById(dbPayees);
  if (payees[target].transfer_acct != null) {
    return;
  }
  ids = ids.filter((id) => payees[id].transfer_acct == null);
  await batchMessages(async () => {
    await Promise.all(
      ids.map(async (id) => {
        const mappings = await all(
          "SELECT id FROM payee_mapping WHERE targetId = ?",
          [id]
        );
        await Promise.all(
          mappings.map(
            (m) => update("payee_mapping", { id: m.id, targetId: target })
          )
        );
      })
    );
    await Promise.all(
      ids.map(
        (id) => Promise.all([
          update("payee_mapping", { id, targetId: target }),
          delete_("payees", id)
        ])
      )
    );
  });
}
function getPayees$2() {
  return all(`
    SELECT p.*, COALESCE(a.name, p.name) AS name FROM payees p
    LEFT JOIN accounts a ON (p.transfer_acct = a.id AND a.tombstone = 0)
    WHERE p.tombstone = 0 AND (p.transfer_acct IS NULL OR a.id IS NOT NULL)
    ORDER BY p.transfer_acct IS NULL DESC, p.name COLLATE NOCASE, a.offbudget, a.sort_order
  `);
}
function getCommonPayees$1() {
  const twelveWeeksAgo = toDateRepr(
    subWeeks(currentDate(), 12)
  );
  const limit = 10;
  return all(`
    SELECT     p.id as id, p.name as name, p.favorite as favorite,
      p.category as category, TRUE as common, NULL as transfer_acct,
    count(*) as c,
    max(t.date) as latest
    FROM payees p
    LEFT JOIN v_transactions_internal_alive t on t.payee == p.id
    WHERE LENGTH(p.name) > 0
    AND p.tombstone = 0
    AND t.date > ${twelveWeeksAgo}
    GROUP BY p.id
    ORDER BY c DESC ,p.transfer_acct IS NULL DESC, p.name
    COLLATE NOCASE
    LIMIT ${limit}
  `);
}
const orphanedPayeesQuery = `
  SELECT p.id
  FROM payees p
    LEFT JOIN payee_mapping pm ON pm.id = p.id
    LEFT JOIN v_transactions_internal_alive t ON t.payee = pm.targetId
  WHERE p.tombstone = 0
    AND p.transfer_acct IS NULL
    AND t.id IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM rules r,
      json_each(r.conditions) as cond
      WHERE r.tombstone = 0
        AND json_extract(cond.value, '$.field') = 'description'
        AND json_extract(cond.value, '$.value') = pm.targetId
    );
`;
function syncGetOrphanedPayees() {
  return all(orphanedPayeesQuery);
}
async function getOrphanedPayees$1() {
  const rows = await all(orphanedPayeesQuery);
  return rows.map((row) => row.id);
}
async function getPayeeByName(name) {
  return first(
    `SELECT * FROM payees WHERE UNICODE_LOWER(name) = ? AND tombstone = 0`,
    [name.toLowerCase()]
  );
}
function getAccounts$2() {
  return all(
    `SELECT a.*, b.name as bankName, b.id as bankId FROM accounts a
       LEFT JOIN banks b ON a.bank = b.id
       WHERE a.tombstone = 0
       ORDER BY sort_order, name`
  );
}
async function insertAccount(account) {
  const accounts = await all(
    "SELECT * FROM accounts WHERE offbudget = ? ORDER BY sort_order, name",
    [account.offbudget ? 1 : 0]
  );
  const { sort_order } = shoveSortOrders(accounts);
  account = accountModel$1.validate({ ...account, sort_order });
  return insertWithUUID("accounts", account);
}
function updateAccount$1(account) {
  account = accountModel$1.validate(account, { update: true });
  return update("accounts", account);
}
function deleteAccount(account) {
  return delete_("accounts", account.id);
}
async function moveAccount$1(id, targetId) {
  const account = await first(
    "SELECT * FROM accounts WHERE id = ?",
    [id]
  );
  let accounts;
  if (account.closed) {
    accounts = await all(
      `SELECT id, sort_order FROM accounts WHERE closed = 1 ORDER BY sort_order, name`
    );
  } else {
    accounts = await all(
      `SELECT id, sort_order FROM accounts WHERE tombstone = 0 AND offbudget = ? ORDER BY sort_order, name`,
      [account.offbudget ? 1 : 0]
    );
  }
  const { updates, sort_order } = shoveSortOrders(accounts, targetId);
  await batchMessages(async () => {
    for (const info of updates) {
      update("accounts", info);
    }
    update("accounts", { id, sort_order });
  });
}
async function getTransaction(id) {
  const rows = await selectWithSchema(
    "transactions",
    "SELECT * FROM v_transactions WHERE id = ?",
    [id]
  );
  return rows[0];
}
async function getTransactions$1(accountId) {
  if (arguments.length > 1) {
    throw new Error(
      "`getTransactions` was given a second argument, it now only takes a single argument `accountId`"
    );
  }
  return selectWithSchema(
    "transactions",
    "SELECT * FROM v_transactions WHERE account = ?",
    [accountId]
  );
}
function insertTransaction(transaction2) {
  return insertWithSchema("transactions", transaction2);
}
function updateTransaction$2(transaction2) {
  return updateWithSchema("transactions", transaction2);
}
async function deleteTransaction$2(transaction2) {
  return delete_("transactions", transaction2.id);
}
function toSqlQueryParameters(params) {
  return params.map(() => "?").join(",");
}
function getTags$1() {
  return all(`
    SELECT id, tag, color, description
    FROM tags
    ORDER BY tag
  `);
}
function insertTag(tag) {
  return insertWithUUID("tags", tag);
}
async function deleteTag$1(tag) {
  return transaction(() => {
    runQuery(`DELETE FROM tags WHERE id = ?`, [tag.id]);
  });
}
function updateTag$1(tag) {
  return update("tags", tag);
}
async function findOrCreateBank(institution, requisitionId) {
  const bank = await first(
    "SELECT id, bank_id FROM banks WHERE bank_id = ?",
    [requisitionId]
  );
  if (bank) {
    return bank;
  }
  const bankData = {
    id: uuid.v4(),
    bank_id: requisitionId,
    name: institution.name
  };
  await insertWithUUID("banks", bankData);
  return bankData;
}
async function createPayee$2(description) {
  const row = await first(
    `SELECT id FROM payees WHERE UNICODE_LOWER(name) = ? AND tombstone = 0`,
    [description.toLowerCase()]
  );
  if (row) {
    return row.id;
  } else {
    return await insertPayee({ name: description });
  }
}
async function getStartingBalancePayee() {
  let category = await first(`
    SELECT * FROM categories
      WHERE is_income = 1 AND
      LOWER(name) = 'starting balances' AND
      tombstone = 0
  `);
  if (category === null) {
    category = await first(
      "SELECT * FROM categories WHERE is_income = 1 AND tombstone = 0"
    );
  }
  const id = await createPayee$2("Starting Balance");
  return {
    id,
    category: category ? category.id : null
  };
}
function num(n) {
  return typeof n === "number" ? n : 0;
}
function SplitTransactionError(total, parent) {
  const difference = num(parent.amount) - total;
  return {
    type: "SplitTransactionError",
    version: 1,
    difference
  };
}
function makeChild(parent, data = {}) {
  const prefix = parent.id === "temp" ? "temp" : "";
  return {
    amount: 0,
    ...data,
    category: "category" in data ? data.category : parent.category,
    payee: "payee" in data ? data.payee : parent.payee,
    id: "id" in data ? data.id : prefix + uuid.v4(),
    account: parent.account,
    date: parent.date,
    cleared: parent.cleared != null ? parent.cleared : null,
    reconciled: "reconciled" in data ? data.reconciled : parent.reconciled,
    starting_balance_flag: parent.starting_balance_flag != null ? parent.starting_balance_flag : null,
    is_child: true,
    parent_id: parent.id,
    error: null
  };
}
function recalculateSplit(trans) {
  const total = (trans.subtransactions || []).reduce(
    (acc, t) => acc + num(t.amount),
    0
  );
  const { error, ...rest } = trans;
  return {
    ...rest,
    error: total === num(trans.amount) ? null : SplitTransactionError(total, trans)
  };
}
function findParentIndex(transactions, idx) {
  while (idx >= 0) {
    const trans = transactions[idx];
    if (trans.is_parent) {
      return idx;
    }
    idx--;
  }
  return null;
}
function getSplit(transactions, parentIndex) {
  const split = [transactions[parentIndex]];
  let curr = parentIndex + 1;
  while (curr < transactions.length && transactions[curr].is_child) {
    split.push(transactions[curr]);
    curr++;
  }
  return split;
}
function ungroupTransactions(transactions) {
  return transactions.reduce((list, parent) => {
    const { subtransactions, ...trans } = parent;
    const _subtransactions = subtransactions || [];
    list.push(trans);
    for (let i = 0; i < _subtransactions.length; i++) {
      list.push(_subtransactions[i]);
    }
    return list;
  }, []);
}
function groupTransaction(split) {
  return {
    ...split[0],
    subtransactions: split.slice(1)
  };
}
function ungroupTransaction(split) {
  if (split == null) {
    return [];
  }
  return ungroupTransactions([split]);
}
function replaceTransactions(transactions, id, func) {
  const idx = transactions.findIndex((t) => t.id === id);
  const trans = transactions[idx];
  const transactionsCopy = [...transactions];
  if (idx === -1) {
    throw new Error("Tried to edit unknown transaction id: " + id);
  }
  if (trans.is_parent || trans.is_child) {
    const parentIndex = findParentIndex(transactions, idx);
    if (parentIndex == null) {
      console.log("Cannot find parent index");
      return {
        data: [],
        diff: { added: [], deleted: [], updated: [] },
        newTransaction: null
      };
    }
    const split = getSplit(transactions, parentIndex);
    let grouped = func(groupTransaction(split));
    const newSplit = ungroupTransaction(grouped);
    let diff2;
    if (newSplit == null) {
      diff2 = { added: [], deleted: [{ id: split[0].id }], updated: [] };
      grouped = { ...split[0], _deleted: true };
      transactionsCopy.splice(parentIndex, split.length);
    } else {
      diff2 = diffItems(split, newSplit);
      transactionsCopy.splice(parentIndex, split.length, ...newSplit);
    }
    return { data: transactionsCopy, newTransaction: grouped, diff: diff2 };
  } else {
    const grouped = func(trans);
    const newTrans = ungroupTransaction(grouped) || [];
    if (grouped) {
      grouped.subtransactions = grouped.subtransactions || [];
    }
    transactionsCopy.splice(idx, 1, ...newTrans);
    return {
      data: transactionsCopy,
      newTransaction: grouped || {
        ...trans,
        _deleted: true
      },
      diff: diffItems([trans], newTrans)
    };
  }
}
function addSplitTransaction(transactions, id) {
  return replaceTransactions(transactions, id, (trans) => {
    if (!trans.is_parent) {
      return trans;
    }
    const prevSub = last(trans.subtransactions || []);
    trans.subtransactions?.push(
      makeChild(trans, {
        amount: 0,
        sort_order: num(prevSub && prevSub.sort_order) - 1
      })
    );
    return trans;
  });
}
function updateTransaction$1(transactions, transaction2) {
  return replaceTransactions(transactions, transaction2.id, (trans) => {
    if (trans.is_parent) {
      const parent = trans.id === transaction2.id ? transaction2 : trans;
      const originalSubtransactions = parent.subtransactions ?? trans.subtransactions;
      const sub = originalSubtransactions?.map((t) => {
        let child = t;
        if (trans.id === transaction2.id) {
          const { payee: childPayee, ...rest } = t;
          const newPayee = childPayee === trans.payee ? transaction2.payee : childPayee;
          child = {
            ...rest,
            ...newPayee != null ? { payee: newPayee } : {}
          };
        } else if (t.id === transaction2.id) {
          child = transaction2;
        }
        return makeChild(parent, child);
      });
      return recalculateSplit({
        ...parent,
        ...sub && { subtransactions: sub }
      });
    } else {
      return transaction2;
    }
  });
}
function deleteTransaction$1(transactions, id) {
  return replaceTransactions(transactions, id, (trans) => {
    if (trans.is_parent) {
      if (trans.id === id) {
        return null;
      } else if (trans.subtransactions?.length === 1) {
        const { subtransactions, ...rest } = trans;
        return {
          ...rest,
          is_parent: false,
          error: null
        };
      } else {
        const sub = trans.subtransactions?.filter((t) => t.id !== id);
        return recalculateSplit({
          ...trans,
          ...sub && { subtransactions: sub }
        });
      }
    } else {
      return null;
    }
  });
}
function splitTransaction(transactions, id, createSubtransactions) {
  return replaceTransactions(transactions, id, (trans) => {
    if (trans.is_parent || trans.is_child) {
      return trans;
    }
    const subtransactions = [
      makeChild(trans)
    ];
    const { error, ...rest } = trans;
    return {
      ...rest,
      is_parent: true,
      error: num(trans.amount) === 0 ? null : SplitTransactionError(0, trans),
      subtransactions: subtransactions.map((t) => ({
        ...t,
        sort_order: t.sort_order || -1
      }))
    };
  });
}
const TYPE_INFO = {
  date: {
    ops: ["is", "isapprox", "gt", "gte", "lt", "lte"],
    nullable: false
  },
  id: {
    ops: [
      "is",
      "contains",
      "matches",
      "oneOf",
      "isNot",
      "doesNotContain",
      "notOneOf",
      "onBudget",
      "offBudget"
    ],
    nullable: true
  },
  saved: {
    ops: [],
    nullable: false
  },
  string: {
    ops: [
      "is",
      "contains",
      "matches",
      "oneOf",
      "isNot",
      "doesNotContain",
      "notOneOf",
      "hasTags"
    ],
    nullable: true
  },
  number: {
    ops: ["is", "isapprox", "isbetween", "gt", "gte", "lt", "lte"],
    nullable: false
  },
  boolean: {
    ops: ["is"],
    nullable: false
  }
};
const FIELD_INFO = {
  imported_payee: {
    type: "string",
    disallowedOps: /* @__PURE__ */ new Set(["hasTags"])
  },
  payee: { type: "id", disallowedOps: /* @__PURE__ */ new Set(["onBudget", "offBudget"]) },
  payee_name: { type: "string" },
  date: { type: "date" },
  notes: { type: "string" },
  amount: { type: "number" },
  category: {
    type: "id",
    disallowedOps: /* @__PURE__ */ new Set(["onBudget", "offBudget"]),
    internalOps: /* @__PURE__ */ new Set(["and"])
  },
  account: { type: "id" },
  cleared: { type: "boolean" },
  reconciled: { type: "boolean" },
  saved: { type: "saved" },
  transfer: { type: "boolean" },
  parent: { type: "boolean" }
};
const fieldInfo = FIELD_INFO;
const FIELD_TYPES = new Map(
  Object.entries(FIELD_INFO).map(([field, info]) => [
    field,
    info.type
  ])
);
function isValidOp(field, op) {
  const type = FIELD_TYPES.get(field);
  if (!type) return false;
  if (fieldInfo[field].disallowedOps?.has(op)) return false;
  return TYPE_INFO[type].ops.includes(op) || fieldInfo[field].internalOps?.has(op);
}
function sortNumbers(num1, num2) {
  if (num1 < num2) {
    return [num1, num2];
  }
  return [num2, num1];
}
function getApproxNumberThreshold(number2) {
  return Math.round(Math.abs(number2) * 0.075);
}
let allMappings;
let unlistenSync$1;
async function loadMappings() {
  const categories = (await all("SELECT * FROM category_mapping")).map((r) => [r.id, r.transferId]);
  const payees = (await all("SELECT * FROM payee_mapping")).map((r) => [r.id, r.targetId]);
  allMappings = new Map(categories.concat(payees));
  if (unlistenSync$1) {
    unlistenSync$1();
  }
  unlistenSync$1 = addSyncListener(onApplySync$2);
}
function onApplySync$2(oldValues, newValues) {
  newValues.forEach((items, table) => {
    if (table.indexOf("mapping") !== -1) {
      const field = table === "category_mapping" ? "transferId" : "targetId";
      items.forEach((newValue) => {
        allMappings.set(newValue.id, newValue[field]);
      });
    }
  });
}
function getMappings() {
  return allMappings;
}
function getStatus(nextDate, completed, hasTrans, upcomingLength = "7") {
  const upcomingDays = getUpcomingDays(upcomingLength);
  const today = currentDay();
  if (completed) {
    return "completed";
  } else if (hasTrans) {
    return "paid";
  } else if (nextDate === today) {
    return "due";
  } else if (nextDate > today && nextDate <= addDays(today, upcomingDays)) {
    return "upcoming";
  } else if (nextDate < today) {
    return "missed";
  } else {
    return "scheduled";
  }
}
function getHasTransactionsQuery(schedules) {
  const filters = schedules.map((schedule) => {
    const dateCond = schedule._conditions.find((c) => c.field === "date");
    return {
      $and: {
        schedule: schedule.id,
        date: {
          $gte: dateCond && dateCond.op === "is" ? schedule.next_date : subDays(schedule.next_date, 2)
        }
      }
    };
  });
  return q("transactions").options({ splits: "all" }).filter({ $or: filters }).orderBy({ date: "desc" }).select(["schedule", "date"]);
}
function recurConfigToRSchedule(config2) {
  const base = {
    start: parseDate$1(config2.start),
    // @ts-ignore: issues with https://gitlab.com/john.carroll.p/rschedule/-/issues/86
    frequency: config2.frequency.toUpperCase(),
    byHourOfDay: [12]
  };
  if (config2.interval) {
    base.interval = config2.interval;
  }
  switch (config2.endMode) {
    case "after_n_occurrences":
      base.count = config2.endOccurrences;
      break;
    case "on_date":
      base.end = parseDate$1(config2.endDate);
      break;
  }
  const abbrevDay = (name) => name.slice(0, 2).toUpperCase();
  switch (config2.frequency) {
    case "daily":
      return [base];
    case "weekly":
      return [base];
    case "monthly":
      if (config2.patterns && config2.patterns.length > 0) {
        const days = config2.patterns.filter((p) => p.type === "day");
        const dayNames = config2.patterns.filter((p) => p.type !== "day");
        return [
          days.length > 0 && { ...base, byDayOfMonth: days.map((p) => p.value) },
          dayNames.length > 0 && {
            ...base,
            byDayOfWeek: dayNames.map((p) => [abbrevDay(p.type), p.value])
          }
        ].filter(Boolean);
      } else {
        return [base];
      }
    case "yearly":
      return [base];
    default:
      throw new Error("Invalid recurring date config");
  }
}
function extractScheduleConds(conditions) {
  return {
    payee: conditions.find((cond) => cond.op === "is" && cond.field === "payee") || conditions.find(
      (cond) => cond.op === "is" && cond.field === "description"
    ) || null,
    account: conditions.find((cond) => cond.op === "is" && cond.field === "account") || conditions.find((cond) => cond.op === "is" && cond.field === "acct") || null,
    amount: conditions.find(
      (cond) => (cond.op === "is" || cond.op === "isapprox" || cond.op === "isbetween") && cond.field === "amount"
    ) || null,
    date: conditions.find(
      (cond) => (cond.op === "is" || cond.op === "isapprox") && cond.field === "date"
    ) || null
  };
}
function getNextDate(dateCond, start = new Date(currentDay()), noSkipWeekend = false) {
  start = d__namespace.startOfDay(start);
  const cond = new Condition(dateCond.op, "date", dateCond.value, null);
  const value = cond.getValue();
  if (value.type === "date") {
    return value.date;
  } else if (value.type === "recur") {
    let dates = value.schedule.occurrences({ start, take: 1 }).toArray();
    if (dates.length === 0) {
      dates = value.schedule.occurrences({ reverse: true, take: 1 }).toArray();
    }
    if (dates.length > 0) {
      let date = dates[0].date;
      if (value.schedule.data.skipWeekend && !noSkipWeekend) {
        date = getDateWithSkippedWeekend(
          date,
          value.schedule.data.weekendSolve
        );
      }
      return dayFromDate(date);
    }
  }
  return null;
}
function getDateWithSkippedWeekend(date, solveMode) {
  if (d__namespace.isWeekend(date)) {
    if (solveMode === "after") {
      return d__namespace.nextMonday(date);
    } else if (solveMode === "before") {
      return d__namespace.previousFriday(date);
    } else {
      throw new Error("Unknown weekend solve mode, this should not happen!");
    }
  }
  return date;
}
function getScheduledAmount(amount, inverse = false) {
  if (amount == null) return 0;
  if (typeof amount === "number") {
    return inverse ? -amount : amount;
  }
  const avg = (amount.num1 + amount.num2) / 2;
  return inverse ? -Math.round(avg) : Math.round(avg);
}
function getUpcomingDays(upcomingLength = "7", today = currentDay()) {
  const month = getMonth(today);
  switch (upcomingLength) {
    case "currentMonth": {
      const day = getDay(today);
      const end = getDay(getMonthEnd(today));
      return end - day;
    }
    case "oneMonth": {
      return differenceInCalendarDays(
        nextMonth(month),
        month
      );
    }
    default:
      if (upcomingLength.includes("-")) {
        const [num2, unit] = upcomingLength.split("-");
        const value = Math.max(1, parseInt(num2, 10));
        switch (unit) {
          case "day":
            return value;
          case "week":
            return value * 7;
          case "month":
            const future = addMonths(today, value);
            return differenceInCalendarDays(future, month) + 1;
          case "year":
            const futureYear = addYears(today, value);
            return differenceInCalendarDays(futureYear, month) + 1;
          default:
            return 7;
        }
      }
      return parseInt(upcomingLength, 10);
  }
}
function registerHandlebarsHelpers() {
  const regexTest = /^\/(.*)\/([gimuy]*)$/;
  function mathHelper(fn) {
    return (a, ...b) => {
      return b.map(Number).reduce(fn, Number(a));
    };
  }
  function regexHelper(mapRegex, mapNonRegex, apply2) {
    return (value, regex2, replace) => {
      if (value == null) {
        return null;
      }
      if (typeof regex2 !== "string" || typeof replace !== "string") {
        return "";
      }
      let regexp2;
      const match = regexTest.exec(regex2);
      if (match) {
        regexp2 = mapRegex(match[1], match[2]);
      } else {
        regexp2 = mapNonRegex(regex2);
      }
      return apply2(String(value), regexp2, replace);
    };
  }
  const helpers = {
    regex: regexHelper(
      (regex2, flags) => new RegExp(regex2, flags),
      (value) => new RegExp(value),
      (value, regex2, replace) => value.replace(regex2, replace)
    ),
    replace: regexHelper(
      (regex2, flags) => new RegExp(regex2, flags),
      (value) => value,
      (value, regex2, replace) => value.replace(regex2, replace)
    ),
    replaceAll: regexHelper(
      (regex2, flags) => new RegExp(regex2, flags),
      (value) => value,
      (value, regex2, replace) => value.replaceAll(regex2, replace)
    ),
    add: mathHelper((a, b) => a + b),
    sub: mathHelper((a, b) => a - b),
    div: mathHelper((a, b) => a / b),
    mul: mathHelper((a, b) => a * b),
    mod: mathHelper((a, b) => a % b),
    floor: (a) => Math.floor(Number(a)),
    ceil: (a) => Math.ceil(Number(a)),
    round: (a) => Math.round(Number(a)),
    abs: (a) => Math.abs(Number(a)),
    min: mathHelper((a, b) => Math.min(a, b)),
    max: mathHelper((a, b) => Math.max(a, b)),
    fixed: (a, digits) => Number(a).toFixed(Number(digits)),
    day: (date) => date && format(date, "d"),
    month: (date) => date && format(date, "M"),
    year: (date) => date && format(date, "yyyy"),
    format: (date, f2) => date && f2 && format(date, f2),
    addDays: (date, days) => {
      if (!date || !days) return date;
      return format(addDays(date, days), "yyyy-MM-dd");
    },
    subDays: (date, days) => {
      if (!date || !days) return date;
      return format(subDays(date, days), "yyyy-MM-dd");
    },
    addMonths: (date, months) => {
      if (!date || !months) return date;
      return format(d.addMonths(parseDate$1(date), months), "yyyy-MM-dd");
    },
    subMonths: (date, months) => {
      if (!date || !months) return date;
      return format(d.subMonths(parseDate$1(date), months), "yyyy-MM-dd");
    },
    addWeeks: (date, weeks) => {
      if (!date || !weeks) return date;
      return format(d.addWeeks(parseDate$1(date), weeks), "yyyy-MM-dd");
    },
    subWeeks: (date, weeks) => {
      if (!date || !weeks) return date;
      return format(d.subWeeks(parseDate$1(date), weeks), "yyyy-MM-dd");
    },
    addYears: (date, years) => {
      if (!date || !years) return date;
      return format(d.addYears(parseDate$1(date), years), "yyyy-MM-dd");
    },
    subYears: (date, years) => {
      if (!date || !years) return date;
      return format(d.subYears(parseDate$1(date), years), "yyyy-MM-dd");
    },
    setDay: (date, day) => {
      if (!date) return date;
      const actualDay = Number(format(date, "d"));
      return format(addDays(date, day - actualDay), "yyyy-MM-dd");
    },
    debug: (value) => {
      console.log(value);
    },
    concat: (...args) => args.join("")
  };
  for (const [name, fn] of Object.entries(helpers)) {
    Handlebars__namespace.registerHelper(name, (...args) => {
      return fn(...args.slice(0, -1));
    });
  }
}
registerHandlebarsHelpers();
function assert(test, type, msg) {
  if (!test) {
    throw new RuleError(type, msg);
  }
}
function parseRecurDate(desc) {
  try {
    const rules = recurConfigToRSchedule(desc);
    return {
      type: "recur",
      schedule: new standardDateAdapter.Schedule({
        rrules: rules,
        data: {
          skipWeekend: desc.skipWeekend,
          weekendSolve: desc.weekendSolveMode
        }
      })
    };
  } catch (e) {
    throw new RuleError("parse-recur-date", e.message);
  }
}
function parseDateString(str) {
  if (typeof str !== "string") {
    return null;
  } else if (str.length === 10) {
    if (!d__namespace.isValid(d__namespace.parseISO(str))) {
      return null;
    }
    return { type: "date", date: str };
  } else if (str.length === 7) {
    if (!d__namespace.isValid(d__namespace.parseISO(str + "-01"))) {
      return null;
    }
    return { type: "month", date: str };
  } else if (str.length === 4) {
    if (!d__namespace.isValid(d__namespace.parseISO(str + "-01-01"))) {
      return null;
    }
    return { type: "year", date: str };
  }
  return null;
}
function parseBetweenAmount(between) {
  const { num1, num2 } = between;
  if (typeof num1 !== "number" || typeof num2 !== "number") {
    return null;
  }
  return { type: "between", num1, num2 };
}
const CONDITION_TYPES = {
  date: {
    ops: ["is", "isapprox", "gt", "gte", "lt", "lte"],
    nullable: false,
    parse(op, value, fieldName) {
      const parsed = typeof value === "string" ? parseDateString(value) : value.frequency != null ? parseRecurDate(value) : null;
      assert(
        parsed,
        "date-format",
        `Invalid date format (field: ${fieldName})`
      );
      if (op === "isapprox") {
        assert(
          parsed.type === "date" || parsed.type === "recur",
          "date-format",
          `Invalid date value for “isapprox” (field: ${fieldName})`
        );
      } else if (op === "gt" || op === "gte" || op === "lt" || op === "lte") {
        assert(
          parsed.type === "date",
          "date-format",
          `Invalid date value for “${op}” (field: ${fieldName})`
        );
      }
      return parsed;
    }
  },
  id: {
    ops: [
      "is",
      "contains",
      "matches",
      "oneOf",
      "isNot",
      "doesNotContain",
      "notOneOf",
      "and",
      "onBudget",
      "offBudget"
    ],
    nullable: true,
    parse(op, value, fieldName) {
      if (op === "oneOf" || op === "notOneOf" || op === "and") {
        assert(
          Array.isArray(value),
          "no-empty-array",
          `oneOf must have an array value (field: ${fieldName})`
        );
        return value;
      }
      return value;
    }
  },
  string: {
    ops: [
      "is",
      "contains",
      "matches",
      "oneOf",
      "isNot",
      "doesNotContain",
      "notOneOf",
      "hasTags"
    ],
    nullable: true,
    parse(op, value, fieldName) {
      if (op === "oneOf" || op === "notOneOf") {
        assert(
          Array.isArray(value),
          "no-empty-array",
          `oneOf must have an array value (field: ${fieldName}): ${JSON.stringify(
            value
          )}`
        );
        return value.filter(Boolean).map((val2) => val2.toLowerCase());
      }
      assert(
        typeof value === "string",
        "not-string",
        `Invalid string value (field: ${fieldName})`
      );
      if (op === "contains" || op === "matches" || op === "doesNotContain" || op === "hasTags") {
        assert(
          value.length > 0,
          "no-empty-string",
          `${op} must have non-empty string (field: ${fieldName})`
        );
      }
      return value.toLowerCase();
    }
  },
  number: {
    ops: ["is", "isapprox", "isbetween", "gt", "gte", "lt", "lte"],
    nullable: false,
    parse(op, value, fieldName) {
      const parsed = typeof value === "number" ? { type: "literal", value } : parseBetweenAmount(value);
      assert(
        parsed != null,
        "not-number",
        `Value must be a number or between amount: ${JSON.stringify(
          value
        )} (field: ${fieldName})`
      );
      if (op === "isbetween") {
        assert(
          parsed.type === "between",
          "number-format",
          `Invalid between value for “${op}” (field: ${fieldName})`
        );
      } else {
        assert(
          parsed.type === "literal",
          "number-format",
          `Invalid number value for “${op}” (field: ${fieldName})`
        );
      }
      return parsed;
    }
  },
  boolean: {
    ops: ["is"],
    nullable: false,
    parse(op, value, fieldName) {
      assert(
        typeof value === "boolean",
        "not-boolean",
        `Value must be a boolean: ${value} (field: ${fieldName})`
      );
      return value;
    }
  }
};
class Condition {
  field;
  op;
  options;
  rawValue;
  type;
  unparsedValue;
  value;
  constructor(op, field, value, options) {
    const typeName = FIELD_TYPES.get(field);
    assert(typeName, "internal", "Invalid condition field: " + field);
    const type = CONDITION_TYPES[typeName];
    assert(
      type,
      "internal",
      `Invalid condition type: ${typeName} (field: ${field})`
    );
    assert(
      isValidOp(field, op),
      "internal",
      `Invalid condition operator: ${op} (type: ${typeName}, field: ${field})`
    );
    if (type.nullable !== true) {
      assert(value != null, "no-null", `Field cannot be empty: ${field}`);
    }
    if (typeName === "string" && type.nullable !== true) {
      assert(value !== "", "no-null", `Field cannot be empty: ${field}`);
    }
    this.rawValue = value;
    this.unparsedValue = value;
    this.op = op;
    this.field = field;
    this.value = type.parse ? type.parse(op, value, field) : value;
    this.options = options;
    this.type = typeName;
  }
  eval(object) {
    let fieldValue = object[this.field];
    const type = this.type;
    if (type === "string") {
      fieldValue ??= "";
    }
    if (fieldValue === void 0) {
      return false;
    }
    if (typeof fieldValue === "string") {
      fieldValue = fieldValue.toLowerCase();
    }
    if (type === "number" && this.options) {
      if (this.options.outflow) {
        if (fieldValue > 0) {
          return false;
        }
        fieldValue = -fieldValue;
      } else if (this.options.inflow) {
        if (fieldValue < 0) {
          return false;
        }
      }
    }
    const extractValue = (v) => type === "number" ? v.value : v;
    switch (this.op) {
      case "isapprox":
      case "is":
        if (type === "date") {
          if (fieldValue == null) {
            return false;
          }
          if (this.value.type === "recur") {
            const { schedule } = this.value;
            if (this.op === "isapprox") {
              const fieldDate = parseDate$1(fieldValue);
              return schedule.occursBetween(
                d__namespace.subDays(fieldDate, 2),
                d__namespace.addDays(fieldDate, 2)
              );
            } else {
              return schedule.occursOn({ date: parseDate$1(fieldValue) });
            }
          } else {
            const { date } = this.value;
            if (this.op === "isapprox") {
              const fullDate = parseDate$1(date);
              const high = addDays(fullDate, 2);
              const low = subDays(fullDate, 2);
              return fieldValue >= low && fieldValue <= high;
            } else {
              switch (this.value.type) {
                case "date":
                  return fieldValue === date;
                case "month":
                  return monthFromDate(fieldValue) === date;
                case "year":
                  return yearFromDate(fieldValue) === date;
              }
            }
          }
        } else if (type === "number") {
          const number2 = this.value.value;
          if (this.op === "isapprox") {
            const threshold = getApproxNumberThreshold(number2);
            return fieldValue >= number2 - threshold && fieldValue <= number2 + threshold;
          }
          return fieldValue === number2;
        }
        return fieldValue === this.value;
      case "isNot":
        return fieldValue !== this.value;
      case "isbetween": {
        const [low, high] = sortNumbers(this.value.num1, this.value.num2);
        return fieldValue >= low && fieldValue <= high;
      }
      case "contains":
        if (fieldValue === null) {
          return false;
        }
        return String(fieldValue).indexOf(this.value) !== -1;
      case "doesNotContain":
        if (fieldValue === null) {
          return false;
        }
        return String(fieldValue).indexOf(this.value) === -1;
      case "oneOf":
        if (fieldValue === null) {
          return false;
        }
        return this.value.indexOf(fieldValue) !== -1;
      case "hasTags":
        if (fieldValue === null) {
          return false;
        }
        return String(fieldValue).indexOf(this.value) !== -1;
      case "notOneOf":
        if (fieldValue === null) {
          return false;
        }
        return this.value.indexOf(fieldValue) === -1;
      case "gt":
        if (fieldValue === null) {
          return false;
        } else if (type === "date") {
          return isAfter(fieldValue, this.value.date);
        }
        return fieldValue > extractValue(this.value);
      case "gte":
        if (fieldValue === null) {
          return false;
        } else if (type === "date") {
          return fieldValue === this.value.date || isAfter(fieldValue, this.value.date);
        }
        return fieldValue >= extractValue(this.value);
      case "lt":
        if (fieldValue === null) {
          return false;
        } else if (type === "date") {
          return isBefore(fieldValue, this.value.date);
        }
        return fieldValue < extractValue(this.value);
      case "lte":
        if (fieldValue === null) {
          return false;
        } else if (type === "date") {
          return fieldValue === this.value.date || isBefore(fieldValue, this.value.date);
        }
        return fieldValue <= extractValue(this.value);
      case "matches":
        if (fieldValue === null) {
          return false;
        }
        try {
          return new RegExp(this.value).test(fieldValue);
        } catch (e) {
          console.log("invalid regexp in matches condition", e);
          return false;
        }
      case "onBudget":
        if (!object._account) {
          return false;
        }
        return object._account.offbudget === 0;
      case "offBudget":
        if (!object._account) {
          return false;
        }
        return object._account.offbudget === 1;
    }
    return false;
  }
  getValue() {
    return this.value;
  }
  serialize() {
    return {
      op: this.op,
      field: this.field,
      value: this.unparsedValue,
      type: this.type,
      ...this.options ? { options: this.options } : null
    };
  }
}
const ACTION_OPS = [
  "set",
  "set-split-amount",
  "link-schedule",
  "prepend-notes",
  "append-notes"
];
class Action {
  field;
  op;
  options;
  rawValue;
  type;
  value;
  handlebarsTemplate;
  constructor(op, field, value, options) {
    assert(
      ACTION_OPS.includes(op),
      "internal",
      `Invalid action operation: ${op}`
    );
    if (op === "set") {
      const typeName = FIELD_TYPES.get(field);
      assert(typeName, "internal", `Invalid field for action: ${field}`);
      this.field = field;
      this.type = typeName;
      if (options?.template) {
        this.handlebarsTemplate = Handlebars__namespace.compile(options.template, {
          noEscape: true
        });
        try {
          this.handlebarsTemplate({});
        } catch (e) {
          console.debug(e);
          assert(false, "invalid-template", `Invalid Handlebars template`);
        }
      }
    } else if (op === "set-split-amount") {
      this.field = null;
      this.type = "number";
    } else if (op === "link-schedule") {
      this.field = null;
      this.type = "id";
    } else if (op === "prepend-notes" || op === "append-notes") {
      this.field = "notes";
      this.type = "id";
    }
    if (field === "account") {
      assert(value, "no-null", `Field cannot be empty: ${field}`);
    }
    this.op = op;
    this.rawValue = value;
    this.value = value;
    this.options = options;
  }
  exec(object) {
    switch (this.op) {
      case "set":
        if (this.handlebarsTemplate) {
          object[this.field] = this.handlebarsTemplate({
            ...object,
            today: currentDay()
          });
          switch (this.type) {
            case "number":
              object[this.field] = parseFloat(object[this.field]);
              break;
            case "date":
              const parsed = parseDate$1(object[this.field]);
              if (parsed && d__namespace.isValid(parsed)) {
                object[this.field] = format(parsed, "yyyy-MM-dd");
              } else {
                console.error(
                  `rules: invalid date produced by template for field “${this.field}”:`,
                  object[this.field]
                );
                object[this.field] = "9999-12-31";
              }
              break;
            case "boolean":
              object[this.field] = object[this.field] === "true";
              break;
          }
        } else {
          object[this.field] = this.value;
        }
        if (this.field === "payee_name") {
          object["payee"] = "new";
        }
        break;
      case "set-split-amount":
        switch (this.options.method) {
          case "fixed-amount":
            object.amount = this.value;
            break;
        }
        break;
      case "link-schedule":
        object.schedule = this.value;
        break;
      case "prepend-notes":
        object[this.field] = object[this.field] ? this.value + object[this.field] : this.value;
        break;
      case "append-notes":
        object[this.field] = object[this.field] ? object[this.field] + this.value : this.value;
        break;
    }
  }
  serialize() {
    return {
      op: this.op,
      field: this.field,
      value: this.value,
      type: this.type,
      ...this.options ? { options: this.options } : null
    };
  }
}
function execNonSplitActions(actions, transaction2) {
  const update2 = transaction2;
  actions.forEach((action) => action.exec(update2));
  return update2;
}
function getSplitRemainder(transactions) {
  const { error } = recalculateSplit(groupTransaction(transactions));
  return error ? error.difference : 0;
}
function execSplitActions(actions, transaction2) {
  const splitAmountActions = actions.filter(
    (action) => action.op === "set-split-amount"
  );
  const { data } = splitTransaction(
    ungroupTransaction(transaction2),
    transaction2.id
  );
  let newTransactions = data;
  actions.forEach((action) => {
    const splitTransactionIndex = (action.options?.splitIndex ?? 0) + 1;
    if (splitTransactionIndex >= newTransactions.length) {
      const { data: data2 } = addSplitTransaction(newTransactions, transaction2.id);
      newTransactions = data2;
    }
    action.exec(newTransactions[splitTransactionIndex]);
  });
  const remainingAfterFixedAmounts = getSplitRemainder(newTransactions);
  splitAmountActions.filter((action) => action.options.method === "fixed-percent").forEach((action) => {
    const splitTransactionIndex = (action.options?.splitIndex ?? 0) + 1;
    const percent = action.value / 100;
    const amount = Math.round(remainingAfterFixedAmounts * percent);
    newTransactions[splitTransactionIndex].amount = amount;
  });
  const remainderActions = splitAmountActions.filter(
    (action) => action.options.method === "remainder"
  );
  const remainingAfterFixedPercents = getSplitRemainder(newTransactions);
  if (remainderActions.length !== 0) {
    const amountPerRemainderSplit = Math.round(
      remainingAfterFixedPercents / remainderActions.length
    );
    let lastNonFixedTransactionIndex = -1;
    remainderActions.forEach((action) => {
      const splitTransactionIndex = (action.options?.splitIndex ?? 0) + 1;
      newTransactions[splitTransactionIndex].amount = amountPerRemainderSplit;
      lastNonFixedTransactionIndex = Math.max(
        lastNonFixedTransactionIndex,
        splitTransactionIndex
      );
    });
    newTransactions[lastNonFixedTransactionIndex].amount += getSplitRemainder(newTransactions);
  }
  newTransactions.splice(1, 1);
  return recalculateSplit(groupTransaction(newTransactions));
}
function execActions(actions, transaction2) {
  const parentActions = actions.filter((action) => !action.options?.splitIndex);
  const childActions = actions.filter((action) => action.options?.splitIndex);
  const totalSplitCount = actions.reduce(
    (prev, cur) => Math.max(prev, cur.options?.splitIndex ?? 0),
    0
  ) + 1;
  const nonSplitResult = execNonSplitActions(parentActions, transaction2);
  if (totalSplitCount === 1) {
    return nonSplitResult;
  }
  if (nonSplitResult.is_child) {
    return nonSplitResult;
  }
  return execSplitActions(childActions, nonSplitResult);
}
class Rule {
  actions;
  conditions;
  conditionsOp;
  id;
  stage;
  constructor({
    id,
    stage,
    conditionsOp,
    conditions,
    actions
  }) {
    this.id = id;
    this.stage = stage ?? null;
    this.conditionsOp = conditionsOp;
    this.conditions = conditions.map(
      (c) => new Condition(c.op, c.field, c.value, c.options)
    );
    this.actions = actions.map(
      (a) => new Action(a.op, a.field, a.value, a.options)
    );
  }
  evalConditions(object) {
    if (this.conditions.length === 0) {
      return false;
    }
    const method = this.conditionsOp === "or" ? "some" : "every";
    return this.conditions[method]((condition) => {
      return condition.eval(object);
    });
  }
  execActions(object) {
    const result = execActions(this.actions, {
      ...object
    });
    const changes = Object.keys(result).reduce((prev, cur) => {
      if (result[cur] !== object[cur]) {
        prev[cur] = result[cur];
      }
      return prev;
    }, {});
    return changes;
  }
  exec(object) {
    if (this.evalConditions(object)) {
      return this.execActions(object);
    }
    return null;
  }
  // Apply is similar to exec but applies the changes for you
  apply(object) {
    const changes = this.exec(object);
    return Object.assign({}, object, changes);
  }
  getId() {
    return this.id;
  }
  serialize() {
    return {
      id: this.id,
      stage: this.stage,
      conditionsOp: this.conditionsOp,
      conditions: this.conditions.map((c) => c.serialize()),
      actions: this.actions.map((a) => a.serialize())
    };
  }
}
class RuleIndexer {
  field;
  method;
  rules;
  constructor({ field, method }) {
    this.field = field;
    this.method = method;
    this.rules = /* @__PURE__ */ new Map();
  }
  getIndex(key) {
    if (!this.rules.has(key)) {
      this.rules.set(key, /* @__PURE__ */ new Set());
    }
    return this.rules.get(key);
  }
  getIndexForValue(value) {
    return this.getIndex(this.getKey(value) || "*");
  }
  getKey(value) {
    if (typeof value === "string" && value !== "") {
      if (this.method === "firstchar") {
        return value[0].toLowerCase();
      }
      return value.toLowerCase();
    }
    return null;
  }
  getIndexes(rule) {
    const cond = rule.conditions.find((cond2) => cond2.field === this.field);
    const indexes = [];
    if (cond && (cond.op === "oneOf" || cond.op === "is" || cond.op === "isNot" || cond.op === "notOneOf")) {
      if (cond.op === "oneOf" || cond.op === "notOneOf") {
        cond.value.forEach((val2) => indexes.push(this.getIndexForValue(val2)));
      } else {
        indexes.push(this.getIndexForValue(cond.value));
      }
    } else {
      indexes.push(this.getIndex("*"));
    }
    return indexes;
  }
  index(rule) {
    const indexes = this.getIndexes(rule);
    indexes.forEach((index) => {
      index.add(rule);
    });
  }
  remove(rule) {
    const indexes = this.getIndexes(rule);
    indexes.forEach((index) => {
      index.delete(rule);
    });
  }
  getApplicableRules(object) {
    let indexedRules;
    if (this.field in object) {
      const key = this.getKey(object[this.field]);
      if (key) {
        indexedRules = this.rules.get(key);
      }
    }
    return fastSetMerge(
      indexedRules || /* @__PURE__ */ new Set(),
      this.rules.get("*") || /* @__PURE__ */ new Set()
    );
  }
}
const OP_SCORES = {
  is: 10,
  isNot: 10,
  oneOf: 9,
  notOneOf: 9,
  isapprox: 5,
  isbetween: 5,
  gt: 1,
  gte: 1,
  lt: 1,
  lte: 1,
  contains: 0,
  doesNotContain: 0,
  matches: 0,
  hasTags: 0,
  onBudget: 0,
  offBudget: 0
};
function computeScore(rule) {
  const initialScore = rule.conditions.reduce((score, condition) => {
    if (OP_SCORES[condition.op] == null) {
      console.log(`Found invalid operation while ranking: ${condition.op}`);
      return 0;
    }
    return score + OP_SCORES[condition.op];
  }, 0);
  if (rule.conditions.every(
    (cond) => cond.op === "is" || cond.op === "isNot" || cond.op === "isapprox" || cond.op === "oneOf" || cond.op === "notOneOf"
  )) {
    return initialScore * 2;
  }
  return initialScore;
}
function _rankRules(rules) {
  const scores = /* @__PURE__ */ new Map();
  rules.forEach((rule) => {
    scores.set(rule, computeScore(rule));
  });
  return [...rules].sort((r1, r2) => {
    const score1 = scores.get(r1);
    const score2 = scores.get(r2);
    if (score1 < score2) {
      return -1;
    } else if (score1 > score2) {
      return 1;
    } else {
      const id1 = r1.getId();
      const id2 = r2.getId();
      return id1 < id2 ? -1 : id1 > id2 ? 1 : 0;
    }
  });
}
function rankRules(rules) {
  let pre = [];
  let normal = [];
  let post2 = [];
  for (const rule of rules) {
    switch (rule.stage) {
      case "pre":
        pre.push(rule);
        break;
      case "post":
        post2.push(rule);
        break;
      default:
        normal.push(rule);
    }
  }
  pre = _rankRules(pre);
  normal = _rankRules(normal);
  post2 = _rankRules(post2);
  return pre.concat(normal).concat(post2);
}
function migrateIds(rule, mappings) {
  for (let ci = 0; ci < rule.conditions.length; ci++) {
    const cond = rule.conditions[ci];
    if (cond.type === "id") {
      switch (cond.op) {
        case "is":
          cond.value = mappings.get(cond.rawValue) || cond.rawValue;
          cond.unparsedValue = cond.value;
          break;
        case "isNot":
          cond.value = mappings.get(cond.rawValue) || cond.rawValue;
          cond.unparsedValue = cond.value;
          break;
        case "oneOf":
          cond.value = cond.rawValue.map((v) => mappings.get(v) || v);
          cond.unparsedValue = [...cond.value];
          break;
        case "notOneOf":
          cond.value = cond.rawValue.map((v) => mappings.get(v) || v);
          cond.unparsedValue = [...cond.value];
          break;
      }
    }
  }
  for (let ai = 0; ai < rule.actions.length; ai++) {
    const action = rule.actions[ai];
    if (action.type === "id") {
      if (action.op === "set") {
        action.value = mappings.get(action.rawValue) || action.rawValue;
      }
    }
  }
}
function iterateIds(rules, fieldName, func) {
  let i;
  ruleiter: for (i = 0; i < rules.length; i++) {
    const rule = rules[i];
    for (let ci = 0; ci < rule.conditions.length; ci++) {
      const cond = rule.conditions[ci];
      if (cond.type === "id" && cond.field === fieldName) {
        switch (cond.op) {
          case "is":
            if (func(rule, cond.value)) {
              continue ruleiter;
            }
            break;
          case "isNot":
            if (func(rule, cond.value)) {
              continue ruleiter;
            }
            break;
          case "oneOf":
            for (let vi = 0; vi < cond.value.length; vi++) {
              if (func(rule, cond.value[vi])) {
                continue ruleiter;
              }
            }
            break;
          case "notOneOf":
            for (let vi = 0; vi < cond.value.length; vi++) {
              if (func(rule, cond.value[vi])) {
                continue ruleiter;
              }
            }
            break;
        }
      }
    }
    for (let ai = 0; ai < rule.actions.length; ai++) {
      const action = rule.actions[ai];
      if (action.type === "id" && action.field === fieldName) {
        if (action.op === "set") {
          if (func(rule, action.value)) {
            break;
          }
        }
      }
    }
  }
}
let allRules;
let unlistenSync;
let firstcharIndexer;
let payeeIndexer;
function resetState() {
  allRules = /* @__PURE__ */ new Map();
  firstcharIndexer = new RuleIndexer({
    field: "imported_payee",
    method: "firstchar"
  });
  payeeIndexer = new RuleIndexer({ field: "payee" });
}
function invert(obj) {
  return Object.fromEntries(
    Object.entries(obj).map((entry) => {
      return [entry[1], entry[0]];
    })
  );
}
const internalFields = schemaConfig.views.transactions.fields;
const publicFields = invert(schemaConfig.views.transactions.fields);
function fromInternalField(obj) {
  return {
    ...obj,
    field: publicFields[obj.field] || obj.field
  };
}
function toInternalField(obj) {
  return {
    ...obj,
    field: internalFields[obj.field] || obj.field
  };
}
function parseArray(str) {
  let value;
  try {
    value = typeof str === "string" ? JSON.parse(str) : str;
  } catch (e) {
    throw new RuleError("internal", "Cannot parse rule json");
  }
  if (!Array.isArray(value)) {
    throw new RuleError("internal", "Rule json must be an array");
  }
  return value;
}
function parseConditionsOrActions(str) {
  return str ? parseArray(str).map((item) => fromInternalField(item)) : [];
}
function serializeConditionsOrActions(arr) {
  return JSON.stringify(arr.map((item) => toInternalField(item)));
}
const ruleModel = {
  validate(rule, { update: update2 } = {}) {
    requiredFields("rules", rule, ["conditions", "actions"], update2);
    if (!update2 || "stage" in rule) {
      if (rule.stage !== "pre" && rule.stage !== "post" && rule.stage !== null) {
        throw new Error("Invalid rule stage: " + rule.stage);
      }
    }
    if (!update2 || "conditionsOp" in rule) {
      if (!["and", "or"].includes(rule.conditionsOp)) {
        throw new Error("Invalid rule conditionsOp: " + rule.conditionsOp);
      }
    }
    return rule;
  },
  toJS(row) {
    const { conditions, conditions_op, actions, ...fields } = row;
    return {
      ...fields,
      conditionsOp: conditions_op,
      conditions: parseConditionsOrActions(conditions),
      actions: parseConditionsOrActions(actions)
    };
  },
  fromJS(rule) {
    const { conditions, conditionsOp, actions, ...row } = rule;
    if (conditionsOp) {
      row.conditions_op = conditionsOp;
    }
    if (Array.isArray(conditions)) {
      row.conditions = serializeConditionsOrActions(conditions);
    }
    if (Array.isArray(actions)) {
      row.actions = serializeConditionsOrActions(actions);
    }
    return row;
  }
};
function makeRule(data) {
  let rule;
  try {
    rule = new Rule(ruleModel.toJS(data));
  } catch (e) {
    console.warn("Invalid rule", e);
    if (e instanceof RuleError) {
      return null;
    }
    throw e;
  }
  migrateIds(rule, getMappings());
  return rule;
}
async function loadRules() {
  resetState();
  const rules = await all(`
    SELECT * FROM rules
      WHERE conditions IS NOT NULL AND actions IS NOT NULL AND tombstone = 0
  `);
  for (let i = 0; i < rules.length; i++) {
    const desc = rules[i];
    if (desc.stage === "cleanup" || desc.stage === "modify") {
      desc.stage = "pre";
    }
    const rule = makeRule(desc);
    if (rule) {
      allRules.set(rule.id, rule);
      firstcharIndexer.index(rule);
      payeeIndexer.index(rule);
    }
  }
  if (unlistenSync) {
    unlistenSync();
  }
  unlistenSync = addSyncListener(onApplySync$1);
}
function getRules$1() {
  return [...allRules.values()];
}
async function insertRule(rule) {
  rule = ruleModel.validate(rule);
  return insertWithUUID("rules", ruleModel.fromJS(rule));
}
async function updateRule$1(rule) {
  rule = ruleModel.validate(rule, { update: true });
  return update("rules", ruleModel.fromJS(rule));
}
async function deleteRule$1(id) {
  const schedule = await first(
    "SELECT id FROM schedules WHERE rule = ?",
    [id]
  );
  if (schedule) {
    return false;
  }
  await delete_("rules", id);
  return true;
}
function onApplySync$1(oldValues, newValues) {
  newValues.forEach((items, table) => {
    if (table === "rules") {
      items.forEach((newValue) => {
        const oldRule = allRules.get(newValue.id);
        if (newValue.tombstone === 1) {
          const rule = allRules.get(newValue.id);
          if (rule) {
            allRules.delete(rule.getId());
            firstcharIndexer.remove(rule);
            payeeIndexer.remove(rule);
          }
        } else {
          const rule = makeRule(newValue);
          if (rule) {
            if (oldRule) {
              firstcharIndexer.remove(oldRule);
              payeeIndexer.remove(oldRule);
            }
            allRules.set(newValue.id, rule);
            firstcharIndexer.index(rule);
            payeeIndexer.index(rule);
          }
        }
      });
    }
  });
  const tables = [...newValues.keys()];
  if (tables.find((table) => table.indexOf("mapping") !== -1)) {
    getRules$1().forEach((rule) => {
      migrateIds(rule, getMappings());
    });
  }
}
async function runRules$1(trans, accounts = null) {
  let accountsMap = null;
  if (accounts === null) {
    accountsMap = new Map(
      (await getAccounts$2()).map((account) => [account.id, account])
    );
  } else {
    accountsMap = accounts;
  }
  let finalTrans = await prepareTransactionForRules({ ...trans }, accountsMap);
  const rules = rankRules(
    fastSetMerge(
      firstcharIndexer.getApplicableRules(trans),
      payeeIndexer.getApplicableRules(trans)
    )
  );
  for (let i = 0; i < rules.length; i++) {
    finalTrans = rules[i].apply(finalTrans);
  }
  return await finalizeTransactionForRules(finalTrans);
}
function conditionSpecialCases(cond) {
  if (!cond) {
    return cond;
  }
  if (cond.op === "is" && cond.field === "category" && cond.value === null) {
    return new Condition(
      "and",
      cond.field,
      [
        cond,
        new Condition("is", "transfer", false, null),
        new Condition("is", "parent", false, null)
      ],
      {}
    );
  } else if (cond.op === "isNot" && cond.field === "category" && cond.value === null) {
    return new Condition(
      "and",
      cond.field,
      [cond, new Condition("is", "parent", false, null)],
      {}
    );
  }
  return cond;
}
function conditionsToAQL(conditions, { recurDateBounds = 100, applySpecialCases = true } = {}) {
  const errors = [];
  conditions = conditions.map((cond) => {
    if (cond instanceof Condition) {
      return cond;
    }
    try {
      return new Condition(cond.op, cond.field, cond.value, cond.options);
    } catch (e) {
      errors.push(e.type || "internal");
      console.log("conditionsToAQL: invalid condition: " + e.message);
      return null;
    }
  }).map((cond) => applySpecialCases ? conditionSpecialCases(cond) : cond).filter(Boolean);
  const mapConditionToActualQL = (cond) => {
    const { type, options } = cond;
    let { field, op, value } = cond;
    const getValue = (value2) => {
      if (type === "number") {
        return value2.value;
      }
      return value2;
    };
    if (field === "transfer" && op === "is") {
      field = "transfer_id";
      if (value) {
        op = "isNot";
        value = null;
      } else {
        value = null;
      }
    } else if (field === "parent" && op === "is") {
      field = "is_parent";
      if (value) {
        op = "true";
      } else {
        op = "false";
      }
    }
    const apply2 = (field2, op2, value2) => {
      if (type === "number") {
        if (options) {
          if (options.outflow) {
            return {
              $and: [
                { amount: { $lt: 0 } },
                { [field2]: { $transform: "$neg", [op2]: value2 } }
              ]
            };
          } else if (options.inflow) {
            return {
              $and: [{ amount: { $gt: 0 } }, { [field2]: { [op2]: value2 } }]
            };
          }
        }
        return { amount: { [op2]: value2 } };
      } else if (type === "string") {
        return { [field2]: { $transform: "$lower", [op2]: value2 } };
      } else if (type === "date") {
        return { [field2]: { [op2]: value2.date } };
      }
      return { [field2]: { [op2]: value2 } };
    };
    switch (op) {
      case "isapprox":
      case "is":
        if (type === "date") {
          if (value.type === "recur") {
            const dates = value.schedule.occurrences({ take: recurDateBounds }).toArray().map((d2) => dayFromDate(d2.date));
            return {
              $or: dates.map((d2) => {
                if (op === "isapprox") {
                  return {
                    $and: [
                      { date: { $gte: subDays(d2, 2) } },
                      { date: { $lte: addDays(d2, 2) } }
                    ]
                  };
                }
                return { date: d2 };
              })
            };
          } else {
            if (op === "isapprox") {
              const fullDate = parseDate$1(value.date);
              const high2 = addDays(fullDate, 2);
              const low2 = subDays(fullDate, 2);
              return {
                $and: [{ date: { $gte: low2 } }, { date: { $lte: high2 } }]
              };
            } else {
              switch (value.type) {
                case "date":
                  return { date: value.date };
                case "month": {
                  const low2 = value.date + "-00";
                  const high2 = value.date + "-99";
                  return {
                    $and: [{ date: { $gte: low2 } }, { date: { $lte: high2 } }]
                  };
                }
                case "year": {
                  const low2 = value.date + "-00-00";
                  const high2 = value.date + "-99-99";
                  return {
                    $and: [{ date: { $gte: low2 } }, { date: { $lte: high2 } }]
                  };
                }
              }
            }
          }
        } else if (type === "number") {
          const number2 = value.value;
          if (op === "isapprox") {
            const threshold = getApproxNumberThreshold(number2);
            return {
              $and: [
                apply2(field, "$gte", number2 - threshold),
                apply2(field, "$lte", number2 + threshold)
              ]
            };
          }
          return apply2(field, "$eq", number2);
        } else if (type === "string") {
          if (value === "") {
            return {
              $or: [apply2(field, "$eq", null), apply2(field, "$eq", "")]
            };
          }
        }
        return apply2(field, "$eq", value);
      case "isNot":
        return apply2(field, "$ne", value);
      case "isbetween":
        const [low, high] = sortNumbers(value.num1, value.num2);
        return {
          [field]: [{ $gte: low }, { $lte: high }]
        };
      case "contains":
        return apply2(
          type === "id" ? field + ".name" : field,
          "$like",
          "%" + value + "%"
        );
      case "matches":
        return apply2(type === "id" ? field + ".name" : field, "$regexp", value);
      case "doesNotContain":
        return apply2(
          type === "id" ? field + ".name" : field,
          "$notlike",
          "%" + value + "%"
        );
      case "oneOf":
        const values = value;
        if (values.length === 0) {
          return { id: null };
        }
        return { $or: values.map((v) => apply2(field, "$eq", v)) };
      case "hasTags":
        const words = value.split(/\s+/);
        const tagValues = [];
        words.forEach((word) => {
          const startsWithHash = word.startsWith("#");
          const containsMultipleHash = word.slice(1).includes("#");
          const correctlyFormatted = word.match(/#[\w\d\p{Emoji}-]+/gu);
          const validHashtag = startsWithHash && !containsMultipleHash && correctlyFormatted;
          if (validHashtag) {
            tagValues.push(word);
          }
        });
        return {
          $and: tagValues.map((v) => {
            const regex2 = new RegExp(
              `(^|\\s)${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`
            );
            return apply2(field, "$regexp", regex2.source);
          })
        };
      case "notOneOf":
        const notValues = value;
        if (notValues.length === 0) {
          return { id: null };
        }
        return { $and: notValues.map((v) => apply2(field, "$ne", v)) };
      case "gt":
        return apply2(field, "$gt", getValue(value));
      case "gte":
        return apply2(field, "$gte", getValue(value));
      case "lt":
        return apply2(field, "$lt", getValue(value));
      case "lte":
        return apply2(field, "$lte", getValue(value));
      case "true":
        return apply2(field, "$eq", true);
      case "false":
        return apply2(field, "$eq", false);
      case "and":
        return {
          $and: getValue(value).map((subExpr) => mapConditionToActualQL(subExpr))
        };
      case "onBudget":
        return { "account.offbudget": false };
      case "offBudget":
        return { "account.offbudget": true };
      default:
        throw new Error("Unhandled operator: " + op);
    }
  };
  const filters = conditions.map(mapConditionToActualQL);
  return { filters, errors };
}
async function applyActions(transactions, actions) {
  const parsedActions = actions.map((action) => {
    if (action instanceof Action) {
      return action;
    }
    try {
      if (action.op === "set-split-amount") {
        return new Action(action.op, null, action.value, action.options);
      } else if (action.op === "link-schedule") {
        return new Action(action.op, null, action.value, null);
      } else if (action.op === "prepend-notes" || action.op === "append-notes") {
        return new Action(action.op, null, action.value, null);
      }
      return new Action(
        action.op,
        action.field,
        action.value,
        action.options
      );
    } catch (e) {
      console.log("Action error", e);
      return null;
    }
  }).filter(Boolean);
  if (parsedActions.length !== actions.length) {
    return null;
  }
  const accounts = await getAccounts$2();
  const accountsMap = new Map(accounts.map((account) => [account.id, account]));
  const transactionsForRules = await Promise.all(
    transactions.map(
      (transactions2) => prepareTransactionForRules(transactions2, accountsMap)
    )
  );
  const updated = transactionsForRules.flatMap((trans) => {
    return ungroupTransaction(execActions(parsedActions, trans));
  });
  const finalized = [];
  for (const trans of updated) {
    finalized.push(await finalizeTransactionForRules(trans));
  }
  return batchUpdateTransactions({ updated: finalized });
}
function getRulesForPayee(payeeId) {
  const rules = /* @__PURE__ */ new Set();
  iterateIds(getRules$1(), "payee", (rule, id) => {
    if (id === payeeId) {
      rules.add(rule);
    }
  });
  return rankRules([...rules]);
}
function* getIsSetterRules(stage, condField, actionField, { condValue, actionValue }) {
  const rules = getRules$1();
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    if (rule.stage === stage && rule.actions.length === 1 && rule.actions[0].op === "set" && rule.actions[0].field === actionField && (actionValue === void 0 || rule.actions[0].value === actionValue) && rule.conditions.length === 1 && (rule.conditions[0].op === "is" || rule.conditions[0].op === "isNot") && rule.conditions[0].field === condField && (condValue === void 0 || rule.conditions[0].value === condValue)) {
      yield rule.serialize();
    }
  }
  return null;
}
function* getOneOfSetterRules(stage, condField, actionField, { condValue, actionValue }) {
  const rules = getRules$1();
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    if (rule.stage === stage && rule.actions.length === 1 && rule.actions[0].op === "set" && rule.actions[0].field === actionField && (actionValue == null || rule.actions[0].value === actionValue) && rule.conditions.length === 1 && (rule.conditions[0].op === "oneOf" || rule.conditions[0].op === "oneOf") && rule.conditions[0].field === condField && (condValue == null || rule.conditions[0].value.indexOf(condValue) !== -1)) {
      yield rule.serialize();
    }
  }
  return null;
}
async function updatePayeeRenameRule(fromNames, to) {
  const renameRule = getOneOfSetterRules("pre", "imported_payee", "payee", {
    actionValue: to
  }).next().value;
  if (renameRule) {
    const condition = renameRule.conditions[0];
    const newValue = [
      ...fastSetMerge(
        new Set(condition.value),
        new Set(fromNames.filter((name) => name !== ""))
      )
    ];
    const rule = {
      ...renameRule,
      conditions: [{ ...condition, value: newValue }]
    };
    await updateRule$1(rule);
    return renameRule.id;
  } else {
    const rule = new Rule({
      stage: "pre",
      conditionsOp: "and",
      conditions: [{ op: "oneOf", field: "imported_payee", value: fromNames }],
      actions: [{ op: "set", field: "payee", value: to }]
    });
    return insertRule(rule.serialize());
  }
}
function getProbableCategory(transactions) {
  const scores = /* @__PURE__ */ new Map();
  transactions.forEach((trans) => {
    if (trans.category) {
      scores.set(trans.category, (scores.get(trans.category) || 0) + 1);
    }
  });
  const winner = transactions.reduce((winner2, trans) => {
    const score = scores.get(trans.category);
    if (!winner2 || score > winner2.score) {
      return { score, category: trans.category };
    }
    return winner2;
  }, null);
  return winner.score >= 3 ? winner.category : null;
}
async function updateCategoryRules(transactions) {
  if (transactions.length === 0) {
    return;
  }
  const payeeIds = new Set(transactions.map((trans) => trans.payee));
  const transIds = new Set(transactions.map((trans) => trans.id));
  let oldestDate = null;
  for (let i = 0; i < transactions.length; i++) {
    if (oldestDate === null || transactions[i].date < oldestDate) {
      oldestDate = transactions[i].date;
    }
  }
  oldestDate = subDays(oldestDate, 180);
  const register = await all(
    `SELECT t.* FROM v_transactions t
     LEFT JOIN accounts a ON a.id = t.account
     LEFT JOIN payees p ON p.id = t.payee
     WHERE date >= ? AND date <= ? AND is_parent = 0 AND a.closed = 0 AND p.learn_categories = 1
     ORDER BY date DESC`,
    [toDateRepr(oldestDate), toDateRepr(addDays(currentDay(), 180))]
  );
  const allTransactions = partitionByField(register, "payee");
  const categoriesToSet = /* @__PURE__ */ new Map();
  for (const payeeId of payeeIds) {
    if (payeeId) {
      const latestTrans = (allTransactions.get(payeeId) || []).slice(0, 5);
      if (latestTrans.find((trans) => transIds.has(trans.id))) {
        const category = getProbableCategory(latestTrans);
        if (category) {
          categoriesToSet.set(payeeId, category);
        }
      }
    }
  }
  await batchMessages(async () => {
    for (const [payeeId, category] of categoriesToSet.entries()) {
      const ruleSetters = [
        ...getIsSetterRules(null, "payee", "category", {
          condValue: payeeId
        })
      ];
      if (ruleSetters.length > 0) {
        for (const rule of ruleSetters) {
          const action = rule.actions[0];
          if (action.value !== category) {
            await updateRule$1({
              ...rule,
              actions: [{ ...action, value: category }]
            });
          }
        }
      } else {
        const newRule = new Rule({
          stage: null,
          conditionsOp: "and",
          conditions: [{ op: "is", field: "payee", value: payeeId }],
          actions: [{ op: "set", field: "category", value: category }]
        });
        await insertRule(newRule.serialize());
      }
    }
  });
}
async function prepareTransactionForRules(trans, accounts = null) {
  const r = { ...trans };
  if (trans.payee) {
    const payee = await getPayee$1(trans.payee);
    if (payee) {
      r.payee_name = payee.name;
    }
  }
  if (trans.account) {
    if (accounts !== null && accounts.has(trans.account)) {
      r._account = accounts.get(trans.account);
    } else {
      r._account = await getAccount(trans.account);
    }
  }
  return r;
}
async function finalizeTransactionForRules(trans) {
  if ("payee_name" in trans) {
    if (trans.payee === "new") {
      if (trans.payee_name) {
        let payeeId = (await getPayeeByName(trans.payee_name))?.id;
        payeeId ??= await insertPayee({
          name: trans.payee_name
        });
        trans.payee = payeeId;
      } else {
        trans.payee = null;
      }
    }
    delete trans.payee_name;
  }
  return trans;
}
async function getPayee(acct) {
  return first("SELECT * FROM payees WHERE transfer_acct = ?", [
    acct
  ]);
}
async function getTransferredAccount(transaction2) {
  if (transaction2.payee) {
    const result = await first(
      "SELECT transfer_acct FROM v_payees WHERE id = ?",
      [transaction2.payee]
    );
    return result?.transfer_acct || null;
  }
  return null;
}
async function clearCategory(transaction2, transferAcct) {
  const { offbudget: fromOffBudget } = await first("SELECT offbudget FROM accounts WHERE id = ?", [transaction2.account]);
  const { offbudget: toOffBudget } = await first("SELECT offbudget FROM accounts WHERE id = ?", [transferAcct]);
  if (fromOffBudget === toOffBudget) {
    await updateTransaction$2({ id: transaction2.id, category: null });
    if (transaction2.transfer_id) {
      await updateTransaction$2({
        id: transaction2.transfer_id,
        category: null
      });
    }
    return true;
  }
  return false;
}
async function addTransfer(transaction2, transferredAccount) {
  if (transaction2.is_parent) {
    return null;
  }
  const { id: fromPayee } = await first(
    "SELECT id FROM payees WHERE transfer_acct = ?",
    [transaction2.account]
  );
  const transferTransaction = {
    account: transferredAccount,
    amount: -transaction2.amount,
    payee: fromPayee,
    date: transaction2.date,
    transfer_id: transaction2.id,
    notes: transaction2.notes || null,
    schedule: transaction2.schedule,
    cleared: false
  };
  const { notes, cleared } = await runRules$1(transferTransaction);
  const id = await insertTransaction({
    ...transferTransaction,
    notes,
    cleared
  });
  await updateTransaction$2({ id: transaction2.id, transfer_id: id });
  const categoryCleared = await clearCategory(transaction2, transferredAccount);
  return {
    id: transaction2.id,
    transfer_id: id,
    ...categoryCleared ? { category: null } : {}
  };
}
async function removeTransfer(transaction2) {
  const transferTrans = await getTransaction(transaction2.transfer_id);
  if (transferTrans) {
    if (transferTrans.is_child) {
      await updateTransaction$2({
        id: transaction2.transfer_id,
        transfer_id: null,
        payee: null
      });
    } else {
      await deleteTransaction$2({ id: transaction2.transfer_id });
    }
  }
  await updateTransaction$2({ id: transaction2.id, transfer_id: null });
  return { id: transaction2.id, transfer_id: null };
}
async function updateTransfer(transaction2, transferredAccount) {
  const payee = await getPayee(transaction2.account);
  await updateTransaction$2({
    id: transaction2.transfer_id,
    account: transferredAccount,
    // Make sure to update the payee on the other side in case the
    // user moved this transaction into another account
    payee: payee.id,
    date: transaction2.date,
    notes: transaction2.notes,
    amount: -transaction2.amount,
    schedule: transaction2.schedule
  });
  const categoryCleared = await clearCategory(transaction2, transferredAccount);
  if (categoryCleared) {
    return { id: transaction2.id, category: null };
  }
}
async function onInsert(transaction2) {
  const transferredAccount = await getTransferredAccount(transaction2);
  if (transferredAccount) {
    return addTransfer(transaction2, transferredAccount);
  }
}
async function onDelete(transaction2) {
  if (transaction2.transfer_id) {
    await removeTransfer(transaction2);
  }
}
async function onUpdate(transaction2) {
  const transferredAccount = await getTransferredAccount(transaction2);
  if (transaction2.is_parent) {
    return removeTransfer(transaction2);
  }
  if (transferredAccount && !transaction2.transfer_id) {
    return addTransfer(transaction2, transferredAccount);
  }
  if (!transferredAccount && transaction2.transfer_id) {
    return removeTransfer(transaction2);
  }
  if (transferredAccount && transaction2.transfer_id) {
    return updateTransfer(transaction2, transferredAccount);
  }
}
async function idsWithChildren(ids) {
  const whereIds = whereIn(ids, "parent_id");
  const rows = await all(
    `SELECT id FROM v_transactions_internal WHERE ${whereIds}`
  );
  const set = new Set(ids);
  for (const row of rows) {
    set.add(row.id);
  }
  return [...set];
}
async function getTransactionsByIds(ids) {
  return incrFetch(
    (query, params) => selectWithSchema("transactions", query, params),
    ids,
    // eslint-disable-next-line actual/typography
    (id) => `id = '${id}'`,
    (where) => `SELECT * FROM v_transactions_internal WHERE ${where}`
  );
}
async function batchUpdateTransactions({
  added,
  deleted,
  updated,
  learnCategories = false,
  detectOrphanPayees = true,
  runTransfers = true
}) {
  let addedIds = [];
  const updatedIds = updated ? updated.map((u) => u.id) : [];
  const deletedIds = deleted ? await idsWithChildren(deleted.map((d2) => d2.id)) : [];
  const oldPayees = /* @__PURE__ */ new Set();
  const accounts = await all(
    "SELECT * FROM accounts WHERE tombstone = 0"
  );
  if (updated) {
    const descUpdatedIds = updated.filter((update2) => update2.payee).map((update2) => update2.id);
    const transactions = await getTransactionsByIds(descUpdatedIds);
    for (let i = 0; i < transactions.length; i++) {
      oldPayees.add(transactions[i].payee);
    }
  }
  await batchMessages(async () => {
    if (added) {
      addedIds = await Promise.all(
        added.map(async (t) => {
          const account = accounts.find((acct) => acct.id === t.account);
          if (t.is_parent || account.offbudget === 1) {
            t.category = null;
          }
          return insertTransaction(t);
        })
      );
    }
    if (deleted) {
      await Promise.all(
        // It's important to use `deletedIds` and not `deleted` here
        // because we've expanded it to include children above. The
        // inconsistency of the delete APIs is annoying and should
        // be fixed (it should only take an id)
        deletedIds.map(async (id) => {
          await deleteTransaction$2({ id });
        })
      );
    }
    if (updated) {
      await Promise.all(
        updated.map(async (t) => {
          if (t.account) {
            const account = accounts.find((acct) => acct.id === t.account);
            if (t.is_parent || account.offbudget === 1) {
              t.category = null;
            }
          }
          await updateTransaction$2(t);
        })
      );
    }
  });
  const allAdded = await getTransactionsByIds(addedIds);
  const allUpdated = await getTransactionsByIds(updatedIds);
  const allDeleted = await getTransactionsByIds(deletedIds);
  const resultAdded = allAdded;
  const resultUpdated = allUpdated;
  let transfersUpdated;
  if (runTransfers) {
    await batchMessages(async () => {
      await Promise.all(allAdded.map((t) => onInsert(t)));
      transfersUpdated = (await Promise.all(allUpdated.map((t) => onUpdate(t)))).filter(Boolean);
      await Promise.all(allDeleted.map((t) => onDelete(t)));
    });
  }
  if (learnCategories) {
    const ids = /* @__PURE__ */ new Set([
      ...added ? added.filter((add) => add.category).map((add) => add.id) : [],
      ...updated ? updated.filter((update2) => update2.category).map((update2) => update2.id) : []
    ]);
    await updateCategoryRules(
      allAdded.concat(allUpdated).filter((trans) => ids.has(trans.id))
    );
  }
  if (detectOrphanPayees) {
    if (updated) {
      const newPayeeIds = updated.map((u) => u.payee).filter(Boolean);
      if (newPayeeIds.length > 0) {
        const allOrphaned = new Set(await getOrphanedPayees$1());
        [...oldPayees].filter((id) => allOrphaned.has(id));
      }
    }
  }
  return {
    added: resultAdded,
    updated: runTransfers ? transfersUpdated : resultUpdated,
    deleted: allDeleted
  };
}
const mappingsFromString = (str) => {
  try {
    const parsed = JSON.parse(str);
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("Invalid mapping format");
    }
    return new Map(
      Object.entries(parsed).map(([key, value]) => [
        key,
        new Map(Object.entries(value))
      ])
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : e;
    throw new Error(`Failed to parse mapping: ${message}`);
  }
};
const defaultMappings = /* @__PURE__ */ new Map([
  [
    "payment",
    /* @__PURE__ */ new Map([
      ["date", "date"],
      ["payee", "payeeName"],
      ["notes", "notes"]
    ])
  ],
  [
    "deposit",
    /* @__PURE__ */ new Map([
      ["date", "date"],
      ["payee", "payeeName"],
      ["notes", "notes"]
    ])
  ]
]);
const conjunctions = [
  "for",
  //
  "and",
  "nor",
  "but",
  "or",
  "yet",
  "so"
];
const articles = [
  "a",
  //
  "an",
  "the"
];
const prepositions = [
  "aboard",
  "about",
  "above",
  "across",
  "after",
  "against",
  "along",
  "amid",
  "among",
  "anti",
  "around",
  "as",
  "at",
  "before",
  "behind",
  "below",
  "beneath",
  "beside",
  "besides",
  "between",
  "beyond",
  "but",
  "by",
  "concerning",
  "considering",
  "despite",
  "down",
  "during",
  "except",
  "excepting",
  "excluding",
  "following",
  "for",
  "from",
  "in",
  "inside",
  "into",
  "like",
  "minus",
  "near",
  "of",
  "off",
  "on",
  "onto",
  "opposite",
  "over",
  "past",
  "per",
  "plus",
  "regarding",
  "round",
  "save",
  "since",
  "than",
  "through",
  "to",
  "toward",
  "towards",
  "under",
  "underneath",
  "unlike",
  "until",
  "up",
  "upon",
  "versus",
  "via",
  "with",
  "within",
  "without"
];
const lowerCaseSet = /* @__PURE__ */ new Set([
  ...conjunctions,
  ...articles,
  ...prepositions
]);
const specials = [
  "CLI",
  "API",
  "HTTP",
  "HTTPS",
  "JSX",
  "DNS",
  "URL",
  "CI",
  "CDN",
  "GitHub",
  "CSS",
  "JS",
  "JavaScript",
  "TypeScript",
  "HTML",
  "WordPress",
  "JavaScript",
  "Next.js",
  "Node.js"
];
const character = "[0-9A-Za-zªµºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮͰ-ʹͶ-ͷͺ-ͽΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁҊ-ԣԱ-Ֆՙա-ևא-תװ-ײء-يٮ-ٯٱ-ۓەۥ-ۦۮ-ۯۺ-ۼۿܐܒ-ܯݍ-ޥޱߊ-ߪߴ-ߵߺऄ-हऽॐक़-ॡॱ-ॲॻ-ॿঅ-ঌএ-ঐও-নপ-রলশ-হঽৎড়-ঢ়য়-ৡৰ-ৱਅ-ਊਏ-ਐਓ-ਨਪ-ਰਲ-ਲ਼ਵ-ਸ਼ਸ-ਹਖ਼-ੜਫ਼ੲ-ੴઅ-ઍએ-ઑઓ-નપ-રલ-ળવ-હઽૐૠ-ૡଅ-ଌଏ-ଐଓ-ନପ-ରଲ-ଳଵ-ହଽଡ଼-ଢ଼ୟ-ୡୱஃஅ-ஊஎ-ஐஒ-கங-சஜஞ-டண-தந-பம-ஹௐఅ-ఌఎ-ఐఒ-నప-ళవ-హఽౘ-ౙౠ-ౡಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹಽೞೠ-ೡഅ-ഌഎ-ഐഒ-നപ-ഹഽൠ-ൡൺ-ൿඅ-ඖක-නඳ-රලව-ෆก-ะา-ำเ-ๆກ-ຂຄງ-ຈຊຍດ-ທນ-ຟມ-ຣລວສ-ຫອ-ະາ-ຳຽເ-ໄໆໜ-ໝༀཀ-ཇཉ-ཬྈ-ྋက-ဪဿၐ-ၕၚ-ၝၡၥ-ၦၮ-ၰၵ-ႁႎႠ-Ⴥა-ჺჼᄀ-ᅙᅟ-ᆢᆨ-ᇹሀ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚᎀ-ᎏᎠ-Ᏼᐁ-ᙬᙯ-ᙶᚁ-ᚚᚠ-ᛪᛮ-ᛰᜀ-ᜌᜎ-ᜑᜠ-ᜱᝀ-ᝑᝠ-ᝬᝮ-ᝰក-ឳៗៜᠠ-ᡷᢀ-ᢨᢪᤀ-ᤜᥐ-ᥭᥰ-ᥴᦀ-ᦩᧁ-ᧇᨀ-ᨖᬅ-ᬳᭅ-ᭋᮃ-ᮠᮮ-ᮯᰀ-ᰣᱍ-ᱏᱚ-ᱽᴀ-ᶿḀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼⁱⁿₐ-ₔℂℇℊ-ℓℕℙ-ℝℤΩℨK-ℭℯ-ℹℼ-ℿⅅ-ⅉⅎⅠ-ↈⰀ-Ⱞⰰ-ⱞⱠ-Ɐⱱ-ⱽⲀ-ⳤⴀ-ⴥⴰ-ⵥⵯⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞⸯ々-〇〡-〩〱-〵〸-〼ぁ-ゖゝ-ゟァ-ヺー-ヿㄅ-ㄭㄱ-ㆎㆠ-ㆷㇰ-ㇿ㐀䶵一鿃ꀀ-ꒌꔀ-ꘌꘐ-ꘟꘪ-ꘫꙀ-ꙟꙢ-ꙮꙿ-ꚗꜗ-ꜟꜢ-ꞈꞋ-ꞌꟻ-ꠁꠃ-ꠅꠇ-ꠊꠌ-ꠢꡀ-ꡳꢂ-ꢳꤊ-ꤥꤰ-ꥆꨀ-ꨨꩀ-ꩂꩄ-ꩋ가힣豈-鶴侮-頻並-龎ﬀ-ﬆﬓ-ﬗיִײַ-ﬨשׁ-זּטּ-לּמּנּ-סּףּ-פּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﹰ-ﹴﹶ-ﻼＡ-Ｚａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ]";
const regex = new RegExp(
  `(?:(?:(\\s?(?:^|[.\\(\\)!?;:"-])\\s*)(${character}))|(${character}))(${character}*[’']*${character}*)`,
  "g"
);
const convertToRegExp = (specials2) => specials2.map((s) => [new RegExp(`\\b${s}\\b`, "gi"), s]);
function parseMatch(match) {
  const firstCharacter = match[0];
  if (/\s/.test(firstCharacter)) {
    return match.substr(1);
  }
  if (/[()]/.test(firstCharacter)) {
    return null;
  }
  return match;
}
function title(str, options = { special: void 0 }) {
  str = str.toLowerCase().replace(regex, (m, lead = "", forced, lower, rest) => {
    const parsedMatch = parseMatch(m);
    if (!parsedMatch) {
      return m;
    }
    if (!forced) {
      const fullLower = lower + rest;
      if (lowerCaseSet.has(fullLower)) {
        return parsedMatch;
      }
    }
    return lead + (lower || forced).toUpperCase() + rest;
  });
  const customSpecials = options.special || [];
  const replace = [...specials, ...customSpecials];
  const replaceRegExp = convertToRegExp(replace);
  replaceRegExp.forEach(([pattern, s]) => {
    str = str.replace(pattern, s);
  });
  return str;
}
function BankSyncError2(type, code, details) {
  return { type: "BankSyncError", category: type, code, details };
}
function makeSplitTransaction(trans, subtransactions) {
  const { subtransactions: sub, ...parent } = recalculateSplit({
    ...trans,
    is_parent: true,
    subtransactions: subtransactions.map(
      (transaction2, idx) => makeChild(trans, {
        ...transaction2,
        sort_order: 0 - idx
      })
    )
  });
  return [parent, ...sub];
}
async function updateAccountBalance(id, balance) {
  await runQuery("UPDATE accounts SET balance_current = ? WHERE id = ?", [
    balance,
    id
  ]);
}
async function getAccountOldestTransaction(id) {
  return (await aqlQuery(
    q("transactions").filter({
      account: id,
      date: { $lte: currentDay() }
    }).select("date").orderBy("date").limit(1)
  )).data?.[0];
}
async function getAccountSyncStartDate(id) {
  const dates = [subDays(currentDay(), 90)];
  const oldestTransaction = await getAccountOldestTransaction(id);
  if (oldestTransaction) dates.push(oldestTransaction.date);
  return dayFromDate(
    d__namespace.max(dates.map((d2) => parseDate$1(d2)))
  );
}
async function downloadGoCardlessTransactions(userId, userKey, acctId, bankId, since, includeBalance = true) {
  const userToken = await getItem("user-token");
  if (!userToken) return;
  console.log("Pulling transactions from GoCardless");
  const res = await post(
    getServer().GOCARDLESS_SERVER + "/transactions",
    {
      userId,
      key: userKey,
      requisitionId: bankId,
      accountId: acctId,
      startDate: since,
      includeBalance
    },
    {
      "X-ACTUAL-TOKEN": userToken
    }
  );
  if (res.error_code) {
    const errorDetails = {
      rateLimitHeaders: res.rateLimitHeaders
    };
    throw BankSyncError2(res.error_type, res.error_code, errorDetails);
  }
  if (includeBalance) {
    const {
      transactions: { all: all2 },
      balances,
      startingBalance
    } = res;
    console.log("Response:", res);
    return {
      transactions: all2,
      accountBalance: balances,
      startingBalance
    };
  } else {
    console.log("Response:", res);
    return {
      transactions: res.transactions.all
    };
  }
}
async function downloadSimpleFinTransactions(acctId, since) {
  const userToken = await getItem("user-token");
  if (!userToken) return;
  const batchSync = Array.isArray(acctId);
  console.log("Pulling transactions from SimpleFin");
  let res;
  try {
    res = await post(
      getServer().SIMPLEFIN_SERVER + "/transactions",
      {
        accountId: acctId,
        startDate: since
      },
      {
        "X-ACTUAL-TOKEN": userToken
      },
      // 5 minute timeout for batch sync, one minute for individual accounts
      Array.isArray(acctId) ? 3e5 : 6e4
    );
  } catch (error) {
    console.error("Suspected timeout during bank sync:", error);
    throw BankSyncError2("TIMED_OUT", "TIMED_OUT");
  }
  if (Object.keys(res).length === 0) {
    throw BankSyncError2("NO_DATA", "NO_DATA");
  }
  if (res.error_code) {
    throw BankSyncError2(res.error_type, res.error_code);
  }
  let retVal = {};
  if (batchSync) {
    for (const [accountId, data] of Object.entries(
      res
    )) {
      if (accountId === "errors") continue;
      const error = res?.errors?.[accountId]?.[0];
      retVal[accountId] = {
        transactions: data?.transactions?.all,
        accountBalance: data?.balances,
        startingBalance: data?.startingBalance
      };
      if (error) {
        retVal[accountId].error_type = error.error_type;
        retVal[accountId].error_code = error.error_code;
      }
    }
  } else {
    const singleRes = res;
    retVal = {
      transactions: singleRes.transactions.all,
      accountBalance: singleRes.balances,
      startingBalance: singleRes.startingBalance
    };
  }
  console.log("Response:", retVal);
  return retVal;
}
async function downloadPluggyAiTransactions(acctId, since) {
  const userToken = await getItem("user-token");
  if (!userToken) return;
  console.log("Pulling transactions from Pluggy.ai");
  const res = await post(
    getServer().PLUGGYAI_SERVER + "/transactions",
    {
      accountId: acctId,
      startDate: since
    },
    {
      "X-ACTUAL-TOKEN": userToken
    },
    6e4
  );
  if (res.error_code) {
    throw BankSyncError2(res.error_type, res.error_code);
  } else if ("error" in res) {
    throw BankSyncError2("Connection", res.error);
  }
  let retVal = {};
  const singleRes = res;
  retVal = {
    transactions: singleRes.transactions.all,
    accountBalance: singleRes.balances,
    startingBalance: singleRes.startingBalance
  };
  console.log("Response:", retVal);
  return retVal;
}
async function resolvePayee(trans, payeeName, payeesToCreate) {
  if (trans.payee == null && payeeName) {
    let payee = payeesToCreate.get(payeeName.toLowerCase());
    payee = payee || await getPayeeByName(payeeName);
    if (payee != null) {
      return payee.id;
    } else {
      const newPayee = { id: uuid.v4(), name: payeeName };
      payeesToCreate.set(payeeName.toLowerCase(), newPayee);
      return newPayee.id;
    }
  }
  return trans.payee;
}
async function normalizeTransactions(transactions, acctId, { rawPayeeName = false } = {}) {
  const payeesToCreate = /* @__PURE__ */ new Map();
  const normalized = [];
  for (let trans of transactions) {
    if (trans.date == null) {
      throw new Error("`date` is required when adding a transaction");
    }
    const { payee_name: originalPayeeName, subtransactions, ...rest } = trans;
    trans = rest;
    let payee_name = originalPayeeName;
    if (payee_name) {
      const trimmed = payee_name.trim();
      if (trimmed === "") {
        payee_name = null;
      } else {
        payee_name = rawPayeeName ? trimmed : title(trimmed);
      }
    }
    trans.imported_payee = trans.imported_payee || payee_name;
    if (trans.imported_payee) {
      trans.imported_payee = trans.imported_payee.trim();
    }
    trans.account = acctId;
    trans.payee = await resolvePayee(trans, payee_name, payeesToCreate);
    trans.category = trans.category ?? null;
    normalized.push({
      payee_name,
      subtransactions: subtransactions ? subtransactions.map((t) => ({ ...t, account: acctId })) : null,
      trans
    });
  }
  return { normalized, payeesToCreate };
}
async function normalizeBankSyncTransactions(transactions, acctId) {
  const payeesToCreate = /* @__PURE__ */ new Map();
  const [customMappingsRaw, importPending, importNotes] = await Promise.all([
    aqlQuery(
      q("preferences").filter({ id: `custom-sync-mappings-${acctId}` }).select("value")
    ).then((data) => data?.data?.[0]?.value),
    aqlQuery(
      q("preferences").filter({ id: `sync-import-pending-${acctId}` }).select("value")
    ).then((data) => String(data?.data?.[0]?.value ?? "true") === "true"),
    aqlQuery(
      q("preferences").filter({ id: `sync-import-notes-${acctId}` }).select("value")
    ).then((data) => String(data?.data?.[0]?.value ?? "true") === "true")
  ]);
  const mappings = customMappingsRaw ? mappingsFromString(customMappingsRaw) : defaultMappings;
  const normalized = [];
  for (const trans of transactions) {
    trans.cleared = Boolean(trans.booked);
    if (!importPending && !trans.cleared) continue;
    if (!trans.amount) {
      trans.amount = trans.transactionAmount.amount;
    }
    const mapping = mappings.get(trans.amount <= 0 ? "payment" : "deposit");
    const date = trans[mapping.get("date")] ?? trans.date;
    const payeeName = trans[mapping.get("payee")];
    const notes = trans[mapping.get("notes")];
    if (date == null) {
      throw new Error("`date` is required when adding a transaction");
    }
    if (payeeName == null) {
      throw new Error("`payeeName` is required when adding a transaction");
    }
    trans.imported_payee = trans.imported_payee || payeeName;
    if (trans.imported_payee) {
      trans.imported_payee = trans.imported_payee.trim();
    }
    let imported_id = trans.transactionId;
    if (trans.cleared && !trans.transactionId && trans.internalTransactionId) {
      imported_id = `${trans.account}-${trans.internalTransactionId}`;
    }
    trans.account = acctId;
    trans.payee = await resolvePayee(trans, payeeName, payeesToCreate);
    normalized.push({
      payee_name: payeeName,
      trans: {
        amount: amountToInteger$1(trans.amount),
        payee: trans.payee,
        account: trans.account,
        date,
        notes: importNotes && notes ? notes.trim().replace(/#/g, "##") : null,
        category: trans.category ?? null,
        imported_id,
        imported_payee: trans.imported_payee,
        cleared: trans.cleared,
        raw_synced_data: JSON.stringify(trans)
      }
    });
  }
  return { normalized, payeesToCreate };
}
async function createNewPayees(payeesToCreate, addsAndUpdates) {
  const usedPayeeIds = new Set(addsAndUpdates.map((t) => t.payee));
  await batchMessages(async () => {
    for (const payee of payeesToCreate.values()) {
      if (usedPayeeIds.has(payee.id)) {
        await insertPayee(payee);
      }
    }
  });
}
async function reconcileTransactions(acctId, transactions, isBankSyncAccount = false, strictIdChecking = true, isPreview = false, defaultCleared = true) {
  console.log("Performing transaction reconciliation");
  const updated = [];
  const added = [];
  const updatedPreview = [];
  const existingPayeeMap = /* @__PURE__ */ new Map();
  const {
    payeesToCreate,
    transactionsStep1,
    transactionsStep2,
    transactionsStep3
  } = await matchTransactions(
    acctId,
    transactions,
    isBankSyncAccount,
    strictIdChecking
  );
  for (const { trans, subtransactions, match } of transactionsStep3) {
    if (match && !trans.forceAddTransaction) {
      if (match.reconciled) {
        updatedPreview.push({ transaction: trans, ignored: true });
        continue;
      }
      const existing = {
        ...match,
        cleared: match.cleared === 1,
        date: fromDateRepr(match.date)
      };
      const updates = {
        imported_id: trans.imported_id || null,
        payee: existing.payee || trans.payee || null,
        category: existing.category || trans.category || null,
        imported_payee: trans.imported_payee || null,
        notes: existing.notes || trans.notes || null,
        cleared: trans.cleared ?? existing.cleared,
        raw_synced_data: existing.raw_synced_data ?? trans.raw_synced_data ?? null
      };
      const fieldsToMarkUpdated = Object.keys(updates).filter((k) => {
        if (!existing.raw_synced_data && !trans.raw_synced_data) {
          return k !== "raw_synced_data";
        }
        return true;
      });
      if (hasFieldsChanged(existing, updates, fieldsToMarkUpdated)) {
        updated.push({ id: existing.id, ...updates });
        if (!existingPayeeMap.has(existing.payee)) {
          const payee = await getPayee$1(existing.payee);
          existingPayeeMap.set(existing.payee, payee?.name);
        }
        existing.payee_name = existingPayeeMap.get(existing.payee);
        existing.amount = integerToAmount(existing.amount);
        updatedPreview.push({ transaction: trans, existing });
      } else {
        updatedPreview.push({ transaction: trans, ignored: true });
      }
      if (existing.is_parent && existing.cleared !== updates.cleared) {
        const children = await all(
          "SELECT id FROM v_transactions WHERE parent_id = ?",
          [existing.id]
        );
        for (const child of children) {
          updated.push({ id: child.id, cleared: updates.cleared });
        }
      }
    } else {
      const { forceAddTransaction, ...newTrans } = trans;
      const finalTransaction = {
        ...newTrans,
        id: uuid.v4(),
        category: trans.category || null,
        cleared: trans.cleared ?? defaultCleared
      };
      if (subtransactions && subtransactions.length > 0) {
        added.push(...makeSplitTransaction(finalTransaction, subtransactions));
      } else {
        added.push(finalTransaction);
      }
    }
  }
  const now = Date.now();
  added.forEach((t, index) => {
    t.sort_order ??= now - index;
  });
  if (!isPreview) {
    await createNewPayees(payeesToCreate, [...added, ...updated]);
    await batchUpdateTransactions({ added, updated });
  }
  console.log("Debug data for the operations:", {
    transactionsStep1,
    transactionsStep2,
    transactionsStep3,
    added,
    updated,
    updatedPreview
  });
  return {
    added: added.map((trans) => trans.id),
    updated: updated.map((trans) => trans.id),
    updatedPreview
  };
}
async function matchTransactions(acctId, transactions, isBankSyncAccount = false, strictIdChecking = true) {
  console.log("Performing transaction reconciliation matching");
  const reimportDeleted = await aqlQuery(
    q("preferences").filter({ id: `sync-reimport-deleted-${acctId}` }).select("value")
  ).then((data) => String(data?.data?.[0]?.value ?? "true") === "true");
  const hasMatched = /* @__PURE__ */ new Set();
  const transactionNormalization = isBankSyncAccount ? normalizeBankSyncTransactions : normalizeTransactions;
  const { normalized, payeesToCreate } = await transactionNormalization(
    transactions,
    acctId
  );
  const accounts = await getAccounts$2();
  const accountsMap = new Map(accounts.map((account) => [account.id, account]));
  const transactionsStep1 = [];
  for (const {
    payee_name,
    trans: originalTrans,
    subtransactions
  } of normalized) {
    const trans = await runRules$1(originalTrans, accountsMap);
    let match = null;
    let fuzzyDataset = null;
    if (trans.imported_id) {
      const table = reimportDeleted ? "v_transactions" : "v_transactions_internal";
      match = await first(
        `SELECT * FROM ${table} WHERE imported_id = ? AND account = ?`,
        [trans.imported_id, acctId]
      );
      if (match) {
        hasMatched.add(match.id);
      }
    }
    if (!match) {
      const sevenDaysBefore = toDateRepr(subDays(trans.date, 7));
      const sevenDaysAfter = toDateRepr(addDays(trans.date, 7));
      if (strictIdChecking) {
        fuzzyDataset = await all(
          `SELECT id, is_parent, date, imported_id, payee, imported_payee, category, notes, reconciled, cleared, amount
          FROM v_transactions
          WHERE
            -- If both ids are set, and we didn't match earlier then skip dedup
            (imported_id IS NULL OR ? IS NULL)
            AND date >= ? AND date <= ? AND amount = ?
            AND account = ?`,
          [
            trans.imported_id || null,
            sevenDaysBefore,
            sevenDaysAfter,
            trans.amount || 0,
            acctId
          ]
        );
      } else {
        fuzzyDataset = await all(
          `SELECT id, is_parent, date, imported_id, payee, imported_payee, category, notes, reconciled, cleared, amount
          FROM v_transactions
          WHERE date >= ? AND date <= ? AND amount = ? AND account = ?`,
          [sevenDaysBefore, sevenDaysAfter, trans.amount || 0, acctId]
        );
      }
      fuzzyDataset = fuzzyDataset.sort((a, b) => {
        const aDistance = Math.abs(
          d__namespace.differenceInMilliseconds(
            d__namespace.parseISO(trans.date),
            d__namespace.parseISO(fromDateRepr(a.date))
          )
        );
        const bDistance = Math.abs(
          d__namespace.differenceInMilliseconds(
            d__namespace.parseISO(trans.date),
            d__namespace.parseISO(fromDateRepr(b.date))
          )
        );
        return aDistance > bDistance ? 1 : -1;
      });
    }
    transactionsStep1.push({
      payee_name,
      trans,
      subtransactions: trans.subtransactions || subtransactions,
      match,
      fuzzyDataset
    });
  }
  const transactionsStep2 = transactionsStep1.map((data) => {
    if (!data.match && data.fuzzyDataset) {
      const match = data.fuzzyDataset.find(
        (row) => !hasMatched.has(row.id) && data.trans.payee === row.payee
      );
      if (match) {
        hasMatched.add(match.id);
        return { ...data, match };
      }
    }
    return data;
  });
  const transactionsStep3 = transactionsStep2.map((data) => {
    if (!data.match && data.fuzzyDataset) {
      const match = data.fuzzyDataset.find((row) => !hasMatched.has(row.id));
      if (match) {
        hasMatched.add(match.id);
        return { ...data, match };
      }
    }
    return data;
  });
  return {
    payeesToCreate,
    transactionsStep1,
    transactionsStep2,
    transactionsStep3
  };
}
async function addTransactions$1(acctId, transactions, { runTransfers = true, learnCategories = false } = {}) {
  const added = [];
  const { normalized, payeesToCreate } = await normalizeTransactions(
    transactions,
    acctId,
    { rawPayeeName: true }
  );
  const accounts = await getAccounts$2();
  const accountsMap = new Map(accounts.map((account) => [account.id, account]));
  for (const { trans: originalTrans, subtransactions } of normalized) {
    const trans = await runRules$1(originalTrans, accountsMap);
    const finalTransaction = {
      id: uuid.v4(),
      ...trans,
      account: acctId,
      cleared: trans.cleared != null ? trans.cleared : true
    };
    const updatedSubtransactions = finalTransaction.subtransactions || subtransactions;
    if (updatedSubtransactions && updatedSubtransactions.length > 0) {
      added.push(
        ...makeSplitTransaction(finalTransaction, updatedSubtransactions)
      );
    } else {
      added.push(finalTransaction);
    }
  }
  await createNewPayees(payeesToCreate, added);
  let newTransactions;
  if (runTransfers || learnCategories) {
    const res = await batchUpdateTransactions({
      added,
      learnCategories,
      runTransfers
    });
    newTransactions = res.added.map((t) => t.id);
  } else {
    await batchMessages(async () => {
      newTransactions = await Promise.all(
        added.map(async (trans) => insertTransaction(trans))
      );
    });
  }
  return newTransactions;
}
async function processBankSyncDownload(download2, id, acctRow, initialSync = false) {
  const useStrictIdChecking = !acctRow.account_sync_source;
  const {
    transactions: originalTransactions,
    startingBalance: currentBalance
  } = download2;
  if (initialSync) {
    const { transactions: transactions2 } = download2;
    let balanceToUse = currentBalance;
    if (acctRow.account_sync_source === "simpleFin") {
      const previousBalance = transactions2.reduce((total, trans) => {
        return total - parseInt(trans.transactionAmount.amount.replace(".", ""));
      }, currentBalance);
      balanceToUse = previousBalance;
    }
    if (acctRow.account_sync_source === "pluggyai") {
      const currentBalance2 = download2.startingBalance;
      const previousBalance = transactions2.reduce(
        (total, trans) => total - trans.transactionAmount.amount * 100,
        currentBalance2
      );
      balanceToUse = Math.round(previousBalance);
    }
    const oldestTransaction = transactions2[transactions2.length - 1];
    const oldestDate = transactions2.length > 0 ? oldestTransaction.date : currentDay();
    const payee = await getStartingBalancePayee();
    return runMutator(async () => {
      const initialId = await insertTransaction({
        account: id,
        amount: balanceToUse,
        category: acctRow.offbudget === 0 ? payee.category : null,
        payee: payee.id,
        date: oldestDate,
        cleared: true,
        starting_balance_flag: true
      });
      const result = await reconcileTransactions(
        id,
        transactions2,
        true,
        useStrictIdChecking
      );
      return {
        ...result,
        added: [initialId, ...result.added]
      };
    });
  }
  if (originalTransactions.length === 0) {
    return { added: [], updated: [] };
  }
  const transactions = originalTransactions.map((trans) => ({
    ...trans,
    account: id
  }));
  return runMutator(async () => {
    const result = await reconcileTransactions(
      id,
      transactions,
      true,
      useStrictIdChecking
    );
    if (currentBalance) await updateAccountBalance(id, currentBalance);
    return result;
  });
}
async function syncAccount(userId, userKey, id, acctId, bankId) {
  const acctRow = await select("accounts", id);
  const syncStartDate = await getAccountSyncStartDate(id);
  const oldestTransaction = await getAccountOldestTransaction(id);
  const newAccount = oldestTransaction == null;
  let download2;
  if (acctRow.account_sync_source === "simpleFin") {
    download2 = await downloadSimpleFinTransactions(acctId, syncStartDate);
  } else if (acctRow.account_sync_source === "pluggyai") {
    download2 = await downloadPluggyAiTransactions(acctId, syncStartDate);
  } else if (acctRow.account_sync_source === "goCardless") {
    download2 = await downloadGoCardlessTransactions(
      userId,
      userKey,
      acctId,
      bankId,
      syncStartDate,
      newAccount
    );
  } else {
    throw new Error(
      `Unrecognized bank-sync provider: ${acctRow.account_sync_source}`
    );
  }
  return processBankSyncDownload(download2, id, acctRow, newAccount);
}
async function simpleFinBatchSync$1(accounts) {
  const startDates = await Promise.all(
    accounts.map(async (a) => getAccountSyncStartDate(a.id))
  );
  const res = await downloadSimpleFinTransactions(
    accounts.map((a) => a.account_id),
    startDates
  );
  const promises = [];
  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    const download2 = res[account.account_id];
    const acctRow = await select("accounts", account.id);
    const oldestTransaction = await getAccountOldestTransaction(account.id);
    const newAccount = oldestTransaction == null;
    if (download2.error_code) {
      promises.push(
        Promise.resolve({
          accountId: account.id,
          res: download2
        })
      );
      continue;
    }
    promises.push(
      processBankSyncDownload(download2, account.id, acctRow, newAccount).then(
        (res2) => ({
          accountId: account.id,
          res: res2
        })
      )
    );
  }
  return await Promise.all(promises);
}
async function updateAccount({
  id,
  name,
  last_reconciled
}) {
  await update("accounts", {
    id,
    name,
    ...last_reconciled && { last_reconciled }
  });
  return {};
}
async function getAccounts$1() {
  return getAccounts$2();
}
async function getAccountBalance({
  id,
  cutoff
}) {
  const result = await first(
    "SELECT sum(amount) as balance FROM transactions WHERE acct = ? AND isParent = 0 AND tombstone = 0 AND date <= ?",
    [id, toDateRepr(dayFromDate(cutoff))]
  );
  return result?.balance ? result.balance : 0;
}
async function getAccountProperties({ id }) {
  const balanceResult = await first(
    "SELECT sum(amount) as balance FROM transactions WHERE acct = ? AND isParent = 0 AND tombstone = 0",
    [id]
  );
  const countResult = await first(
    "SELECT count(id) as count FROM transactions WHERE acct = ? AND tombstone = 0",
    [id]
  );
  return {
    balance: balanceResult?.balance || 0,
    numTransactions: countResult?.count || 0
  };
}
async function linkGoCardlessAccount({
  requisitionId,
  account,
  upgradingId,
  offBudget = false
}) {
  let id;
  const bank = await findOrCreateBank(account.institution, requisitionId);
  if (upgradingId) {
    const accRow = await first(
      "SELECT * FROM accounts WHERE id = ?",
      [upgradingId]
    );
    if (!accRow) {
      throw new Error(`Account with ID ${upgradingId} not found.`);
    }
    id = accRow.id;
    await update("accounts", {
      id,
      account_id: account.account_id,
      bank: bank.id,
      account_sync_source: "goCardless"
    });
  } else {
    id = uuid.v4();
    await insertWithUUID("accounts", {
      id,
      account_id: account.account_id,
      mask: account.mask,
      name: account.name,
      official_name: account.official_name,
      bank: bank.id,
      offbudget: offBudget ? 1 : 0,
      account_sync_source: "goCardless"
    });
    await insertPayee({
      name: "",
      transfer_acct: id
    });
  }
  await syncAccount(
    void 0,
    void 0,
    id,
    account.account_id,
    bank.bank_id
  );
  return "ok";
}
async function linkSimpleFinAccount({
  externalAccount,
  upgradingId,
  offBudget = false
}) {
  let id;
  const institution = {
    name: externalAccount.institution ?? i18next.t("Unknown")
  };
  const bank = await findOrCreateBank(
    institution,
    externalAccount.orgDomain ?? externalAccount.orgId
  );
  if (upgradingId) {
    const accRow = await first(
      "SELECT * FROM accounts WHERE id = ?",
      [upgradingId]
    );
    if (!accRow) {
      throw new Error(`Account with ID ${upgradingId} not found.`);
    }
    id = accRow.id;
    await update("accounts", {
      id,
      account_id: externalAccount.account_id,
      bank: bank.id,
      account_sync_source: "simpleFin"
    });
  } else {
    id = uuid.v4();
    await insertWithUUID("accounts", {
      id,
      account_id: externalAccount.account_id,
      name: externalAccount.name,
      official_name: externalAccount.name,
      bank: bank.id,
      offbudget: offBudget ? 1 : 0,
      account_sync_source: "simpleFin"
    });
    await insertPayee({
      name: "",
      transfer_acct: id
    });
  }
  await syncAccount(
    void 0,
    void 0,
    id,
    externalAccount.account_id,
    bank.bank_id
  );
  await send$1();
  return "ok";
}
async function linkPluggyAiAccount({
  externalAccount,
  upgradingId,
  offBudget = false
}) {
  let id;
  const institution = {
    name: externalAccount.institution ?? i18next.t("Unknown")
  };
  const bank = await findOrCreateBank(
    institution,
    externalAccount.orgDomain ?? externalAccount.orgId
  );
  if (upgradingId) {
    const accRow = await first(
      "SELECT * FROM accounts WHERE id = ?",
      [upgradingId]
    );
    if (!accRow) {
      throw new Error(`Account with ID ${upgradingId} not found.`);
    }
    id = accRow.id;
    await update("accounts", {
      id,
      account_id: externalAccount.account_id,
      bank: bank.id,
      account_sync_source: "pluggyai"
    });
  } else {
    id = uuid.v4();
    await insertWithUUID("accounts", {
      id,
      account_id: externalAccount.account_id,
      name: externalAccount.name,
      official_name: externalAccount.name,
      bank: bank.id,
      offbudget: offBudget ? 1 : 0,
      account_sync_source: "pluggyai"
    });
    await insertPayee({
      name: "",
      transfer_acct: id
    });
  }
  await syncAccount(
    void 0,
    void 0,
    id,
    externalAccount.account_id,
    bank.bank_id
  );
  await send$1();
  return "ok";
}
async function createAccount$1({
  name,
  balance = 0,
  offBudget = false,
  closed = false
}) {
  const id = await insertAccount({
    name,
    offbudget: offBudget ? 1 : 0,
    closed: closed ? 1 : 0
  });
  await insertPayee({
    name: "",
    transfer_acct: id
  });
  if (balance != null && balance !== 0) {
    const payee = await getStartingBalancePayee();
    await insertTransaction({
      account: id,
      amount: amountToInteger$1(balance),
      category: offBudget ? null : payee.category,
      payee: payee.id,
      date: currentDay(),
      cleared: true,
      starting_balance_flag: true
    });
  }
  return id;
}
async function closeAccount({
  id,
  transferAccountId,
  categoryId,
  forced = false
}) {
  await unlinkAccount({ id });
  return withUndo(async () => {
    const account = await first(
      "SELECT * FROM accounts WHERE id = ? AND tombstone = 0",
      [id]
    );
    if (!account || account.closed === 1) {
      return;
    }
    const { balance, numTransactions } = await getAccountProperties({ id });
    if (numTransactions === 0) {
      await deleteAccount({ id });
    } else if (forced) {
      const rows = await runQuery(
        "SELECT id, transfer_id FROM v_transactions WHERE account = ?",
        [id],
        true
      );
      const transferPayee = await first(
        "SELECT id FROM payees WHERE transfer_acct = ?",
        [id]
      );
      if (!transferPayee) {
        throw new Error(`Transfer payee with account ID ${id} not found.`);
      }
      await batchMessages(async () => {
        rows.forEach((row) => {
          if (row.transfer_id) {
            updateTransaction$2({
              id: row.transfer_id,
              payee: null,
              transfer_id: null
            });
          }
          deleteTransaction$2({ id: row.id });
        });
        deleteAccount({ id });
        deleteTransferPayee({ id: transferPayee.id });
      });
    } else {
      if (balance !== 0 && transferAccountId == null) {
        throw APIError("balance is non-zero: transferAccountId is required");
      }
      await update("accounts", { id, closed: 1 });
      if (balance !== 0 && transferAccountId) {
        const transferPayee = await first(
          "SELECT id FROM payees WHERE transfer_acct = ?",
          [transferAccountId]
        );
        if (!transferPayee) {
          throw new Error(
            `Transfer payee with account ID ${transferAccountId} not found.`
          );
        }
        await app$j.handlers["transaction-add"]({
          id: uuid.v4(),
          payee: transferPayee.id,
          amount: -balance,
          account: id,
          date: currentDay(),
          notes: "Closing account",
          category: categoryId
        });
      }
    }
  });
}
async function reopenAccount({ id }) {
  await update("accounts", { id, closed: 0 });
}
async function moveAccount({
  id,
  targetId
}) {
  await moveAccount$1(id, targetId);
}
async function setSecret({
  name,
  value
}) {
  const userToken = await getItem("user-token");
  if (!userToken) {
    return { error: "unauthorized" };
  }
  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error("Failed to get server config.");
  }
  try {
    return await post(
      serverConfig.BASE_SERVER + "/secret",
      {
        name,
        value
      },
      {
        "X-ACTUAL-TOKEN": userToken
      }
    );
  } catch (error) {
    return {
      error: "failed",
      reason: error instanceof PostError ? error.reason : void 0
    };
  }
}
async function checkSecret(name) {
  const userToken = await getItem("user-token");
  if (!userToken) {
    return { error: "unauthorized" };
  }
  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error("Failed to get server config.");
  }
  try {
    return await get(serverConfig.BASE_SERVER + "/secret/" + name, {
      "X-ACTUAL-TOKEN": userToken
    });
  } catch (error) {
    console.error(error);
    return { error: "failed" };
  }
}
let stopPolling = false;
async function pollGoCardlessWebToken({
  requisitionId
}) {
  const userToken = await getItem("user-token");
  if (!userToken) return { error: "unknown" };
  const startTime = Date.now();
  stopPolling = false;
  async function getData(cb) {
    if (stopPolling) {
      return;
    }
    if (Date.now() - startTime >= 1e3 * 60 * 10) {
      cb({ status: "timeout" });
      return;
    }
    const serverConfig = getServer();
    if (!serverConfig) {
      throw new Error("Failed to get server config.");
    }
    const data = await post(
      serverConfig.GOCARDLESS_SERVER + "/get-accounts",
      {
        requisitionId
      },
      {
        "X-ACTUAL-TOKEN": userToken
      }
    );
    if (data) {
      if (data.error_code) {
        console.error("Failed linking gocardless account:", data);
        cb({ status: "unknown", message: data.error_type });
      } else {
        cb({ status: "success", data });
      }
    } else {
      setTimeout(() => getData(cb), 3e3);
    }
  }
  return new Promise((resolve) => {
    getData((data) => {
      if (data.status === "success") {
        resolve({ data: data.data });
        return;
      }
      if (data.status === "timeout") {
        resolve({ error: data.status });
        return;
      }
      resolve({
        error: data.status,
        message: data.message
      });
    });
  });
}
async function stopGoCardlessWebTokenPolling() {
  stopPolling = true;
  return "ok";
}
async function goCardlessStatus() {
  const userToken = await getItem("user-token");
  if (!userToken) {
    return { error: "unauthorized" };
  }
  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error("Failed to get server config.");
  }
  return post(
    serverConfig.GOCARDLESS_SERVER + "/status",
    {},
    {
      "X-ACTUAL-TOKEN": userToken
    }
  );
}
async function simpleFinStatus() {
  const userToken = await getItem("user-token");
  if (!userToken) {
    return { error: "unauthorized" };
  }
  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error("Failed to get server config.");
  }
  return post(
    serverConfig.SIMPLEFIN_SERVER + "/status",
    {},
    {
      "X-ACTUAL-TOKEN": userToken
    }
  );
}
async function pluggyAiStatus() {
  const userToken = await getItem("user-token");
  if (!userToken) {
    return { error: "unauthorized" };
  }
  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error("Failed to get server config.");
  }
  return post(
    serverConfig.PLUGGYAI_SERVER + "/status",
    {},
    {
      "X-ACTUAL-TOKEN": userToken
    }
  );
}
async function simpleFinAccounts() {
  const userToken = await getItem("user-token");
  if (!userToken) {
    return { error: "unauthorized" };
  }
  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error("Failed to get server config.");
  }
  try {
    return await post(
      serverConfig.SIMPLEFIN_SERVER + "/accounts",
      {},
      {
        "X-ACTUAL-TOKEN": userToken
      },
      6e4
    );
  } catch (error) {
    return { error_code: "TIMED_OUT" };
  }
}
async function pluggyAiAccounts() {
  const userToken = await getItem("user-token");
  if (!userToken) {
    return { error: "unauthorized" };
  }
  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error("Failed to get server config.");
  }
  try {
    return await post(
      serverConfig.PLUGGYAI_SERVER + "/accounts",
      {},
      {
        "X-ACTUAL-TOKEN": userToken
      },
      6e4
    );
  } catch (error) {
    return { error_code: "TIMED_OUT" };
  }
}
async function getGoCardlessBanks(country) {
  const userToken = await getItem("user-token");
  if (!userToken) {
    return { error: "unauthorized" };
  }
  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error("Failed to get server config.");
  }
  return post(
    serverConfig.GOCARDLESS_SERVER + "/get-banks",
    { country, showDemo: isNonProductionEnvironment() },
    {
      "X-ACTUAL-TOKEN": userToken
    }
  );
}
async function createGoCardlessWebToken({
  institutionId,
  accessValidForDays
}) {
  const userToken = await getItem("user-token");
  if (!userToken) {
    return { error: "unauthorized" };
  }
  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error("Failed to get server config.");
  }
  try {
    return await post(
      serverConfig.GOCARDLESS_SERVER + "/create-web-token",
      {
        institutionId,
        accessValidForDays
      },
      {
        "X-ACTUAL-TOKEN": userToken
      }
    );
  } catch (error) {
    console.error(error);
    return { error: "failed" };
  }
}
async function handleSyncResponse(res, acct) {
  const { added, updated } = res;
  const newTransactions = [];
  const matchedTransactions = [];
  const updatedAccounts = [];
  newTransactions.push(...added);
  matchedTransactions.push(...updated);
  if (added.length > 0) {
    updatedAccounts.push(acct.id);
  }
  const ts = (/* @__PURE__ */ new Date()).getTime().toString();
  await update("accounts", { id: acct.id, last_sync: ts });
  return {
    newTransactions,
    matchedTransactions,
    updatedAccounts
  };
}
function handleSyncError(err, acct) {
  if (err instanceof BankSyncError$1 || err?.type === "BankSyncError") {
    const error = err;
    const syncError = {
      type: "SyncError",
      accountId: acct.id,
      message: "Failed syncing account “" + acct.name + ".”",
      category: error.category,
      code: error.code
    };
    if (error.category === "RATE_LIMIT_EXCEEDED") {
      return {
        ...syncError,
        message: `Failed syncing account ${acct.name}. Rate limit exceeded. Please try again later.`
      };
    }
    return syncError;
  }
  if (err instanceof PostError && err.reason !== "internal") {
    return {
      accountId: acct.id,
      message: err.reason ? err.reason : `Account “${acct.name}” is not linked properly. Please link it again.`
    };
  }
  return {
    accountId: acct.id,
    message: "There was an internal error. Please get in touch https://actualbudget.org/contact for support.",
    internal: err.stack
  };
}
async function accountsBankSync({
  ids = []
}) {
  const { "user-id": userId, "user-key": userKey } = await multiGet(["user-id", "user-key"]);
  const accounts = await runQuery(
    `
    SELECT a.*, b.bank_id as bankId
    FROM accounts a
    LEFT JOIN banks b ON a.bank = b.id
    WHERE a.tombstone = 0 AND a.closed = 0
      ${ids.length ? `AND a.id IN (${ids.map(() => "?").join(", ")})` : ""}
    ORDER BY a.offbudget, a.sort_order
  `,
    ids,
    true
  );
  const errors = [];
  const newTransactions = [];
  const matchedTransactions = [];
  const updatedAccounts = [];
  for (const acct of accounts) {
    if (acct.bankId && acct.account_id) {
      try {
        console.group("Bank Sync operation for account:", acct.name);
        const syncResponse = await syncAccount(
          userId,
          userKey,
          acct.id,
          acct.account_id,
          acct.bankId
        );
        const syncResponseData = await handleSyncResponse(syncResponse, acct);
        newTransactions.push(...syncResponseData.newTransactions);
        matchedTransactions.push(...syncResponseData.matchedTransactions);
        updatedAccounts.push(...syncResponseData.updatedAccounts);
      } catch (err) {
        const error = err;
        errors.push(handleSyncError(error, acct));
        captureException({
          ...error,
          message: "Failed syncing account “" + acct.name + ".”"
        });
      } finally {
        console.groupEnd();
      }
    }
  }
  if (updatedAccounts.length > 0) ;
  return { errors, newTransactions, matchedTransactions, updatedAccounts };
}
async function simpleFinBatchSync({
  ids = []
}) {
  const accounts = await runQuery(
    `SELECT a.*, b.bank_id as bankId FROM accounts a
         LEFT JOIN banks b ON a.bank = b.id
         WHERE
          a.tombstone = 0
          AND a.closed = 0
          AND a.account_sync_source = 'simpleFin'
          ${ids.length ? `AND a.id IN (${ids.map(() => "?").join(", ")})` : ""}
         ORDER BY a.offbudget, a.sort_order`,
    ids.length ? ids : [],
    true
  );
  const retVal = [];
  console.group("Bank Sync operation for all SimpleFin accounts");
  try {
    const syncResponses = await simpleFinBatchSync$1(
      accounts.map((a) => ({
        id: a.id,
        account_id: a.account_id || null
      }))
    );
    for (const syncResponse of syncResponses) {
      const account = accounts.find((a) => a.id === syncResponse.accountId);
      if (!account) {
        console.error(
          `Invalid account ID found in response: ${syncResponse.accountId}. Proceeding to the next account...`
        );
        continue;
      }
      const errors = [];
      const newTransactions = [];
      const matchedTransactions = [];
      const updatedAccounts = [];
      if (syncResponse.res.error_code) {
        errors.push(
          handleSyncError(
            {
              type: "BankSyncError",
              reason: "Failed syncing account “" + account.name + ".”",
              category: syncResponse.res.error_type,
              code: syncResponse.res.error_code
            },
            account
          )
        );
      } else {
        const syncResponseData = await handleSyncResponse(
          syncResponse.res,
          account
        );
        newTransactions.push(...syncResponseData.newTransactions);
        matchedTransactions.push(...syncResponseData.matchedTransactions);
        updatedAccounts.push(...syncResponseData.updatedAccounts);
      }
      retVal.push({
        accountId: syncResponse.accountId,
        res: { errors, newTransactions, matchedTransactions, updatedAccounts }
      });
    }
  } catch (err) {
    const errors = [];
    for (const account of accounts) {
      retVal.push({
        accountId: account.id,
        res: {
          errors,
          newTransactions: [],
          matchedTransactions: [],
          updatedAccounts: []
        }
      });
      const error = err;
      errors.push(handleSyncError(error, account));
    }
  }
  if (retVal.some((a) => a.res.updatedAccounts.length > 0)) ;
  console.groupEnd();
  return retVal;
}
async function importTransactions$2({
  accountId,
  transactions,
  isPreview,
  opts
}) {
  if (typeof accountId !== "string") {
    throw APIError("transactions-import: accountId must be an id");
  }
  try {
    const reconciled = await reconcileTransactions(
      accountId,
      transactions,
      false,
      true,
      isPreview,
      opts?.defaultCleared
    );
    return {
      errors: [],
      added: reconciled.added,
      updated: reconciled.updated,
      updatedPreview: reconciled.updatedPreview
    };
  } catch (err) {
    if (err instanceof TransactionError) {
      return {
        errors: [{ message: err.message }],
        added: [],
        updated: [],
        updatedPreview: []
      };
    }
    throw err;
  }
}
async function unlinkAccount({ id }) {
  const accRow = await first(
    "SELECT * FROM accounts WHERE id = ?",
    [id]
  );
  if (!accRow) {
    throw new Error(`Account with ID ${id} not found.`);
  }
  const bankId = accRow.bank;
  if (!bankId) {
    return "ok";
  }
  const isGoCardless = accRow.account_sync_source === "goCardless";
  await updateAccount$1({
    id,
    account_id: null,
    bank: null,
    balance_current: null,
    balance_available: null,
    balance_limit: null,
    account_sync_source: null
  });
  if (isGoCardless === false) {
    return;
  }
  const accountWithBankResult = await first(
    "SELECT COUNT(*) as count FROM accounts WHERE bank = ?",
    [bankId]
  );
  const userToken = await getItem("user-token");
  if (!userToken) {
    return "ok";
  }
  if (!accountWithBankResult || accountWithBankResult.count === 0) {
    const bank = await first(
      "SELECT bank_id FROM banks WHERE id = ?",
      [bankId]
    );
    if (!bank) {
      throw new Error(`Bank with ID ${bankId} not found.`);
    }
    const serverConfig = getServer();
    if (!serverConfig) {
      throw new Error("Failed to get server config.");
    }
    const requisitionId = bank.bank_id;
    try {
      await post(
        serverConfig.GOCARDLESS_SERVER + "/remove-account",
        {
          requisitionId
        },
        {
          "X-ACTUAL-TOKEN": userToken
        }
      );
    } catch (error) {
      console.log({ error });
    }
  }
  return "ok";
}
const app$i = createApp();
app$i.method("account-update", mutator(undoable(updateAccount)));
app$i.method("accounts-get", getAccounts$1);
app$i.method("account-balance", getAccountBalance);
app$i.method("account-properties", getAccountProperties);
app$i.method("gocardless-accounts-link", linkGoCardlessAccount);
app$i.method("simplefin-accounts-link", linkSimpleFinAccount);
app$i.method("pluggyai-accounts-link", linkPluggyAiAccount);
app$i.method("account-create", mutator(undoable(createAccount$1)));
app$i.method("account-close", mutator(closeAccount));
app$i.method("account-reopen", mutator(undoable(reopenAccount)));
app$i.method("account-move", mutator(undoable(moveAccount)));
app$i.method("secret-set", setSecret);
app$i.method("secret-check", checkSecret);
app$i.method("gocardless-poll-web-token", pollGoCardlessWebToken);
app$i.method("gocardless-poll-web-token-stop", stopGoCardlessWebTokenPolling);
app$i.method("gocardless-status", goCardlessStatus);
app$i.method("simplefin-status", simpleFinStatus);
app$i.method("pluggyai-status", pluggyAiStatus);
app$i.method("simplefin-accounts", simpleFinAccounts);
app$i.method("pluggyai-accounts", pluggyAiAccounts);
app$i.method("gocardless-get-banks", getGoCardlessBanks);
app$i.method("gocardless-create-web-token", createGoCardlessWebToken);
app$i.method("accounts-bank-sync", accountsBankSync);
app$i.method("simplefin-batch-sync", simpleFinBatchSync);
app$i.method("transactions-import", mutator(undoable(importTransactions$2)));
app$i.method("account-unlink", mutator(unlinkAccount));
const app$h = createApp();
app$h.method("users-get", getUsers);
app$h.method("user-delete-all", deleteAllUsers);
app$h.method("user-add", addUser);
app$h.method("user-update", updateUser);
app$h.method("access-add", addAccess);
app$h.method("access-delete-all", deleteAllAccess);
app$h.method("access-get-available-users", accessGetAvailableUsers);
app$h.method("transfer-ownership", transferOwnership);
app$h.method("owner-created", ownerCreated);
async function getUsers() {
  const userToken = await getItem("user-token");
  if (userToken) {
    const res = await get(getServer().BASE_SERVER + "/admin/users/", {
      headers: {
        "X-ACTUAL-TOKEN": userToken
      }
    });
    if (res) {
      try {
        const list = JSON.parse(res);
        return list;
      } catch (err) {
        return { error: "Failed to parse response: " + err.message };
      }
    }
  }
  return null;
}
async function deleteAllUsers(ids) {
  const userToken = await getItem("user-token");
  if (userToken) {
    try {
      const res = await del(
        getServer().BASE_SERVER + "/admin/users",
        {
          ids
        },
        {
          "X-ACTUAL-TOKEN": userToken
        }
      );
      if (res) {
        return res;
      }
    } catch (err) {
      return { error: err.reason };
    }
  }
  return { someDeletionsFailed: true };
}
async function addUser(user) {
  const userToken = await getItem("user-token");
  if (userToken) {
    try {
      const res = await post(getServer().BASE_SERVER + "/admin/users/", user, {
        "X-ACTUAL-TOKEN": userToken
      });
      return res;
    } catch (err) {
      return { error: err.reason };
    }
  }
  return null;
}
async function updateUser(user) {
  const userToken = await getItem("user-token");
  if (userToken) {
    try {
      const res = await patch(getServer().BASE_SERVER + "/admin/users/", user, {
        "X-ACTUAL-TOKEN": userToken
      });
      return res;
    } catch (err) {
      return { error: err.reason };
    }
  }
  return null;
}
async function addAccess(access) {
  const userToken = await getItem("user-token");
  if (userToken) {
    try {
      await post(getServer().BASE_SERVER + "/admin/access/", access, {
        "X-ACTUAL-TOKEN": userToken
      });
      return {};
    } catch (err) {
      return { error: err.reason };
    }
  }
  return null;
}
async function deleteAllAccess({
  fileId,
  ids
}) {
  const userToken = await getItem("user-token");
  if (userToken) {
    try {
      const res = await del(
        getServer().BASE_SERVER + `/admin/access?fileId=${fileId}`,
        {
          token: userToken,
          ids
        }
      );
      if (res) {
        return res;
      }
    } catch (err) {
      return { error: err.reason };
    }
  }
  return { someDeletionsFailed: true };
}
async function accessGetAvailableUsers(fileId) {
  const userToken = await getItem("user-token");
  if (userToken) {
    const res = await get(
      `${getServer().BASE_SERVER + "/admin/access/users"}?fileId=${fileId}`,
      {
        headers: {
          "X-ACTUAL-TOKEN": userToken
        }
      }
    );
    if (res) {
      try {
        return JSON.parse(res);
      } catch (err) {
        return { error: "Failed to parse response: " + err.message };
      }
    }
  }
  return [];
}
async function transferOwnership({
  fileId,
  newUserId
}) {
  const userToken = await getItem("user-token");
  if (userToken) {
    try {
      await post(
        getServer().BASE_SERVER + "/admin/access/transfer-ownership/",
        { fileId, newUserId },
        {
          "X-ACTUAL-TOKEN": userToken
        }
      );
    } catch (err) {
      return { error: err.reason };
    }
  }
  return {};
}
async function ownerCreated() {
  const res = await get(getServer().BASE_SERVER + "/admin/owner-created/");
  if (res) {
    return JSON.parse(res);
  }
  return null;
}
function getDownloadError({
  reason,
  meta,
  fileName
}) {
  switch (reason) {
    case "network":
    case "download-failure":
      return i18next.t("Downloading the file failed. Check your network connection.");
    case "not-zip-file":
    case "invalid-zip-file":
    case "invalid-meta-file":
      return i18next.t(
        "Downloaded file is invalid, sorry! Visit https://actualbudget.org/contact/ for support."
      );
    case "decrypt-failure":
      return "Unable to decrypt file " + (fileName || "(unknown)") + ". To change your key, first download this file with the proper password.";
    case "out-of-sync-migrations":
      return i18next.t(
        "This budget cannot be loaded with this version of the app. Make sure the app is up-to-date."
      );
    default:
      const info = meta && typeof meta === "object" && "fileId" in meta && meta.fileId ? `, fileId: ${meta.fileId}` : "";
      return i18next.t(
        "Something went wrong trying to download that file, sorry! Visit https://actualbudget.org/contact/ for support. reason: {{reason}}{{info}}",
        { reason, info }
      );
  }
}
function getTestKeyError({ reason }) {
  switch (reason) {
    case "network":
      return i18next.t(
        "Unable to connect to the server. We need to access the server to get some information about your keys."
      );
    case "old-key-style":
      return i18next.t(
        "This file is encrypted with an old unsupported key style. Recreate the key on a device where the file is available, or use an older version of Actual to download it."
      );
    case "decrypt-failure":
      return i18next.t("Unable to decrypt file with this password. Please try again.");
    default:
      return i18next.t(
        "Something went wrong trying to create a key, sorry! Visit https://actualbudget.org/contact/ for support."
      );
  }
}
function getSyncError(error, id) {
  if (error === "out-of-sync-migrations" || error === "out-of-sync-data") {
    return i18next.t("This budget cannot be loaded with this version of the app.");
  } else if (error === "budget-not-found") {
    return i18next.t(
      "Budget “{{id}}” not found. Check the ID of your budget in the Advanced section of the settings page.",
      { id }
    );
  } else {
    return i18next.t("We had an unknown problem opening “{{id}}”.", { id });
  }
}
function getBankSyncError(error) {
  return error.message || i18next.t("We had an unknown problem syncing the account.");
}
const accountModel = {
  ...accountModel$1,
  toExternal(account) {
    return {
      id: account.id,
      name: account.name,
      offbudget: account.offbudget ? true : false,
      closed: account.closed ? true : false
    };
  },
  fromExternal(account) {
    const result = { ...account };
    if ("offbudget" in account) {
      result.offbudget = account.offbudget ? 1 : 0;
    }
    if ("closed" in account) {
      result.closed = account.closed ? 1 : 0;
    }
    return result;
  }
};
const categoryModel = {
  ...categoryModel$1,
  toExternal(category) {
    return {
      id: category.id,
      name: category.name,
      is_income: category.is_income ? true : false,
      hidden: category.hidden ? true : false,
      group_id: category.group
    };
  },
  fromExternal(category) {
    const { group_id, ...apiCategory } = category;
    const result = {
      ...apiCategory,
      group: group_id
    };
    return result;
  }
};
const categoryGroupModel = {
  ...categoryGroupModel$1,
  toExternal(group) {
    return {
      id: group.id,
      name: group.name,
      is_income: group.is_income ? true : false,
      hidden: group.hidden ? true : false,
      categories: group.categories?.map(categoryModel.toExternal) || []
    };
  },
  fromExternal(group) {
    const result = { ...group };
    if ("categories" in group) {
      result.categories = group.categories.map(categoryModel.fromExternal);
    }
    return result;
  }
};
const payeeModel = {
  ...payeeModel$1,
  toExternal(payee) {
    return {
      id: payee.id,
      name: payee.name,
      transfer_acct: payee.transfer_acct
    };
  },
  fromExternal(payee) {
    return payee;
  }
};
const remoteFileModel = {
  toExternal(file) {
    if (file.deleted) {
      return null;
    }
    return {
      cloudFileId: file.fileId,
      state: "remote",
      groupId: file.groupId,
      name: file.name,
      encryptKeyId: file.encryptKeyId,
      hasKey: file.hasKey,
      owner: file.owner,
      usersWithAccess: file.usersWithAccess
    };
  },
  fromExternal(file) {
    return { deleted: false, fileId: file.cloudFileId, ...file };
  }
};
const budgetModel = {
  toExternal(file) {
    return file;
  },
  fromExternal(file) {
    return file;
  }
};
let IMPORT_MODE = false;
function withMutation(handler) {
  return (...args) => {
    return runMutator(
      async () => {
        const latestTimestamp = getClock().timestamp.toString();
        const result = await handler(...args);
        await all(
          "SELECT DISTINCT dataset FROM messages_crdt WHERE timestamp > ?",
          [latestTimestamp]
        );
        return result;
      },
      { undoDisabled: true }
    );
  };
}
let handlers = {};
async function validateMonth(month) {
  if (!month.match(/^\d{4}-\d{2}$/)) {
    throw APIError("Invalid month format, use YYYY-MM: " + month);
  }
  if (!IMPORT_MODE) {
    const { start, end } = await handlers["get-budget-bounds"]();
    const range$1 = range(start, end);
    if (!range$1.includes(month)) {
      throw APIError("No budget exists for month: " + month);
    }
  }
}
async function validateExpenseCategory(debug, id) {
  if (id == null) {
    throw APIError(`${debug}: category id is required`);
  }
  const row = await first(
    "SELECT is_income FROM categories WHERE id = ?",
    [id]
  );
  if (!row) {
    throw APIError(`${debug}: category “${id}” does not exist`);
  }
  if (row.is_income !== 0) {
    throw APIError(`${debug}: category “${id}” is not an expense category`);
  }
}
function checkFileOpen() {
  if (!(getPrefs() || {}).id) {
    throw APIError("No budget file is open");
  }
}
let batchPromise = null;
handlers["api/batch-budget-start"] = async function() {
  if (batchPromise) {
    throw APIError("Cannot start a batch process: batch already started");
  }
  if (IMPORT_MODE) {
    asyncTransaction(() => {
      return new Promise((resolve, reject) => {
        batchPromise = { resolve, reject };
      });
    });
  } else {
    batchMessages(() => {
      return new Promise((resolve, reject) => {
        batchPromise = { resolve, reject };
      });
    });
  }
};
handlers["api/batch-budget-end"] = async function() {
  if (!batchPromise) {
    throw APIError("Cannot end a batch process: no batch started");
  }
  batchPromise.resolve();
  batchPromise = null;
};
handlers["api/load-budget"] = async function({ id }) {
  const { id: currentId } = getPrefs() || {};
  if (currentId !== id) {
    const { error } = await handlers["load-budget"]({ id });
    if (!error) ;
    else {
      throw new Error(getSyncError(error, id));
    }
  }
};
handlers["api/download-budget"] = async function({ syncId, password }) {
  const { id: currentId } = getPrefs() || {};
  if (currentId) {
    await handlers["close-budget"]();
  }
  const budgets = await handlers["get-budgets"]();
  const localBudget = budgets.find((b) => b.groupId === syncId);
  let remoteBudget;
  if (!localBudget) {
    const files = await handlers["get-remote-files"]();
    if (!files) {
      throw new Error("Could not get remote files");
    }
    const file = files.find((f2) => f2.groupId === syncId);
    if (!file) {
      throw new Error(
        `Budget “${syncId}” not found. Check the sync id of your budget in the Advanced section of the settings page.`
      );
    }
    remoteBudget = file;
  }
  const activeFile = remoteBudget ? remoteBudget : localBudget;
  if (activeFile.encryptKeyId) {
    if (!password) {
      throw new Error(
        `File ${activeFile.name} is encrypted. Please provide a password.`
      );
    }
    const result2 = await handlers["key-test"]({
      cloudFileId: remoteBudget ? remoteBudget.fileId : localBudget.cloudFileId,
      password
    });
    if (result2.error) {
      throw new Error(getTestKeyError(result2.error));
    }
  }
  if (localBudget) {
    await handlers["load-budget"]({ id: localBudget.id });
    const result2 = await handlers["sync-budget"]();
    if (result2.error) {
      throw new Error(getSyncError(result2.error, localBudget.id));
    }
    return;
  }
  const result = await handlers["download-budget"]({
    cloudFileId: remoteBudget.fileId
  });
  if (result.error) {
    console.log("Full error details", result.error);
    throw new Error(getDownloadError(result.error));
  }
  await handlers["load-budget"]({ id: result.id });
};
handlers["api/get-budgets"] = async function() {
  const budgets = await handlers["get-budgets"]();
  const files = await handlers["get-remote-files"]() || [];
  return [
    ...budgets.map((file) => budgetModel.toExternal(file)),
    ...files.map((file) => remoteFileModel.toExternal(file)).filter((file) => file)
  ];
};
handlers["api/sync"] = async function() {
  const { id } = getPrefs();
  const result = await handlers["sync-budget"]();
  if (result.error) {
    throw new Error(getSyncError(result.error, id));
  }
};
handlers["api/bank-sync"] = async function(args) {
  const batchSync = args?.accountId == null;
  const allErrors = [];
  if (!batchSync) {
    const { errors: errors2 } = await handlers["accounts-bank-sync"]({
      ids: [args.accountId]
    });
    allErrors.push(...errors2);
  } else {
    const accountsData = await handlers["accounts-get"]();
    const accountIdsToSync = accountsData.map((a) => a.id);
    const simpleFinAccounts2 = accountsData.filter(
      (a) => a.account_sync_source === "simpleFin"
    );
    const simpleFinAccountIds = simpleFinAccounts2.map((a) => a.id);
    if (simpleFinAccounts2.length > 1) {
      const res = await handlers["simplefin-batch-sync"]({
        ids: simpleFinAccountIds
      });
      res.forEach((a) => allErrors.push(...a.res.errors));
    }
    const { errors: errors2 } = await handlers["accounts-bank-sync"]({
      ids: accountIdsToSync.filter((a) => !simpleFinAccountIds.includes(a))
    });
    allErrors.push(...errors2);
  }
  const errors = allErrors.filter((e) => e != null);
  if (errors.length > 0) {
    throw new Error(getBankSyncError(errors[0]));
  }
};
handlers["api/start-import"] = async function({ budgetName }) {
  await handlers["close-budget"]();
  await handlers["create-budget"]({ budgetName, avoidUpload: true });
  await runQuery("DELETE FROM categories WHERE is_income = 0");
  await runQuery("DELETE FROM category_groups WHERE is_income = 0");
  setSyncingMode("import");
  IMPORT_MODE = true;
};
handlers["api/finish-import"] = async function() {
  checkFileOpen();
  get$1().markCacheDirty();
  const { id } = getPrefs();
  await handlers["close-budget"]();
  await handlers["load-budget"]({ id });
  await handlers["get-budget-bounds"]();
  await waitOnSpreadsheet();
  await upload().catch(() => {
  });
  IMPORT_MODE = false;
};
handlers["api/abort-import"] = async function() {
  if (IMPORT_MODE) {
    checkFileOpen();
    const { id } = getPrefs();
    await handlers["close-budget"]();
    await handlers["delete-budget"]({ id });
  }
  IMPORT_MODE = false;
};
handlers["api/query"] = async function({ query }) {
  checkFileOpen();
  return aqlQuery(query);
};
handlers["api/budget-months"] = async function() {
  checkFileOpen();
  const { start, end } = await handlers["get-budget-bounds"]();
  return range(start, end);
};
handlers["api/budget-month"] = async function({ month }) {
  checkFileOpen();
  await validateMonth(month);
  const { data: groups } = await aqlQuery(
    q("category_groups").select("*")
  );
  const sheetName = sheetForMonth(month);
  function value(name) {
    const v = get$1().getCellValue(sheetName, name);
    return v === "" ? 0 : v;
  }
  return {
    month,
    incomeAvailable: value("available-funds"),
    lastMonthOverspent: value("last-month-overspent"),
    forNextMonth: value("buffered"),
    totalBudgeted: value("total-budgeted"),
    toBudget: value("to-budget"),
    fromLastMonth: value("from-last-month"),
    totalIncome: value("total-income"),
    totalSpent: value("total-spent"),
    totalBalance: value("total-leftover"),
    categoryGroups: groups.map((group) => {
      if (group.is_income) {
        return {
          ...categoryGroupModel.toExternal(group),
          received: value("total-income"),
          categories: group.categories.map((cat) => ({
            ...categoryModel.toExternal(cat),
            received: value(`sum-amount-${cat.id}`)
          }))
        };
      }
      return {
        ...categoryGroupModel.toExternal(group),
        budgeted: value(`group-budget-${group.id}`),
        spent: value(`group-sum-amount-${group.id}`),
        balance: value(`group-leftover-${group.id}`),
        categories: group.categories.map((cat) => ({
          ...categoryModel.toExternal(cat),
          budgeted: value(`budget-${cat.id}`),
          spent: value(`sum-amount-${cat.id}`),
          balance: value(`leftover-${cat.id}`),
          carryover: value(`carryover-${cat.id}`)
        }))
      };
    })
  };
};
handlers["api/budget-set-amount"] = withMutation(async function({
  month,
  categoryId,
  amount
}) {
  checkFileOpen();
  return handlers["budget/budget-amount"]({
    month,
    category: categoryId,
    amount
  });
});
handlers["api/budget-set-carryover"] = withMutation(async function({
  month,
  categoryId,
  flag
}) {
  checkFileOpen();
  await validateMonth(month);
  await validateExpenseCategory("budget-set-carryover", categoryId);
  return handlers["budget/set-carryover"]({
    startMonth: month,
    category: categoryId,
    flag
  });
});
handlers["api/budget-hold-for-next-month"] = withMutation(async function({
  month,
  amount
}) {
  checkFileOpen();
  await validateMonth(month);
  if (amount <= 0) {
    throw APIError("Amount to hold needs to be greater than 0");
  }
  return handlers["budget/hold-for-next-month"]({
    month,
    amount
  });
});
handlers["api/budget-reset-hold"] = withMutation(async function({ month }) {
  checkFileOpen();
  await validateMonth(month);
  return handlers["budget/reset-hold"]({ month });
});
handlers["api/transactions-export"] = async function({
  transactions,
  categoryGroups,
  payees,
  accounts
}) {
  checkFileOpen();
  return handlers["transactions-export"]({
    transactions,
    categoryGroups,
    payees,
    accounts
  });
};
handlers["api/transactions-import"] = withMutation(async function({
  accountId,
  transactions,
  isPreview = false,
  opts
}) {
  checkFileOpen();
  return handlers["transactions-import"]({
    accountId,
    transactions,
    isPreview,
    opts
  });
});
handlers["api/transactions-add"] = withMutation(async function({
  accountId,
  transactions,
  runTransfers = false,
  learnCategories = false
}) {
  checkFileOpen();
  await addTransactions$1(accountId, transactions, {
    runTransfers,
    learnCategories
  });
  return "ok";
});
handlers["api/transactions-get"] = async function({
  accountId,
  startDate,
  endDate
}) {
  checkFileOpen();
  const { data } = await aqlQuery(
    q("transactions").filter({
      $and: [
        accountId && { account: accountId },
        startDate && { date: { $gte: startDate } },
        endDate && { date: { $lte: endDate } }
      ].filter(Boolean)
    }).select("*").options({ splits: "grouped" })
  );
  return data;
};
handlers["api/transaction-update"] = withMutation(async function({
  id,
  fields
}) {
  checkFileOpen();
  const { data } = await aqlQuery(
    q("transactions").filter({ id }).select("*").options({ splits: "grouped" })
  );
  const transactions = ungroupTransactions(data);
  if (transactions.length === 0) {
    return [];
  }
  const { diff: diff2 } = updateTransaction$1(transactions, { id, ...fields });
  return handlers["transactions-batch-update"](diff2)["updated"];
});
handlers["api/transaction-delete"] = withMutation(async function({ id }) {
  checkFileOpen();
  const { data } = await aqlQuery(
    q("transactions").filter({ id }).select("*").options({ splits: "grouped" })
  );
  const transactions = ungroupTransactions(data);
  if (transactions.length === 0) {
    return [];
  }
  const { diff: diff2 } = deleteTransaction$1(transactions, id);
  return handlers["transactions-batch-update"](diff2)["deleted"];
});
handlers["api/accounts-get"] = async function() {
  checkFileOpen();
  const accounts = await getAccounts$2();
  return accounts.map((account) => accountModel.toExternal(account));
};
handlers["api/account-create"] = withMutation(async function({
  account,
  initialBalance = null
}) {
  checkFileOpen();
  return handlers["account-create"]({
    name: account.name,
    offBudget: account.offbudget,
    closed: account.closed,
    // Current the API expects an amount but it really should expect
    // an integer
    balance: initialBalance != null ? integerToAmount(initialBalance) : null
  });
});
handlers["api/account-update"] = withMutation(async function({ id, fields }) {
  checkFileOpen();
  return updateAccount$1({ id, ...accountModel.fromExternal(fields) });
});
handlers["api/account-close"] = withMutation(async function({
  id,
  transferAccountId,
  transferCategoryId
}) {
  checkFileOpen();
  return handlers["account-close"]({
    id,
    transferAccountId,
    categoryId: transferCategoryId
  });
});
handlers["api/account-reopen"] = withMutation(async function({ id }) {
  checkFileOpen();
  return handlers["account-reopen"]({ id });
});
handlers["api/account-delete"] = withMutation(async function({ id }) {
  checkFileOpen();
  return handlers["account-close"]({ id, forced: true });
});
handlers["api/account-balance"] = withMutation(async function({
  id,
  cutoff = /* @__PURE__ */ new Date()
}) {
  checkFileOpen();
  return handlers["account-balance"]({ id, cutoff });
});
handlers["api/categories-get"] = async function({
  grouped
} = {}) {
  checkFileOpen();
  const result = await handlers["get-categories"]();
  return grouped ? result.grouped.map(categoryGroupModel.toExternal) : result.list.map(categoryModel.toExternal);
};
handlers["api/category-groups-get"] = async function() {
  checkFileOpen();
  const groups = await handlers["get-category-groups"]();
  return groups.map(categoryGroupModel.toExternal);
};
handlers["api/category-group-create"] = withMutation(async function({
  group
}) {
  checkFileOpen();
  return handlers["category-group-create"]({
    name: group.name,
    hidden: group.hidden
  });
});
handlers["api/category-group-update"] = withMutation(async function({
  id,
  fields
}) {
  checkFileOpen();
  return handlers["category-group-update"]({
    id,
    ...categoryGroupModel.fromExternal(fields)
  });
});
handlers["api/category-group-delete"] = withMutation(async function({
  id,
  transferCategoryId
}) {
  checkFileOpen();
  return handlers["category-group-delete"]({
    id,
    transferId: transferCategoryId
  });
});
handlers["api/category-create"] = withMutation(async function({ category }) {
  checkFileOpen();
  return handlers["category-create"]({
    name: category.name,
    groupId: category.group_id,
    isIncome: category.is_income,
    hidden: category.hidden
  });
});
handlers["api/category-update"] = withMutation(async function({ id, fields }) {
  checkFileOpen();
  return handlers["category-update"]({
    id,
    ...categoryModel.fromExternal(fields)
  });
});
handlers["api/category-delete"] = withMutation(async function({
  id,
  transferCategoryId
}) {
  checkFileOpen();
  return handlers["category-delete"]({
    id,
    transferId: transferCategoryId
  });
});
handlers["api/common-payees-get"] = async function() {
  checkFileOpen();
  const payees = await handlers["common-payees-get"]();
  return payees.map(payeeModel.toExternal);
};
handlers["api/payees-get"] = async function() {
  checkFileOpen();
  const payees = await handlers["payees-get"]();
  return payees.map(payeeModel.toExternal);
};
handlers["api/payee-create"] = withMutation(async function({ payee }) {
  checkFileOpen();
  return handlers["payee-create"]({ name: payee.name });
});
handlers["api/payee-update"] = withMutation(async function({ id, fields }) {
  checkFileOpen();
  return handlers["payees-batch-change"]({
    updated: [{ id, ...payeeModel.fromExternal(fields) }]
  });
});
handlers["api/payee-delete"] = withMutation(async function({ id }) {
  checkFileOpen();
  return handlers["payees-batch-change"]({ deleted: [{ id }] });
});
handlers["api/payees-merge"] = withMutation(async function({
  targetId,
  mergeIds
}) {
  checkFileOpen();
  return handlers["payees-merge"]({ targetId, mergeIds });
});
handlers["api/rules-get"] = async function() {
  checkFileOpen();
  return handlers["rules-get"]();
};
handlers["api/payee-rules-get"] = async function({ id }) {
  checkFileOpen();
  return handlers["payees-get-rules"]({ id });
};
handlers["api/rule-create"] = withMutation(async function({ rule }) {
  checkFileOpen();
  const addedRule = await handlers["rule-add"](rule);
  if ("error" in addedRule) {
    throw APIError("Failed creating a new rule", addedRule.error);
  }
  return addedRule;
});
handlers["api/rule-update"] = withMutation(async function({ rule }) {
  checkFileOpen();
  const updatedRule = await handlers["rule-update"](rule);
  if ("error" in updatedRule) {
    throw APIError("Failed updating the rule", updatedRule.error);
  }
  return updatedRule;
});
handlers["api/rule-delete"] = withMutation(async function(id) {
  checkFileOpen();
  return handlers["rule-delete"](id);
});
function installAPI(serverHandlers) {
  const merged = Object.assign({}, serverHandlers, handlers);
  handlers = merged;
  return merged;
}
const app$g = createApp();
app$g.method("get-did-bootstrap", didBootstrap);
app$g.method("subscribe-needs-bootstrap", needsBootstrap);
app$g.method("subscribe-bootstrap", bootstrap);
app$g.method("subscribe-get-login-methods", getLoginMethods);
app$g.method("subscribe-get-user", getUser);
app$g.method("subscribe-change-password", changePassword);
app$g.method("subscribe-sign-in", signIn);
app$g.method("subscribe-sign-out", signOut);
app$g.method("subscribe-set-token", setToken);
app$g.method("enable-openid", enableOpenId);
app$g.method("get-openid-config", getOpenIdConfig);
app$g.method("enable-password", enablePassword);
async function didBootstrap() {
  return Boolean(await getItem("did-bootstrap"));
}
async function needsBootstrap({ url } = {}) {
  if (url && !isValidBaseURL(url)) {
    return { error: "get-server-failure" };
  }
  let serverConfig;
  try {
    serverConfig = getServer(url);
    if (!serverConfig) {
      return { bootstrapped: true, hasServer: false };
    }
  } catch (err) {
    return { error: "get-server-failure" };
  }
  let resText;
  try {
    resText = await get(serverConfig.SIGNUP_SERVER + "/needs-bootstrap");
  } catch (err) {
    return { error: "network-failure" };
  }
  let res;
  try {
    res = JSON.parse(resText);
  } catch (err) {
    return { error: "parse-failure" };
  }
  return {
    bootstrapped: res.data.bootstrapped,
    availableLoginMethods: res.data.availableLoginMethods || [
      { method: "password", active: true, displayName: "Password" }
    ],
    multiuser: res.data.multiuser || false,
    hasServer: true
  };
}
async function bootstrap(loginConfig) {
  try {
    const serverConfig = getServer();
    if (!serverConfig) {
      throw new Error("No sync server configured.");
    }
    await post(serverConfig.SIGNUP_SERVER + "/bootstrap", loginConfig);
  } catch (err) {
    if (err instanceof PostError) {
      return {
        error: err.reason || "network-failure"
      };
    }
    throw err;
  }
  return {};
}
async function getLoginMethods() {
  let res;
  try {
    const serverConfig = getServer();
    if (!serverConfig) {
      throw new Error("No sync server configured.");
    }
    res = await fetch(serverConfig.SIGNUP_SERVER + "/login-methods").then(
      (res2) => res2.json()
    );
  } catch (err) {
    if (err instanceof PostError) {
      return {
        error: err.reason || "network-failure"
      };
    }
    throw err;
  }
  if (res.methods) {
    return { methods: res.methods };
  }
  return { error: "internal" };
}
async function getUser() {
  const serverConfig = getServer();
  if (!serverConfig) {
    if (!await getItem("did-bootstrap")) {
      return null;
    }
    return { offline: false };
  }
  const userToken = await getItem("user-token");
  if (!userToken) {
    return null;
  }
  try {
    const res = await get(serverConfig.SIGNUP_SERVER + "/validate", {
      headers: {
        "X-ACTUAL-TOKEN": userToken
      }
    });
    let tokenExpired = false;
    const {
      status,
      reason,
      data: {
        userName = null,
        permission = "",
        userId = null,
        displayName = null,
        loginMethod = null
      } = {}
    } = JSON.parse(res) || {};
    if (status === "error") {
      if (reason === "unauthorized") {
        return null;
      } else if (reason === "token-expired") {
        tokenExpired = true;
      } else {
        return { offline: true };
      }
    }
    return {
      offline: false,
      userName,
      permission,
      userId,
      displayName,
      loginMethod,
      tokenExpired
    };
  } catch (e) {
    console.log(e);
    return { offline: true };
  }
}
async function changePassword({ password }) {
  const userToken = await getItem("user-token");
  if (!userToken) {
    return { error: "not-logged-in" };
  }
  try {
    const serverConfig = getServer();
    if (!serverConfig) {
      throw new Error("No sync server configured.");
    }
    await post(serverConfig.SIGNUP_SERVER + "/change-password", {
      token: userToken,
      password
    });
  } catch (err) {
    if (err instanceof PostError) {
      return {
        error: err.reason || "network-failure"
      };
    }
    throw err;
  }
  return {};
}
async function signIn(loginInfo) {
  if (typeof loginInfo.loginMethod !== "string" || loginInfo.loginMethod == null) {
    loginInfo.loginMethod = "password";
  }
  let res;
  try {
    const serverConfig = getServer();
    if (!serverConfig) {
      throw new Error("No sync server configured.");
    }
    res = await post(serverConfig.SIGNUP_SERVER + "/login", loginInfo);
  } catch (err) {
    if (err instanceof PostError) {
      return {
        error: err.reason || "network-failure"
      };
    }
    throw err;
  }
  if (res.returnUrl) {
    return { redirectUrl: res.returnUrl };
  }
  if (!res.token) {
    throw new Error("login: User token not set");
  }
  await setItem("user-token", res.token);
  return {};
}
async function signOut() {
  unloadAllKeys();
  await multiRemove([
    "user-token",
    "encrypt-keys",
    "lastBudget",
    "readOnly"
  ]);
  return "ok";
}
async function setToken({ token }) {
  await setItem("user-token", token);
}
async function enableOpenId(openIdConfig) {
  try {
    const userToken = await getItem("user-token");
    if (!userToken) {
      return { error: "unauthorized" };
    }
    const serverConfig = getServer();
    if (!serverConfig) {
      throw new Error("No sync server configured.");
    }
    await post(serverConfig.BASE_SERVER + "/openid/enable", openIdConfig, {
      "X-ACTUAL-TOKEN": userToken
    });
  } catch (err) {
    if (err instanceof PostError) {
      return {
        error: err.reason || "network-failure"
      };
    }
    throw err;
  }
  return {};
}
async function getOpenIdConfig({ password }) {
  try {
    const userToken = await getItem("user-token");
    const serverConfig = getServer();
    if (!serverConfig) {
      throw new Error("No sync server configured.");
    }
    const res = await post(
      serverConfig.BASE_SERVER + "/openid/config",
      { password },
      {
        "X-ACTUAL-TOKEN": userToken
      }
    );
    if (res) {
      return res;
    }
    return null;
  } catch (err) {
    if (err instanceof PostError) {
      return {
        error: err.reason || "network-failure"
      };
    }
    throw err;
  }
}
async function enablePassword(passwordConfig) {
  try {
    const userToken = await getItem("user-token");
    if (!userToken) {
      return { error: "unauthorized" };
    }
    const serverConfig = getServer();
    if (!serverConfig) {
      throw new Error("No sync server configured.");
    }
    await post(serverConfig.BASE_SERVER + "/openid/disable", passwordConfig, {
      "X-ACTUAL-TOKEN": userToken
    });
  } catch (err) {
    if (err instanceof PostError) {
      return {
        error: err.reason || "network-failure"
      };
    }
    throw err;
  }
  return {};
}
function peg$subclass$1(child, parent) {
  function C() {
    this.constructor = child;
  }
  C.prototype = parent.prototype;
  child.prototype = new C();
}
function peg$SyntaxError$1(message, expected, found, location) {
  var self = Error.call(this, message);
  if (Object.setPrototypeOf) {
    Object.setPrototypeOf(self, peg$SyntaxError$1.prototype);
  }
  self.expected = expected;
  self.found = found;
  self.location = location;
  self.name = "SyntaxError";
  return self;
}
peg$subclass$1(peg$SyntaxError$1, Error);
function peg$padEnd$1(str, targetLength, padString) {
  padString = padString || " ";
  if (str.length > targetLength) {
    return str;
  }
  targetLength -= str.length;
  padString += padString.repeat(targetLength);
  return str + padString.slice(0, targetLength);
}
peg$SyntaxError$1.prototype.format = function(sources) {
  var str = "Error: " + this.message;
  if (this.location) {
    var src = null;
    var k;
    for (k = 0; k < sources.length; k++) {
      if (sources[k].source === this.location.source) {
        src = sources[k].text.split(/\r\n|\n|\r/g);
        break;
      }
    }
    var s = this.location.start;
    var offset_s = this.location.source && typeof this.location.source.offset === "function" ? this.location.source.offset(s) : s;
    var loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
    if (src) {
      var e = this.location.end;
      var filler = peg$padEnd$1("", offset_s.line.toString().length, " ");
      var line = src[s.line - 1];
      var last2 = s.line === e.line ? e.column : line.length + 1;
      var hatLen = last2 - s.column || 1;
      str += "\n --> " + loc + "\n" + filler + " |\n" + offset_s.line + " | " + line + "\n" + filler + " | " + peg$padEnd$1("", s.column - 1, " ") + peg$padEnd$1("", hatLen, "^");
    } else {
      str += "\n at " + loc;
    }
  }
  return str;
};
peg$SyntaxError$1.buildMessage = function(expected, found) {
  var DESCRIBE_EXPECTATION_FNS = {
    literal: function(expectation) {
      return '"' + literalEscape(expectation.text) + '"';
    },
    class: function(expectation) {
      var escapedParts = expectation.parts.map(function(part) {
        return Array.isArray(part) ? classEscape(part[0]) + "-" + classEscape(part[1]) : classEscape(part);
      });
      return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]";
    },
    any: function() {
      return "any character";
    },
    end: function() {
      return "end of input";
    },
    other: function(expectation) {
      return expectation.description;
    }
  };
  function hex(ch) {
    return ch.charCodeAt(0).toString(16).toUpperCase();
  }
  function literalEscape(s) {
    return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
      return "\\x0" + hex(ch);
    }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
      return "\\x" + hex(ch);
    });
  }
  function classEscape(s) {
    return s.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\^/g, "\\^").replace(/-/g, "\\-").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
      return "\\x0" + hex(ch);
    }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
      return "\\x" + hex(ch);
    });
  }
  function describeExpectation(expectation) {
    return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
  }
  function describeExpected(expected2) {
    var descriptions = expected2.map(describeExpectation);
    var i, j;
    descriptions.sort();
    if (descriptions.length > 0) {
      for (i = 1, j = 1; i < descriptions.length; i++) {
        if (descriptions[i - 1] !== descriptions[i]) {
          descriptions[j] = descriptions[i];
          j++;
        }
      }
      descriptions.length = j;
    }
    switch (descriptions.length) {
      case 1:
        return descriptions[0];
      case 2:
        return descriptions[0] + " or " + descriptions[1];
      default:
        return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
    }
  }
  function describeFound(found2) {
    return found2 ? '"' + literalEscape(found2) + '"' : "end of input";
  }
  return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
};
function peg$parse$1(input, options) {
  options = options !== void 0 ? options : {};
  var peg$FAILED = {};
  var peg$source = options.grammarSource;
  var peg$startRuleFunctions = { expr: peg$parseexpr };
  var peg$startRuleFunction = peg$parseexpr;
  var peg$c0 = "source";
  var peg$c1 = "sink";
  var peg$c2 = " ";
  var peg$c3 = " source";
  var peg$c4 = " sink";
  var peg$r0 = /^[0-9]/;
  var peg$e0 = peg$literalExpectation("source", false);
  var peg$e1 = peg$literalExpectation("sink", false);
  var peg$e2 = peg$otherExpectation("space");
  var peg$e3 = peg$literalExpectation(" ", false);
  var peg$e4 = peg$otherExpectation("digit");
  var peg$e5 = peg$classExpectation([["0", "9"]], false, false);
  var peg$e6 = peg$otherExpectation("weight");
  var peg$e7 = peg$otherExpectation("Name");
  var peg$e8 = peg$literalExpectation(" source", false);
  var peg$e9 = peg$anyExpectation();
  var peg$e10 = peg$literalExpectation(" sink", false);
  var peg$f0 = function() {
    return { group: null, type: "source" };
  };
  var peg$f1 = function(weight) {
    return { type: "sink", weight: +weight || 1, group: null };
  };
  var peg$f2 = function(group) {
    return { group: group || null, type: "source" };
  };
  var peg$f3 = function(group, weight) {
    return { type: "sink", weight: +weight || 1, group: group || null };
  };
  var peg$f4 = function(group) {
    return { group, type: null };
  };
  var peg$f5 = function(weight) {
    return +weight;
  };
  var peg$currPos = 0;
  var peg$posDetailsCache = [{ line: 1, column: 1 }];
  var peg$maxFailPos = 0;
  var peg$maxFailExpected = [];
  var peg$silentFails = 0;
  var peg$result;
  if ("startRule" in options) {
    if (!(options.startRule in peg$startRuleFunctions)) {
      throw new Error(`Can't start parsing from rule "` + options.startRule + '".');
    }
    peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
  }
  function peg$literalExpectation(text, ignoreCase) {
    return { type: "literal", text, ignoreCase };
  }
  function peg$classExpectation(parts, inverted, ignoreCase) {
    return { type: "class", parts, inverted, ignoreCase };
  }
  function peg$anyExpectation() {
    return { type: "any" };
  }
  function peg$endExpectation() {
    return { type: "end" };
  }
  function peg$otherExpectation(description) {
    return { type: "other", description };
  }
  function peg$computePosDetails(pos) {
    var details = peg$posDetailsCache[pos];
    var p;
    if (details) {
      return details;
    } else {
      p = pos - 1;
      while (!peg$posDetailsCache[p]) {
        p--;
      }
      details = peg$posDetailsCache[p];
      details = {
        line: details.line,
        column: details.column
      };
      while (p < pos) {
        if (input.charCodeAt(p) === 10) {
          details.line++;
          details.column = 1;
        } else {
          details.column++;
        }
        p++;
      }
      peg$posDetailsCache[pos] = details;
      return details;
    }
  }
  function peg$computeLocation(startPos, endPos, offset) {
    var startPosDetails = peg$computePosDetails(startPos);
    var endPosDetails = peg$computePosDetails(endPos);
    var res = {
      source: peg$source,
      start: {
        offset: startPos,
        line: startPosDetails.line,
        column: startPosDetails.column
      },
      end: {
        offset: endPos,
        line: endPosDetails.line,
        column: endPosDetails.column
      }
    };
    return res;
  }
  function peg$fail(expected) {
    if (peg$currPos < peg$maxFailPos) {
      return;
    }
    if (peg$currPos > peg$maxFailPos) {
      peg$maxFailPos = peg$currPos;
      peg$maxFailExpected = [];
    }
    peg$maxFailExpected.push(expected);
  }
  function peg$buildStructuredError(expected, found, location) {
    return new peg$SyntaxError$1(
      peg$SyntaxError$1.buildMessage(expected, found),
      expected,
      found,
      location
    );
  }
  function peg$parseexpr() {
    var s0, s1, s3, s5;
    s0 = peg$currPos;
    s1 = peg$parsesource();
    if (s1 !== peg$FAILED) {
      s1 = peg$f0();
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parsesink();
      if (s1 !== peg$FAILED) {
        peg$parse_();
        s3 = peg$parseweight();
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        s0 = peg$f1(s3);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parsesourcegroup();
        peg$parse_();
        s3 = peg$parsesource();
        if (s3 !== peg$FAILED) {
          s0 = peg$f2(s1);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parsesinkgroup();
          peg$parse_();
          s3 = peg$parsesink();
          if (s3 !== peg$FAILED) {
            peg$parse_();
            s5 = peg$parseweight();
            if (s5 === peg$FAILED) {
              s5 = null;
            }
            s0 = peg$f3(s1, s5);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parsesourcegroup();
            s1 = peg$f4(s1);
            s0 = s1;
          }
        }
      }
    }
    return s0;
  }
  function peg$parsesource() {
    var s0;
    if (input.substr(peg$currPos, 6) === peg$c0) {
      s0 = peg$c0;
      peg$currPos += 6;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e0);
      }
    }
    return s0;
  }
  function peg$parsesink() {
    var s0;
    if (input.substr(peg$currPos, 4) === peg$c1) {
      s0 = peg$c1;
      peg$currPos += 4;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e1);
      }
    }
    return s0;
  }
  function peg$parse_() {
    var s0, s1;
    peg$silentFails++;
    s0 = [];
    if (input.charCodeAt(peg$currPos) === 32) {
      s1 = peg$c2;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e3);
      }
    }
    if (s1 !== peg$FAILED) {
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        if (input.charCodeAt(peg$currPos) === 32) {
          s1 = peg$c2;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e3);
          }
        }
      }
    } else {
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e2);
      }
    }
    return s0;
  }
  function peg$parsed() {
    var s0;
    peg$silentFails++;
    if (peg$r0.test(input.charAt(peg$currPos))) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e5);
      }
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      if (peg$silentFails === 0) {
        peg$fail(peg$e4);
      }
    }
    return s0;
  }
  function peg$parseweight() {
    var s0, s1, s2, s3;
    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$currPos;
    s2 = [];
    s3 = peg$parsed();
    if (s3 !== peg$FAILED) {
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$parsed();
      }
    } else {
      s2 = peg$FAILED;
    }
    if (s2 !== peg$FAILED) {
      s1 = input.substring(s1, peg$currPos);
    } else {
      s1 = s2;
    }
    if (s1 !== peg$FAILED) {
      s1 = peg$f5(s1);
    }
    s0 = s1;
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e6);
      }
    }
    return s0;
  }
  function peg$parsesourcegroup() {
    var s0, s1, s2, s3, s4;
    peg$silentFails++;
    s0 = peg$currPos;
    s1 = [];
    s2 = peg$currPos;
    s3 = peg$currPos;
    peg$silentFails++;
    if (input.substr(peg$currPos, 7) === peg$c3) {
      s4 = peg$c3;
      peg$currPos += 7;
    } else {
      s4 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e8);
      }
    }
    peg$silentFails--;
    if (s4 === peg$FAILED) {
      s3 = void 0;
    } else {
      peg$currPos = s3;
      s3 = peg$FAILED;
    }
    if (s3 !== peg$FAILED) {
      if (input.length > peg$currPos) {
        s4 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e9);
        }
      }
      if (s4 !== peg$FAILED) {
        s3 = [s3, s4];
        s2 = s3;
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
    } else {
      peg$currPos = s2;
      s2 = peg$FAILED;
    }
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      s2 = peg$currPos;
      s3 = peg$currPos;
      peg$silentFails++;
      if (input.substr(peg$currPos, 7) === peg$c3) {
        s4 = peg$c3;
        peg$currPos += 7;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e8);
        }
      }
      peg$silentFails--;
      if (s4 === peg$FAILED) {
        s3 = void 0;
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      if (s3 !== peg$FAILED) {
        if (input.length > peg$currPos) {
          s4 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e9);
          }
        }
        if (s4 !== peg$FAILED) {
          s3 = [s3, s4];
          s2 = s3;
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
    }
    s0 = input.substring(s0, peg$currPos);
    peg$silentFails--;
    s1 = peg$FAILED;
    if (peg$silentFails === 0) {
      peg$fail(peg$e7);
    }
    return s0;
  }
  function peg$parsesinkgroup() {
    var s0, s1, s2, s3, s4;
    peg$silentFails++;
    s0 = peg$currPos;
    s1 = [];
    s2 = peg$currPos;
    s3 = peg$currPos;
    peg$silentFails++;
    if (input.substr(peg$currPos, 5) === peg$c4) {
      s4 = peg$c4;
      peg$currPos += 5;
    } else {
      s4 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e10);
      }
    }
    peg$silentFails--;
    if (s4 === peg$FAILED) {
      s3 = void 0;
    } else {
      peg$currPos = s3;
      s3 = peg$FAILED;
    }
    if (s3 !== peg$FAILED) {
      if (input.length > peg$currPos) {
        s4 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e9);
        }
      }
      if (s4 !== peg$FAILED) {
        s3 = [s3, s4];
        s2 = s3;
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
    } else {
      peg$currPos = s2;
      s2 = peg$FAILED;
    }
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      s2 = peg$currPos;
      s3 = peg$currPos;
      peg$silentFails++;
      if (input.substr(peg$currPos, 5) === peg$c4) {
        s4 = peg$c4;
        peg$currPos += 5;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e10);
        }
      }
      peg$silentFails--;
      if (s4 === peg$FAILED) {
        s3 = void 0;
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      if (s3 !== peg$FAILED) {
        if (input.length > peg$currPos) {
          s4 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e9);
          }
        }
        if (s4 !== peg$FAILED) {
          s3 = [s3, s4];
          s2 = s3;
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
    }
    s0 = input.substring(s0, peg$currPos);
    peg$silentFails--;
    s1 = peg$FAILED;
    if (peg$silentFails === 0) {
      peg$fail(peg$e7);
    }
    return s0;
  }
  peg$result = peg$startRuleFunction();
  if (peg$result !== peg$FAILED && peg$currPos === input.length) {
    return peg$result;
  } else {
    if (peg$result !== peg$FAILED && peg$currPos < input.length) {
      peg$fail(peg$endExpectation());
    }
    throw peg$buildStructuredError(
      peg$maxFailExpected,
      peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
      peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
    );
  }
}
function cleanupTemplate({ month }) {
  return processCleanup(month);
}
async function applyGroupCleanups(month, sourceGroups, sinkGroups, generalGroups) {
  const sheetName = sheetForMonth(month);
  const warnings = [];
  const db_month = parseInt(month.replace("-", ""));
  let groupLength = sourceGroups.length;
  while (groupLength > 0) {
    const groupName = sourceGroups[0].group;
    const tempSourceGroups = sourceGroups.filter((c) => c.group === groupName);
    const sinkGroup = sinkGroups.filter((c) => c.group === groupName);
    const generalGroup = generalGroups.filter((c) => c.group === groupName);
    let total_weight = 0;
    if (sinkGroup.length > 0 || generalGroup.length > 0) {
      for (let ii = 0; ii < tempSourceGroups.length; ii++) {
        const balance = await getSheetValue(
          sheetName,
          `leftover-${tempSourceGroups[ii].category}`
        );
        const budgeted = await getSheetValue(
          sheetName,
          `budget-${tempSourceGroups[ii].category}`
        );
        await setBudget({
          category: tempSourceGroups[ii].category,
          month,
          amount: budgeted - balance
        });
      }
      for (let ii = 0; ii < sinkGroup.length; ii++) {
        total_weight += sinkGroup[ii].weight;
      }
      for (let ii = 0; ii < generalGroup.length; ii++) {
        const budgetAvailable2 = await getSheetValue(sheetName, `to-budget`);
        const balance = await getSheetValue(
          sheetName,
          `leftover-${generalGroup[ii].category}`
        );
        const budgeted = await getSheetValue(
          sheetName,
          `budget-${generalGroup[ii].category}`
        );
        const to_budget = budgeted + Math.abs(balance);
        const categoryId = generalGroup[ii].category;
        let carryover = await first(
          `SELECT carryover FROM zero_budgets WHERE month = ? and category = ?`,
          [db_month, categoryId]
        );
        if (carryover === null) {
          carryover = { carryover: 0 };
        }
        if (balance < 0 && Math.abs(balance) <= budgetAvailable2 && !generalGroup[ii].category.is_income && carryover.carryover === 0) {
          await setBudget({
            category: generalGroup[ii].category,
            month,
            amount: to_budget
          });
        } else if (balance < 0 && !generalGroup[ii].category.is_income && carryover.carryover === 0 && Math.abs(balance) > budgetAvailable2) {
          await setBudget({
            category: generalGroup[ii].category,
            month,
            amount: budgeted + budgetAvailable2
          });
        }
      }
      const budgetAvailable = await getSheetValue(sheetName, `to-budget`);
      for (let ii = 0; ii < sinkGroup.length; ii++) {
        const budgeted = await getSheetValue(
          sheetName,
          `budget-${sinkGroup[ii].category}`
        );
        const to_budget = budgeted + Math.round(sinkGroup[ii].weight / total_weight * budgetAvailable);
        await setBudget({
          category: sinkGroup[ii].category,
          month,
          amount: to_budget
        });
      }
    } else {
      warnings.push(groupName + " has no matching sink categories.");
    }
    sourceGroups = sourceGroups.filter((c) => c.group !== groupName);
    groupLength = sourceGroups.length;
  }
  return warnings;
}
async function processCleanup(month) {
  let num_sources = 0;
  let num_sinks = 0;
  let total_weight = 0;
  const errors = [];
  const warnings = [];
  const sinkCategory = [];
  const db_month = parseInt(month.replace("-", ""));
  const category_templates = await getCategoryTemplates();
  const categories = await all(
    "SELECT * FROM v_categories WHERE tombstone = 0"
  );
  const sheetName = sheetForMonth(month);
  const groupSource = [];
  const groupSink = [];
  const groupGeneral = [];
  for (let c = 0; c < categories.length; c++) {
    const category = categories[c];
    const template = category_templates[category.id];
    if (template) {
      if (template.filter((t) => t.type === "source" && t.group !== null).length > 0) {
        groupSource.push({
          category: category.id,
          group: template.filter(
            (t) => t.type === "source" && t.group !== null
          )[0].group
        });
      }
      if (template.filter((t) => t.type === "sink" && t.group !== null).length > 0) {
        groupSink.push({
          category: category.id,
          group: template.filter((t) => t.type === "sink" && t.group !== null)[0].group,
          weight: template.filter((t) => t.type === "sink" && t.group !== null)[0].weight
        });
      }
      if (template.filter((t) => t.type === null && t.group !== null).length > 0) {
        groupGeneral.push({ category: category.id, group: template[0].group });
      }
    }
  }
  const newWarnings = await applyGroupCleanups(
    month,
    groupSource,
    groupSink,
    groupGeneral
  );
  warnings.splice(1, 0, ...newWarnings);
  for (let c = 0; c < categories.length; c++) {
    const category = categories[c];
    const template = category_templates[category.id];
    if (template) {
      if (template.filter((t) => t.type === "source" && t.group === null).length > 0) {
        const balance = await getSheetValue(
          sheetName,
          `leftover-${category.id}`
        );
        const budgeted = await getSheetValue(
          sheetName,
          `budget-${category.id}`
        );
        if (balance >= 0) {
          await setBudget({
            category: category.id,
            month,
            amount: budgeted - balance
          });
          await setGoal({
            category: category.id,
            month,
            goal: budgeted - balance,
            long_goal: 0
          });
          num_sources += 1;
        } else {
          warnings.push(category.name + " does not have available funds.");
        }
        const carryover = await first(
          `SELECT carryover FROM zero_budgets WHERE month = ? and category = ?`,
          [db_month, category.id]
        );
        if (carryover !== null) {
          if (carryover.carryover === 1) ;
        }
      }
      if (template.filter((t) => t.type === "sink" && t.group === null).length > 0) {
        sinkCategory.push({ cat: category, temp: template });
        num_sinks += 1;
        total_weight += template.filter((w) => w.type === "sink")[0].weight;
      }
    }
  }
  for (let c = 0; c < categories.length; c++) {
    const category = categories[c];
    const budgetAvailable2 = await getSheetValue(sheetName, `to-budget`);
    const balance = await getSheetValue(sheetName, `leftover-${category.id}`);
    const budgeted = await getSheetValue(sheetName, `budget-${category.id}`);
    const to_budget = budgeted + Math.abs(balance);
    const categoryId = category.id;
    let carryover = await first(
      `SELECT carryover FROM zero_budgets WHERE month = ? and category = ?`,
      [db_month, categoryId]
    );
    if (carryover === null) {
      carryover = { carryover: 0 };
    }
    if (balance < 0 && Math.abs(balance) <= budgetAvailable2 && !category.is_income && carryover.carryover === 0) {
      await setBudget({
        category: category.id,
        month,
        amount: to_budget
      });
    } else if (balance < 0 && !category.is_income && carryover.carryover === 0 && Math.abs(balance) > budgetAvailable2) {
      await setBudget({
        category: category.id,
        month,
        amount: budgeted + budgetAvailable2
      });
    }
  }
  const budgetAvailable = await getSheetValue(sheetName, `to-budget`);
  if (budgetAvailable < 0) {
    warnings.push("Global: No funds are available to reallocate.");
  }
  for (let c = 0; c < sinkCategory.length; c++) {
    const budgeted = await getSheetValue(
      sheetName,
      `budget-${sinkCategory[c].cat.id}`
    );
    const categoryId = sinkCategory[c].cat.id;
    const weight = sinkCategory[c].temp.filter((w) => w.type === "sink")[0].weight;
    let to_budget = budgeted + Math.round(weight / total_weight * budgetAvailable);
    if (c === sinkCategory.length - 1) {
      const currentBudgetAvailable = await getSheetValue(
        sheetName,
        `to-budget`
      );
      if (to_budget > currentBudgetAvailable) {
        to_budget = budgeted + currentBudgetAvailable;
      }
    }
    await setBudget({
      category: categoryId,
      month,
      amount: to_budget
    });
  }
  if (num_sources === 0) {
    if (errors.length) {
      return {
        type: "error",
        sticky: true,
        message: "There were errors interpreting some templates:",
        pre: errors.join("\n\n")
      };
    } else if (warnings.length) {
      return {
        type: "warning",
        message: "Global: Funds not available:",
        pre: warnings.join("\n\n")
      };
    } else {
      return {
        type: "message",
        message: "All categories were up to date."
      };
    }
  } else {
    const applied = `Successfully returned funds from ${num_sources} ${num_sources === 1 ? "source" : "sources"} and funded ${num_sinks} sinking ${num_sinks === 1 ? "fund" : "funds"}.`;
    if (errors.length) {
      return {
        sticky: true,
        message: `${applied} There were errors interpreting some templates:`,
        pre: errors.join("\n\n")
      };
    } else if (warnings.length) {
      return {
        type: "warning",
        message: "Global: Funds not available:",
        pre: warnings.join("\n\n")
      };
    } else if (budgetAvailable === 0) {
      return {
        type: "message",
        message: "All categories were up to date."
      };
    } else {
      return {
        type: "message",
        message: applied
      };
    }
  }
}
const TEMPLATE_PREFIX$1 = "#cleanup ";
async function getCategoryTemplates() {
  const templates = {};
  const notes = await all(
    `SELECT * FROM notes WHERE lower(note) like '%${TEMPLATE_PREFIX$1}%'`
  );
  for (let n = 0; n < notes.length; n++) {
    const lines = notes[n].note.split("\n");
    const template_lines = [];
    for (let l = 0; l < lines.length; l++) {
      const line = lines[l].trim();
      if (!line.toLowerCase().startsWith(TEMPLATE_PREFIX$1)) continue;
      const expression = line.slice(TEMPLATE_PREFIX$1.length);
      try {
        const parsed = peg$parse$1(expression);
        template_lines.push(parsed);
      } catch (e) {
        template_lines.push({ type: "error", line, error: e });
      }
    }
    if (template_lines.length) {
      templates[notes[n].id] = template_lines;
    }
  }
  return templates;
}
function takeDates(config2) {
  const schedule = new standardDateAdapter.Schedule({ rrules: recurConfigToRSchedule(config2) });
  return schedule.occurrences({ take: 3 }).toArray().map((d2) => d2.date);
}
async function getTransactions(date, account) {
  const { data } = await aqlQuery(
    q("transactions").filter({
      account,
      schedule: null,
      // Don't match transfers
      "payee.transfer_acct": null,
      $and: [
        { date: { $gte: d__namespace.subDays(date, 2) } },
        { date: { $lte: d__namespace.addDays(date, 2) } }
      ]
    }).select("*").options({ splits: "none" })
  );
  return data;
}
function getRank(day1, day2) {
  const dayDiff = Math.abs(
    d__namespace.differenceInDays(parseDate$1(day1), parseDate$1(day2))
  );
  return 1 / (dayDiff + 1);
}
function matchSchedules(allOccurs, config2) {
  allOccurs = [...allOccurs].reverse();
  const baseOccur = allOccurs[0];
  const occurs = allOccurs.slice(1);
  const schedules = [];
  for (const trans of baseOccur.transactions) {
    const threshold = getApproxNumberThreshold(trans.amount);
    const payee = trans.payee;
    const found = occurs.map((occur) => {
      let matched = occur.transactions.find(
        (t) => t.amount >= trans.amount - threshold && t.amount <= trans.amount + threshold
      );
      matched = matched && matched.payee === payee ? matched : null;
      if (matched) {
        return { trans: matched, rank: getRank(occur.date, matched.date) };
      }
      return null;
    });
    if (found.indexOf(null) !== -1) {
      continue;
    }
    const rank = found.reduce(
      (total, match) => total + match.rank,
      getRank(baseOccur.date, trans.date)
    );
    const exactAmount = found.reduce(
      (exact, match) => exact && match.trans.amount === trans.amount,
      true
    );
    schedules.push({
      rank,
      amount: trans.amount,
      account: trans.account,
      payee: trans.payee,
      date: config2,
      // Exact dates rank as 1, so all of them matches exactly it
      // would equal the number of `allOccurs`
      exactDate: rank === allOccurs.length,
      exactAmount
    });
  }
  return schedules;
}
async function schedulesForPattern(baseStart, numDays, baseConfig, accountId) {
  let schedules = [];
  for (let i = 0; i < numDays; i++) {
    const start = d__namespace.addDays(baseStart, i);
    let config2;
    if (typeof baseConfig === "function") {
      config2 = baseConfig(start);
      if (config2 === false) {
        continue;
      }
    } else {
      config2 = { ...baseConfig, start };
    }
    config2.start = dayFromDate(config2.start);
    const data = [];
    const dates = takeDates(config2);
    for (const date of dates) {
      data.push({
        date: dayFromDate(date),
        transactions: await getTransactions(date, accountId)
      });
    }
    schedules = schedules.concat(matchSchedules(data, config2));
  }
  return schedules;
}
async function weekly(startDate, accountId) {
  return schedulesForPattern(
    d__namespace.subWeeks(parseDate$1(startDate), 4),
    7 * 2,
    { frequency: "weekly" },
    accountId
  );
}
async function every2weeks(startDate, accountId) {
  return schedulesForPattern(
    // 6 weeks would cover 3 instances, but we also scan an addition
    // week back
    d__namespace.subWeeks(parseDate$1(startDate), 7),
    7 * 2,
    { frequency: "weekly", interval: 2 },
    accountId
  );
}
async function monthly(startDate, accountId) {
  return schedulesForPattern(
    d__namespace.subMonths(parseDate$1(startDate), 4),
    31 * 2,
    (start) => {
      if (d__namespace.getDate(start) > 28) {
        return false;
      }
      return { start, frequency: "monthly" };
    },
    accountId
  );
}
async function monthlyLastDay(startDate, accountId) {
  const s1 = await schedulesForPattern(
    d__namespace.subMonths(parseDate$1(startDate), 3),
    1,
    { frequency: "monthly", patterns: [{ type: "day", value: -1 }] },
    accountId
  );
  const s2 = await schedulesForPattern(
    d__namespace.subMonths(parseDate$1(startDate), 4),
    1,
    { frequency: "monthly", patterns: [{ type: "day", value: -1 }] },
    accountId
  );
  return s1.concat(s2);
}
async function monthly1stor3rd(startDate, accountId) {
  return schedulesForPattern(
    d__namespace.subWeeks(parseDate$1(startDate), 8),
    14,
    (start) => {
      const day = d__namespace.format(/* @__PURE__ */ new Date(), "iiii");
      const dayValue = day.slice(0, 2).toUpperCase();
      return {
        start,
        frequency: "monthly",
        patterns: [
          { type: dayValue, value: 1 },
          { type: dayValue, value: 3 }
        ]
      };
    },
    accountId
  );
}
async function monthly2ndor4th(startDate, accountId) {
  return schedulesForPattern(
    d__namespace.subMonths(parseDate$1(startDate), 8),
    14,
    (start) => {
      const day = d__namespace.format(/* @__PURE__ */ new Date(), "iiii");
      const dayValue = day.slice(0, 2).toUpperCase();
      return {
        start,
        frequency: "monthly",
        patterns: [
          { type: dayValue, value: 2 },
          { type: dayValue, value: 4 }
        ]
      };
    },
    accountId
  );
}
async function findStartDate(schedule) {
  const conditions = schedule._conditions;
  const dateCond = conditions.find((c) => c.field === "date");
  let currentConfig = dateCond.value;
  while (1) {
    const prevConfig = currentConfig;
    currentConfig = { ...prevConfig };
    switch (currentConfig.frequency) {
      case "weekly":
        currentConfig.start = dayFromDate(
          d__namespace.subWeeks(
            parseDate$1(currentConfig.start),
            currentConfig.interval || 1
          )
        );
        break;
      case "monthly":
        currentConfig.start = dayFromDate(
          d__namespace.subMonths(
            parseDate$1(currentConfig.start),
            currentConfig.interval || 1
          )
        );
        break;
      case "yearly":
        currentConfig.start = dayFromDate(
          d__namespace.subYears(
            parseDate$1(currentConfig.start),
            currentConfig.interval || 1
          )
        );
        break;
      default:
        throw new Error("findStartDate: invalid frequency");
    }
    const newConditions = conditions.map(
      (c) => c.field === "date" ? { ...c, value: currentConfig } : c
    );
    const { filters, errors } = conditionsToAQL(newConditions, {
      recurDateBounds: 1
    });
    if (errors.length > 0) {
      currentConfig = null;
      break;
    }
    const { data } = await aqlQuery(
      q("transactions").filter({ $and: filters }).select("*")
    );
    if (data.length === 0) {
      currentConfig = prevConfig;
      break;
    }
  }
  if (currentConfig) {
    return {
      ...schedule,
      date: currentConfig,
      _conditions: conditions.map(
        (c) => c.field === "date" ? { ...c, value: currentConfig } : c
      )
    };
  }
  return schedule;
}
async function findSchedules() {
  const { data: accounts } = await aqlQuery(
    q("accounts").filter({ closed: false }).select("*")
  );
  let allSchedules = [];
  for (const account of accounts) {
    const latestTrans = await first(
      "SELECT date FROM v_transactions WHERE account = ? AND parent_id IS NULL ORDER BY date DESC LIMIT 1",
      [account.id]
    );
    if (latestTrans) {
      const latestDate = fromDateRepr(latestTrans.date);
      allSchedules = allSchedules.concat(
        await weekly(latestDate, account.id),
        await every2weeks(latestDate, account.id),
        await monthly(latestDate, account.id),
        await monthlyLastDay(latestDate, account.id),
        await monthly1stor3rd(latestDate, account.id),
        await monthly2ndor4th(latestDate, account.id)
      );
    }
  }
  const schedules = [...groupBy(allSchedules, "payee").entries()].map(
    ([, schedules2]) => {
      schedules2.sort((s1, s2) => s2.rank - s1.rank);
      const winner = schedules2[0];
      return {
        id: uuid.v4(),
        account: winner.account,
        payee: winner.payee,
        date: winner.date,
        amount: winner.amount,
        _conditions: [
          { op: "is", field: "account", value: winner.account },
          { op: "is", field: "payee", value: winner.payee },
          {
            op: winner.exactDate ? "is" : "isapprox",
            field: "date",
            value: winner.date
          },
          {
            op: winner.exactAmount ? "is" : "isapprox",
            field: "amount",
            value: winner.amount
          }
        ]
      };
    }
  );
  const finalized = [];
  for (const schedule of schedules) {
    finalized.push(await findStartDate(schedule));
  }
  return finalized;
}
function zip(arr1, arr2) {
  const result = [];
  for (let i = 0; i < arr1.length; i++) {
    result.push([arr1[i], arr2[i]]);
  }
  return result;
}
function updateConditions(conditions, newConditions) {
  const scheduleConds = extractScheduleConds(conditions);
  const newScheduleConds = extractScheduleConds(newConditions);
  const replacements = zip(
    Object.values(scheduleConds),
    Object.values(newScheduleConds)
  );
  const updated = conditions.map((cond) => {
    const r = replacements.find((r2) => cond === r2[0]);
    return r && r[1] ? r[1] : cond;
  });
  const added = replacements.filter((x) => x[0] == null && x[1] != null).map((x) => x[1]);
  return updated.concat(added);
}
async function getRuleForSchedule(id) {
  if (id == null) {
    throw new Error("Schedule not attached to a rule");
  }
  const { data: ruleId } = await aqlQuery(
    q("schedules").filter({ id }).calculate("rule")
  );
  return getRules$1().find((rule) => rule.id === ruleId);
}
async function fixRuleForSchedule(id) {
  const { data: ruleId } = await aqlQuery(
    q("schedules").filter({ id }).calculate("rule")
  );
  if (ruleId) {
    await delete_("rules", ruleId);
  }
  const newId = await insertRule({
    stage: null,
    conditionsOp: "and",
    conditions: [
      { op: "isapprox", field: "date", value: currentDay() },
      { op: "isapprox", field: "amount", value: 0 }
    ],
    actions: [{ op: "link-schedule", value: id }]
  });
  await updateWithSchema("schedules", { id, rule: newId });
  return getRules$1().find((rule) => rule.id === newId);
}
async function setNextDate({
  id,
  start,
  conditions,
  reset
}) {
  if (conditions == null) {
    const rule = await getRuleForSchedule(id);
    if (rule == null) {
      throw new Error("No rule found for schedule");
    }
    conditions = rule.serialize().conditions;
  }
  const { date: dateCond } = extractScheduleConds(conditions);
  const { data: nextDate } = await aqlQuery(
    q("schedules").filter({ id }).calculate("next_date")
  );
  if (dateCond) {
    const newNextDate = getNextDate(
      dateCond,
      start ? start(nextDate) : /* @__PURE__ */ new Date()
    );
    if (newNextDate !== nextDate) {
      const nd = await first(
        "SELECT id, base_next_date_ts FROM schedules_next_date WHERE schedule_id = ?",
        [id]
      );
      await update(
        "schedules_next_date",
        reset ? {
          id: nd.id,
          base_next_date: toDateRepr(newNextDate),
          base_next_date_ts: Date.now()
        } : {
          id: nd.id,
          local_next_date: toDateRepr(newNextDate),
          local_next_date_ts: nd.base_next_date_ts
        }
      );
    }
  }
}
async function checkIfScheduleExists(name, scheduleId) {
  const idForName = await first(
    "SELECT id from schedules WHERE tombstone = 0 AND name = ?",
    [name]
  );
  if (idForName == null) {
    return false;
  }
  if (scheduleId) {
    return idForName["id"] !== scheduleId;
  }
  return true;
}
async function createSchedule({
  schedule = null,
  conditions = []
} = {}) {
  const scheduleId = schedule?.id || uuid.v4();
  const { date: dateCond } = extractScheduleConds(conditions);
  if (dateCond == null) {
    throw new Error("A date condition is required to create a schedule");
  }
  if (dateCond.value == null) {
    throw new Error("Date is required");
  }
  const nextDate = getNextDate(dateCond);
  const nextDateRepr = nextDate ? toDateRepr(nextDate) : null;
  if (schedule) {
    if (schedule.name) {
      if (await checkIfScheduleExists(schedule.name, scheduleId)) {
        throw new Error("Cannot create schedules with the same name");
      }
    } else {
      schedule.name = null;
    }
  }
  const ruleId = await insertRule({
    stage: null,
    conditionsOp: "and",
    conditions,
    actions: [{ op: "link-schedule", value: scheduleId }]
  });
  const now = Date.now();
  await insertWithUUID("schedules_next_date", {
    schedule_id: scheduleId,
    local_next_date: nextDateRepr,
    local_next_date_ts: now,
    base_next_date: nextDateRepr,
    base_next_date_ts: now
  });
  await insertWithSchema("schedules", {
    ...schedule,
    id: scheduleId,
    rule: ruleId
  });
  return scheduleId;
}
async function updateSchedule({
  schedule,
  conditions,
  resetNextDate
}) {
  if (schedule.rule) {
    throw new Error("You cannot change the rule of a schedule");
  }
  let rule;
  if (conditions) {
    const { date: dateCond } = extractScheduleConds(conditions);
    if (dateCond && dateCond.value == null) {
      throw new Error("Date is required");
    }
    rule = await getRuleForSchedule(schedule.id);
    if (rule == null) {
      rule = await fixRuleForSchedule(schedule.id);
    }
  }
  await batchMessages(async () => {
    if (conditions) {
      const oldConditions = rule.serialize().conditions;
      const newConditions = updateConditions(oldConditions, conditions);
      await updateRule$1({ id: rule.id, conditions: newConditions });
      const stripType = ({ type, ...fields }) => fields;
      if (resetNextDate || !deepEqual(
        oldConditions.find((c) => c.field === "account"),
        oldConditions.find((c) => c.field === "account")
      ) || !deepEqual(
        stripType(oldConditions.find((c) => c.field === "date") || {}),
        stripType(newConditions.find((c) => c.field === "date") || {})
      )) {
        await setNextDate({
          id: schedule.id,
          conditions: newConditions,
          reset: true
        });
      }
    } else if (resetNextDate) {
      await setNextDate({ id: schedule.id, reset: true });
    }
    await updateWithSchema("schedules", schedule);
  });
  return schedule.id;
}
async function deleteSchedule({ id }) {
  const { data: ruleId } = await aqlQuery(
    q("schedules").filter({ id }).calculate("rule")
  );
  await batchMessages(async () => {
    await delete_("rules", ruleId);
    await delete_("schedules", id);
  });
}
async function skipNextDate({ id }) {
  return setNextDate({
    id,
    start: (nextDate) => {
      return d__namespace.addDays(parseDate$1(nextDate), 1);
    }
  });
}
function discoverSchedules() {
  return findSchedules();
}
async function getUpcomingDates({ config: config2, count }) {
  const rules = recurConfigToRSchedule(config2);
  try {
    const schedule = new standardDateAdapter.Schedule({ rrules: rules });
    return schedule.occurrences({ start: d__namespace.startOfDay(/* @__PURE__ */ new Date()), take: count }).toArray().map(
      (date) => config2.skipWeekend ? getDateWithSkippedWeekend(date.date, config2.weekendSolveMode) : date.date
    ).map((date) => dayFromDate(date));
  } catch (err) {
    throw err;
  }
}
function onRuleUpdate(rule) {
  const { actions, conditions } = rule instanceof Rule ? rule.serialize() : ruleModel.toJS(rule);
  if (actions && actions.find((a) => a.op === "link-schedule")) {
    const scheduleId = actions.find((a) => a.op === "link-schedule").value;
    if (scheduleId) {
      const conds = extractScheduleConds(conditions);
      const payeeIdx = conditions.findIndex((c) => c === conds.payee);
      const accountIdx = conditions.findIndex((c) => c === conds.account);
      const amountIdx = conditions.findIndex((c) => c === conds.amount);
      const dateIdx = conditions.findIndex((c) => c === conds.date);
      runQuery(
        "INSERT OR REPLACE INTO schedules_json_paths (schedule_id, payee, account, amount, date) VALUES (?, ?, ?, ?, ?)",
        [
          scheduleId,
          payeeIdx === -1 ? null : `$[${payeeIdx}]`,
          accountIdx === -1 ? null : `$[${accountIdx}]`,
          amountIdx === -1 ? null : `$[${amountIdx}]`,
          dateIdx === -1 ? null : `$[${dateIdx}]`
        ]
      );
    }
  }
}
function trackJSONPaths() {
  transaction(() => {
    getRules$1().forEach((rule) => {
      onRuleUpdate(rule);
    });
  });
  return addSyncListener(onApplySync);
}
function onApplySync(oldValues, newValues) {
  newValues.forEach((items, table) => {
    if (table === "rules") {
      items.forEach((newValue) => {
        onRuleUpdate(newValue);
      });
    }
  });
}
async function postTransactionForSchedule({
  id,
  today
}) {
  const { data } = await aqlQuery(q("schedules").filter({ id }).select("*"));
  const schedule = data[0];
  if (schedule == null || schedule._account == null) {
    return;
  }
  const transaction2 = {
    payee: schedule._payee,
    account: schedule._account,
    amount: getScheduledAmount(schedule._amount),
    date: today ? currentDay() : schedule.next_date,
    schedule: schedule.id,
    cleared: false
  };
  if (transaction2.account) {
    await addTransactions$1(transaction2.account, [transaction2]);
  }
}
async function advanceSchedulesService(syncSuccess) {
  const { data: schedules } = await aqlQuery(
    q("schedules").filter({ completed: false, "_account.closed": false }).select("*")
  );
  const { data: hasTransData } = await aqlQuery(
    getHasTransactionsQuery(schedules)
  );
  const hasTrans = new Set(
    hasTransData.filter(Boolean).map((row) => row.schedule)
  );
  const failedToPost = [];
  const { data: upcomingLength } = await aqlQuery(
    q("preferences").filter({ id: "upcomingScheduledTransactionLength" }).select("value")
  );
  for (const schedule of schedules) {
    const status = getStatus(
      schedule.next_date,
      schedule.completed,
      hasTrans.has(schedule.id),
      upcomingLength[0]?.value ?? "7"
    );
    if (status === "paid") {
      if (schedule._date) {
        if (schedule._date.frequency) {
          try {
            await setNextDate({ id: schedule.id });
          } catch (err) {
          }
        } else {
          if (schedule._date < currentDay()) {
            await updateSchedule({
              schedule: { id: schedule.id, completed: true }
            });
          }
        }
      }
    } else if ((status === "due" || status === "missed") && schedule.posts_transaction && schedule._account) {
      if (syncSuccess) {
        await postTransactionForSchedule({ id: schedule.id });
      } else {
        failedToPost.push(schedule._payee);
      }
    }
  }
}
const app$f = createApp();
app$f.method("schedule/create", mutator(undoable(createSchedule)));
app$f.method("schedule/update", mutator(undoable(updateSchedule)));
app$f.method("schedule/delete", mutator(undoable(deleteSchedule)));
app$f.method("schedule/skip-next-date", mutator(undoable(skipNextDate)));
app$f.method(
  "schedule/post-transaction",
  mutator(undoable(postTransactionForSchedule))
);
app$f.method(
  "schedule/force-run-service",
  mutator(() => advanceSchedulesService(true))
);
app$f.method("schedule/discover", discoverSchedules);
app$f.method("schedule/get-upcoming-dates", getUpcomingDates);
app$f.service(trackJSONPaths);
app$f.events.on("sync", ({ type }) => {
  const completeEvent = type === "success" || type === "error" || type === "unauthorized";
  if (completeEvent && getPrefs()) {
    const { lastScheduleRun } = getPrefs();
    if (lastScheduleRun !== currentDay()) {
      runMutator(() => advanceSchedulesService(type === "success"));
      savePrefs({ lastScheduleRun: currentDay() });
    }
  }
});
async function createScheduleList(templates, current_month, category) {
  const t = [];
  const errors = [];
  for (const template of templates) {
    const { id: sid, completed } = await first(
      "SELECT id, completed FROM schedules WHERE TRIM(name) = ? AND tombstone = 0",
      [template.name]
    );
    const rule = await getRuleForSchedule(sid);
    const conditions = rule.serialize().conditions;
    const { date: dateConditions, amount: amountCondition } = extractScheduleConds(conditions);
    let scheduleAmount = amountCondition.op === "isbetween" ? Math.round(amountCondition.value.num1 + amountCondition.value.num2) / 2 : amountCondition.value;
    if (template.adjustment) {
      const adjustmentFactor = 1 + template.adjustment / 100;
      scheduleAmount = Math.round(scheduleAmount * adjustmentFactor);
    }
    const { amount: postRuleAmount, subtransactions } = rule.execActions({
      amount: scheduleAmount,
      category: category.id,
      subtransactions: []
    });
    const categorySubtransactions = subtransactions?.filter(
      (t2) => t2.category === category.id
    );
    const sign = category.is_income ? 1 : -1;
    const target = sign * (categorySubtransactions?.length ? categorySubtransactions.reduce((acc, t2) => acc + t2.amount, 0) : postRuleAmount ?? scheduleAmount);
    const next_date_string = getNextDate(
      dateConditions,
      _parse(current_month)
    );
    const target_interval = dateConditions.value.interval ? dateConditions.value.interval : 1;
    const target_frequency = dateConditions.value.frequency;
    const isRepeating = Object(dateConditions.value) === dateConditions.value && "frequency" in dateConditions.value;
    const num_months = differenceInCalendarMonths(
      next_date_string,
      current_month
    );
    if (num_months < 0) {
      errors.push(`Schedule ${template.name} is in the Past.`);
    } else {
      t.push({
        target,
        next_date_string,
        target_interval,
        target_frequency,
        num_months,
        completed,
        //started,
        full: template.full === null ? false : template.full,
        repeat: isRepeating,
        name: template.name
      });
      if (!completed) {
        if (isRepeating) {
          let monthlyTarget = 0;
          const nextMonth2 = addMonths(
            current_month,
            t[t.length - 1].num_months + 1
          );
          let nextBaseDate = getNextDate(
            dateConditions,
            _parse(current_month),
            true
          );
          let nextDate = dateConditions.value.skipWeekend ? dayFromDate(
            getDateWithSkippedWeekend(
              _parse(nextBaseDate),
              dateConditions.value.weekendSolveMode
            )
          ) : nextBaseDate;
          while (nextDate < nextMonth2) {
            monthlyTarget += -target;
            const currentDate2 = nextBaseDate;
            const oneDayLater = addDays(nextBaseDate, 1);
            nextBaseDate = getNextDate(
              dateConditions,
              _parse(oneDayLater),
              true
            );
            nextDate = dateConditions.value.skipWeekend ? dayFromDate(
              getDateWithSkippedWeekend(
                _parse(nextBaseDate),
                dateConditions.value.weekendSolveMode
              )
            ) : nextBaseDate;
            const diffDays = differenceInCalendarDays(
              nextBaseDate,
              currentDate2
            );
            if (!diffDays) {
              break;
            }
          }
          t[t.length - 1].target = -monthlyTarget;
        }
      } else {
        errors.push(
          `Schedule ${template.name} is not active during the month in question.`
        );
      }
    }
  }
  return { t: t.filter((c) => c.completed === 0), errors };
}
function getPayMonthOfTotal(t) {
  let total = 0;
  const schedules = t.filter((c) => c.num_months === 0);
  for (const schedule of schedules) {
    total += schedule.target;
  }
  return total;
}
async function getSinkingContributionTotal(t, remainder, last_month_balance) {
  let total = 0;
  for (const [index, schedule] of t.entries()) {
    remainder = index === 0 ? schedule.target - last_month_balance : schedule.target - remainder;
    let tg = 0;
    if (remainder >= 0) {
      tg = remainder;
      remainder = 0;
    } else {
      tg = 0;
      remainder = Math.abs(remainder);
    }
    total += tg / (schedule.num_months + 1);
  }
  return total;
}
function getSinkingBaseContributionTotal(t) {
  let total = 0;
  for (const schedule of t) {
    let monthlyAmount = 0;
    let prevDate;
    let intervalMonths;
    switch (schedule.target_frequency) {
      case "yearly":
        monthlyAmount = schedule.target / schedule.target_interval / 12;
        break;
      case "monthly":
        monthlyAmount = schedule.target / schedule.target_interval;
        break;
      case "weekly":
        prevDate = subWeeks(
          schedule.next_date_string,
          schedule.target_interval
        );
        intervalMonths = differenceInCalendarMonths(
          schedule.next_date_string,
          prevDate
        );
        if (intervalMonths === 0) intervalMonths = 1;
        monthlyAmount = schedule.target / intervalMonths;
        break;
      case "daily":
        prevDate = subDays(
          schedule.next_date_string,
          schedule.target_interval
        );
        intervalMonths = differenceInCalendarMonths(
          schedule.next_date_string,
          prevDate
        );
        if (intervalMonths === 0) intervalMonths = 1;
        monthlyAmount = schedule.target / intervalMonths;
        break;
    }
    total += monthlyAmount;
  }
  return total;
}
function getSinkingTotal(t) {
  let total = 0;
  for (const schedule of t) {
    total += schedule.target;
  }
  return total;
}
async function runSchedule(template_lines, current_month, balance, remainder, last_month_balance, to_budget, errors, category) {
  const scheduleTemplates = template_lines.filter((t2) => t2.type === "schedule");
  const t = await createScheduleList(
    scheduleTemplates,
    current_month,
    category
  );
  errors = errors.concat(t.errors);
  const isPayMonthOf = (c) => c.full || c.target_frequency === "monthly" && c.target_interval === 1 && c.num_months === 0 || c.target_frequency === "weekly" && c.target_interval <= 4 || c.target_frequency === "daily" && c.target_interval <= 31 || isReflectBudget();
  const t_payMonthOf = t.t.filter(isPayMonthOf);
  const t_sinking = t.t.filter((c) => !isPayMonthOf(c)).sort((a, b) => a.next_date_string.localeCompare(b.next_date_string));
  const totalPayMonthOf = getPayMonthOfTotal(t_payMonthOf);
  const totalSinking = getSinkingTotal(t_sinking);
  const totalSinkingBaseContribution = getSinkingBaseContributionTotal(t_sinking);
  if (balance >= totalSinking + totalPayMonthOf) {
    to_budget += Math.round(totalPayMonthOf + totalSinkingBaseContribution);
  } else {
    const totalSinkingContribution = await getSinkingContributionTotal(
      t_sinking,
      remainder,
      last_month_balance
    );
    if (t_sinking.length === 0) {
      to_budget += Math.round(totalPayMonthOf + totalSinkingContribution) - last_month_balance;
    } else {
      to_budget += Math.round(totalPayMonthOf + totalSinkingContribution);
    }
  }
  return { to_budget, errors, remainder };
}
function peg$subclass(child, parent) {
  function C() {
    this.constructor = child;
  }
  C.prototype = parent.prototype;
  child.prototype = new C();
}
function peg$SyntaxError(message, expected, found, location) {
  var self = Error.call(this, message);
  if (Object.setPrototypeOf) {
    Object.setPrototypeOf(self, peg$SyntaxError.prototype);
  }
  self.expected = expected;
  self.found = found;
  self.location = location;
  self.name = "SyntaxError";
  return self;
}
peg$subclass(peg$SyntaxError, Error);
function peg$padEnd(str, targetLength, padString) {
  padString = padString || " ";
  if (str.length > targetLength) {
    return str;
  }
  targetLength -= str.length;
  padString += padString.repeat(targetLength);
  return str + padString.slice(0, targetLength);
}
peg$SyntaxError.prototype.format = function(sources) {
  var str = "Error: " + this.message;
  if (this.location) {
    var src = null;
    var k;
    for (k = 0; k < sources.length; k++) {
      if (sources[k].source === this.location.source) {
        src = sources[k].text.split(/\r\n|\n|\r/g);
        break;
      }
    }
    var s = this.location.start;
    var offset_s = this.location.source && typeof this.location.source.offset === "function" ? this.location.source.offset(s) : s;
    var loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
    if (src) {
      var e = this.location.end;
      var filler = peg$padEnd("", offset_s.line.toString().length, " ");
      var line = src[s.line - 1];
      var last2 = s.line === e.line ? e.column : line.length + 1;
      var hatLen = last2 - s.column || 1;
      str += "\n --> " + loc + "\n" + filler + " |\n" + offset_s.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s.column - 1, " ") + peg$padEnd("", hatLen, "^");
    } else {
      str += "\n at " + loc;
    }
  }
  return str;
};
peg$SyntaxError.buildMessage = function(expected, found) {
  var DESCRIBE_EXPECTATION_FNS = {
    literal: function(expectation) {
      return '"' + literalEscape(expectation.text) + '"';
    },
    class: function(expectation) {
      var escapedParts = expectation.parts.map(function(part) {
        return Array.isArray(part) ? classEscape(part[0]) + "-" + classEscape(part[1]) : classEscape(part);
      });
      return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]";
    },
    any: function() {
      return "any character";
    },
    end: function() {
      return "end of input";
    },
    other: function(expectation) {
      return expectation.description;
    }
  };
  function hex(ch) {
    return ch.charCodeAt(0).toString(16).toUpperCase();
  }
  function literalEscape(s) {
    return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
      return "\\x0" + hex(ch);
    }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
      return "\\x" + hex(ch);
    });
  }
  function classEscape(s) {
    return s.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\^/g, "\\^").replace(/-/g, "\\-").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
      return "\\x0" + hex(ch);
    }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
      return "\\x" + hex(ch);
    });
  }
  function describeExpectation(expectation) {
    return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
  }
  function describeExpected(expected2) {
    var descriptions = expected2.map(describeExpectation);
    var i, j;
    descriptions.sort();
    if (descriptions.length > 0) {
      for (i = 1, j = 1; i < descriptions.length; i++) {
        if (descriptions[i - 1] !== descriptions[i]) {
          descriptions[j] = descriptions[i];
          j++;
        }
      }
      descriptions.length = j;
    }
    switch (descriptions.length) {
      case 1:
        return descriptions[0];
      case 2:
        return descriptions[0] + " or " + descriptions[1];
      default:
        return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
    }
  }
  function describeFound(found2) {
    return found2 ? '"' + literalEscape(found2) + '"' : "end of input";
  }
  return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
};
function peg$parse(input, options) {
  options = options !== void 0 ? options : {};
  var peg$FAILED = {};
  var peg$source = options.grammarSource;
  var peg$startRuleFunctions = { expr: peg$parseexpr };
  var peg$startRuleFunction = peg$parseexpr;
  var peg$c0 = "average";
  var peg$c1 = "months";
  var peg$c2 = "copy from";
  var peg$c3 = "months ago";
  var peg$c4 = "[";
  var peg$c5 = "]";
  var peg$c6 = "increase";
  var peg$c7 = "decrease";
  var peg$c8 = "month";
  var peg$c9 = "year";
  var peg$c10 = "years";
  var peg$c11 = "per week starting";
  var peg$c12 = "per day";
  var peg$c13 = "previous";
  var peg$c14 = "day";
  var peg$c15 = "days";
  var peg$c16 = "spend";
  var peg$c17 = "from";
  var peg$c18 = "week";
  var peg$c19 = "weeks";
  var peg$c20 = "by";
  var peg$c21 = "of";
  var peg$c22 = "repeat";
  var peg$c23 = "every";
  var peg$c24 = "starting";
  var peg$c25 = "up";
  var peg$c26 = "to";
  var peg$c27 = "hold";
  var peg$c28 = "schedule";
  var peg$c29 = "full";
  var peg$c30 = "-";
  var peg$c31 = "remainder";
  var peg$c32 = "#template";
  var peg$c33 = "#goal";
  var peg$c34 = ".";
  var peg$c35 = "%";
  var peg$r0 = /^[ \t]/;
  var peg$r1 = /^[0-9]/;
  var peg$r2 = /^[1-9]/;
  var peg$r3 = /^[^ \t\r\n]/;
  var peg$r4 = /^[^\r\n]/;
  var peg$r5 = /^[^\r\n\t]/;
  var peg$e0 = peg$literalExpectation("average", true);
  var peg$e1 = peg$literalExpectation("months", true);
  var peg$e2 = peg$literalExpectation("copy from", true);
  var peg$e3 = peg$literalExpectation("months ago", true);
  var peg$e4 = peg$literalExpectation("[", false);
  var peg$e5 = peg$literalExpectation("]", false);
  var peg$e6 = peg$literalExpectation("increase", true);
  var peg$e7 = peg$literalExpectation("decrease", true);
  var peg$e8 = peg$otherExpectation("repeat interval");
  var peg$e9 = peg$literalExpectation("month", true);
  var peg$e10 = peg$literalExpectation("year", true);
  var peg$e11 = peg$literalExpectation("years", true);
  var peg$e12 = peg$literalExpectation("per week starting", true);
  var peg$e13 = peg$literalExpectation("per day", true);
  var peg$e14 = peg$literalExpectation("previous", true);
  var peg$e15 = peg$literalExpectation("day", true);
  var peg$e16 = peg$literalExpectation("days", true);
  var peg$e17 = peg$literalExpectation("spend", true);
  var peg$e18 = peg$literalExpectation("from", true);
  var peg$e19 = peg$literalExpectation("week", true);
  var peg$e20 = peg$literalExpectation("weeks", true);
  var peg$e21 = peg$literalExpectation("by", true);
  var peg$e22 = peg$literalExpectation("of", true);
  var peg$e23 = peg$literalExpectation("repeat", true);
  var peg$e24 = peg$literalExpectation("every", true);
  var peg$e25 = peg$literalExpectation("starting", true);
  var peg$e26 = peg$literalExpectation("up", true);
  var peg$e27 = peg$literalExpectation("to", true);
  var peg$e28 = peg$literalExpectation("hold", true);
  var peg$e29 = peg$literalExpectation("schedule", true);
  var peg$e30 = peg$literalExpectation("full", true);
  var peg$e31 = peg$literalExpectation("-", true);
  var peg$e32 = peg$literalExpectation("remainder", true);
  var peg$e33 = peg$literalExpectation("#template", false);
  var peg$e34 = peg$literalExpectation("#goal", true);
  var peg$e35 = peg$otherExpectation("whitespace");
  var peg$e36 = peg$classExpectation([" ", "	"], false, false);
  var peg$e38 = peg$otherExpectation("digit");
  var peg$e39 = peg$classExpectation([["0", "9"]], false, false);
  var peg$e40 = peg$otherExpectation("number");
  var peg$e41 = peg$classExpectation([["1", "9"]], false, false);
  var peg$e42 = peg$otherExpectation("amount");
  var peg$e43 = peg$literalExpectation("-", false);
  var peg$e44 = peg$literalExpectation(".", false);
  var peg$e45 = peg$otherExpectation("percentage");
  var peg$e46 = peg$literalExpectation("%", false);
  var peg$e47 = peg$otherExpectation("year");
  var peg$e48 = peg$otherExpectation("month");
  var peg$e49 = peg$otherExpectation("day");
  var peg$e50 = peg$otherExpectation("currency symbol");
  var peg$e51 = peg$anyExpectation();
  var peg$e52 = peg$classExpectation([" ", "	", "\r", "\n"], true, false);
  var peg$e53 = peg$classExpectation(["\r", "\n"], true, false);
  var peg$e54 = peg$otherExpectation("Name");
  var peg$e55 = peg$classExpectation(["\r", "\n", "	"], true, false);
  var peg$f0 = function(template, percentOf, category) {
    return { type: "percentage", percent: +percentOf.percent, previous: percentOf.prev, category, priority: template.priority, directive: template.directive };
  };
  var peg$f1 = function(template, amount, period, starting, limit) {
    return { type: "periodic", amount, period, starting, limit, priority: template.priority, directive: template.directive };
  };
  var peg$f2 = function(template, amount, month, from, repeat) {
    return {
      type: from ? "spend" : "by",
      amount,
      month,
      ...repeat ? repeat[3] : {},
      from,
      priority: template.priority,
      directive: template.directive
    };
  };
  var peg$f3 = function(template, monthly2, limit) {
    return { type: "simple", monthly: monthly2, limit, priority: template.priority, directive: template.directive };
  };
  var peg$f4 = function(template, limit) {
    return { type: "simple", monthly: null, limit, priority: template.priority, directive: template.directive };
  };
  var peg$f5 = function(template, schedule, full, name, modifiers) {
    return { type: "schedule", name: name.trim(), priority: template.priority, directive: template.directive, full, adjustment: modifiers?.adjustment };
  };
  var peg$f6 = function(template, remainder, limit) {
    return { type: "remainder", priority: null, directive: template.directive, weight: remainder, limit };
  };
  var peg$f7 = function(template, amount) {
    return { type: "average", numMonths: +amount, priority: template.priority, directive: template.directive };
  };
  var peg$f8 = function(template, lookBack, limit) {
    return { type: "copy", priority: template.priority, directive: template.directive, lookBack: +lookBack, limit };
  };
  var peg$f9 = function(goal, amount) {
    return { type: "goal", amount, priority: null, directive: goal };
  };
  var peg$f10 = function(modifier) {
    return modifier;
  };
  var peg$f11 = function(op, value) {
    const multiplier = op.toLowerCase() === "increase" ? 1 : -1;
    return { adjustment: multiplier * +value };
  };
  var peg$f12 = function() {
    return { annual: false };
  };
  var peg$f13 = function(months) {
    return { annual: false, repeat: +months };
  };
  var peg$f14 = function() {
    return { annual: true };
  };
  var peg$f15 = function(years) {
    return { annual: true, repeat: +years };
  };
  var peg$f16 = function(amount, start, hold) {
    return { amount, hold, period: "weekly", start };
  };
  var peg$f17 = function(amount, hold) {
    return { amount, hold, period: "daily", start: null };
  };
  var peg$f18 = function(amount, hold) {
    return { amount, hold, period: "monthly", start: null };
  };
  var peg$f19 = function(percent) {
    return { percent, prev: true };
  };
  var peg$f20 = function(percent) {
    return { percent, prev: false };
  };
  var peg$f21 = function() {
    return { period: "day", amount: 1 };
  };
  var peg$f22 = function(n) {
    return { period: "day", amount: +n };
  };
  var peg$f23 = function() {
    return { period: "week", amount: 1 };
  };
  var peg$f24 = function(n) {
    return { period: "week", amount: +n };
  };
  var peg$f25 = function(n) {
    return { period: "month", amount: +n };
  };
  var peg$f26 = function() {
    return { period: "year", amount: 1 };
  };
  var peg$f27 = function(n) {
    return { period: "year", amount: +n };
  };
  var peg$f28 = function(month) {
    return month;
  };
  var peg$f29 = function() {
    return true;
  };
  var peg$f30 = function() {
    return text();
  };
  var peg$f31 = function() {
    return true;
  };
  var peg$f32 = function(number2) {
    return number2;
  };
  var peg$f33 = function(weight) {
    return +weight || 1;
  };
  var peg$f34 = function(priority) {
    return { priority: +priority, directive: "template" };
  };
  var peg$f35 = function() {
    return "goal";
  };
  var peg$f36 = function() {
    return text();
  };
  var peg$f38 = function(amount) {
    return +amount;
  };
  var peg$f39 = function(percent) {
    return percent;
  };
  var peg$f40 = function(symbol) {
    return new RegExp("\\p{Sc}", "u").test(symbol);
  };
  var peg$f41 = function() {
    return text().trim();
  };
  var peg$f42 = function() {
    return text();
  };
  var peg$currPos = 0;
  var peg$savedPos = 0;
  var peg$posDetailsCache = [{ line: 1, column: 1 }];
  var peg$maxFailPos = 0;
  var peg$maxFailExpected = [];
  var peg$silentFails = 0;
  var peg$result;
  if ("startRule" in options) {
    if (!(options.startRule in peg$startRuleFunctions)) {
      throw new Error(`Can't start parsing from rule "` + options.startRule + '".');
    }
    peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
  }
  function text() {
    return input.substring(peg$savedPos, peg$currPos);
  }
  function peg$literalExpectation(text2, ignoreCase) {
    return { type: "literal", text: text2, ignoreCase };
  }
  function peg$classExpectation(parts, inverted, ignoreCase) {
    return { type: "class", parts, inverted, ignoreCase };
  }
  function peg$anyExpectation() {
    return { type: "any" };
  }
  function peg$endExpectation() {
    return { type: "end" };
  }
  function peg$otherExpectation(description) {
    return { type: "other", description };
  }
  function peg$computePosDetails(pos) {
    var details = peg$posDetailsCache[pos];
    var p;
    if (details) {
      return details;
    } else {
      p = pos - 1;
      while (!peg$posDetailsCache[p]) {
        p--;
      }
      details = peg$posDetailsCache[p];
      details = {
        line: details.line,
        column: details.column
      };
      while (p < pos) {
        if (input.charCodeAt(p) === 10) {
          details.line++;
          details.column = 1;
        } else {
          details.column++;
        }
        p++;
      }
      peg$posDetailsCache[pos] = details;
      return details;
    }
  }
  function peg$computeLocation(startPos, endPos, offset) {
    var startPosDetails = peg$computePosDetails(startPos);
    var endPosDetails = peg$computePosDetails(endPos);
    var res = {
      source: peg$source,
      start: {
        offset: startPos,
        line: startPosDetails.line,
        column: startPosDetails.column
      },
      end: {
        offset: endPos,
        line: endPosDetails.line,
        column: endPosDetails.column
      }
    };
    return res;
  }
  function peg$fail(expected) {
    if (peg$currPos < peg$maxFailPos) {
      return;
    }
    if (peg$currPos > peg$maxFailPos) {
      peg$maxFailPos = peg$currPos;
      peg$maxFailExpected = [];
    }
    peg$maxFailExpected.push(expected);
  }
  function peg$buildStructuredError(expected, found, location) {
    return new peg$SyntaxError(
      peg$SyntaxError.buildMessage(expected, found),
      expected,
      found,
      location
    );
  }
  function peg$parseexpr() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13;
    s0 = peg$currPos;
    s1 = peg$parsetemplate();
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      s3 = peg$parsepercentOf();
      if (s3 !== peg$FAILED) {
        s4 = peg$parsename();
        if (s4 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f0(s1, s3, s4);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parsetemplate();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        s3 = peg$parseamount();
        if (s3 !== peg$FAILED) {
          s4 = peg$parse_();
          s5 = peg$parserepeatEvery();
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_();
            s7 = peg$parseperiodCount();
            if (s7 !== peg$FAILED) {
              s8 = peg$parse_();
              s9 = peg$parsestarting();
              if (s9 !== peg$FAILED) {
                s10 = peg$parse_();
                s11 = peg$parsedate();
                if (s11 !== peg$FAILED) {
                  s12 = peg$parselimit();
                  if (s12 === peg$FAILED) {
                    s12 = null;
                  }
                  peg$savedPos = s0;
                  s0 = peg$f1(s1, s3, s7, s11, s12);
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parsetemplate();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_();
          s3 = peg$parseamount();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            s5 = peg$parseby();
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_();
              s7 = peg$parsemonth();
              if (s7 !== peg$FAILED) {
                s8 = peg$parsespendFrom();
                if (s8 === peg$FAILED) {
                  s8 = null;
                }
                s9 = peg$currPos;
                s10 = peg$parse_();
                s11 = peg$parserepeatEvery();
                if (s11 !== peg$FAILED) {
                  s12 = peg$parse_();
                  s13 = peg$parserepeat();
                  if (s13 !== peg$FAILED) {
                    s10 = [s10, s11, s12, s13];
                    s9 = s10;
                  } else {
                    peg$currPos = s9;
                    s9 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s9;
                  s9 = peg$FAILED;
                }
                if (s9 === peg$FAILED) {
                  s9 = null;
                }
                peg$savedPos = s0;
                s0 = peg$f2(s1, s3, s7, s8, s9);
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parsetemplate();
          if (s1 !== peg$FAILED) {
            s2 = peg$parse_();
            s3 = peg$parseamount();
            if (s3 !== peg$FAILED) {
              s4 = peg$parselimit();
              if (s4 === peg$FAILED) {
                s4 = null;
              }
              peg$savedPos = s0;
              s0 = peg$f3(s1, s3, s4);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parsetemplate();
            if (s1 !== peg$FAILED) {
              s2 = peg$parse_();
              s3 = peg$parselimit();
              if (s3 !== peg$FAILED) {
                peg$savedPos = s0;
                s0 = peg$f4(s1, s3);
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              s1 = peg$parsetemplate();
              if (s1 !== peg$FAILED) {
                s2 = peg$parse_();
                s3 = peg$parseschedule();
                if (s3 !== peg$FAILED) {
                  s4 = peg$parse_();
                  s5 = peg$parsefull();
                  if (s5 === peg$FAILED) {
                    s5 = null;
                  }
                  s6 = peg$parserawScheduleName();
                  if (s6 !== peg$FAILED) {
                    s7 = peg$parsemodifiers();
                    if (s7 === peg$FAILED) {
                      s7 = null;
                    }
                    peg$savedPos = s0;
                    s0 = peg$f5(s1, s3, s5, s6, s7);
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                s1 = peg$parsetemplate();
                if (s1 !== peg$FAILED) {
                  s2 = peg$parse_();
                  s3 = peg$parseremainder();
                  if (s3 !== peg$FAILED) {
                    s4 = peg$parselimit();
                    if (s4 === peg$FAILED) {
                      s4 = null;
                    }
                    peg$savedPos = s0;
                    s0 = peg$f6(s1, s3, s4);
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  s1 = peg$parsetemplate();
                  if (s1 !== peg$FAILED) {
                    s2 = peg$parse_();
                    if (input.substr(peg$currPos, 7).toLowerCase() === peg$c0) {
                      s3 = input.substr(peg$currPos, 7);
                      peg$currPos += 7;
                    } else {
                      s3 = peg$FAILED;
                      if (peg$silentFails === 0) {
                        peg$fail(peg$e0);
                      }
                    }
                    if (s3 !== peg$FAILED) {
                      s4 = peg$parse_();
                      s5 = peg$parsepositive();
                      if (s5 !== peg$FAILED) {
                        s6 = peg$parse_();
                        if (input.substr(peg$currPos, 6).toLowerCase() === peg$c1) {
                          s7 = input.substr(peg$currPos, 6);
                          peg$currPos += 6;
                        } else {
                          s7 = peg$FAILED;
                          if (peg$silentFails === 0) {
                            peg$fail(peg$e1);
                          }
                        }
                        if (s7 === peg$FAILED) {
                          s7 = null;
                        }
                        peg$savedPos = s0;
                        s0 = peg$f7(s1, s5);
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                  if (s0 === peg$FAILED) {
                    s0 = peg$currPos;
                    s1 = peg$parsetemplate();
                    if (s1 !== peg$FAILED) {
                      s2 = peg$parse_();
                      if (input.substr(peg$currPos, 9).toLowerCase() === peg$c2) {
                        s3 = input.substr(peg$currPos, 9);
                        peg$currPos += 9;
                      } else {
                        s3 = peg$FAILED;
                        if (peg$silentFails === 0) {
                          peg$fail(peg$e2);
                        }
                      }
                      if (s3 !== peg$FAILED) {
                        s4 = peg$parse_();
                        s5 = peg$parsepositive();
                        if (s5 !== peg$FAILED) {
                          s6 = peg$parse_();
                          if (input.substr(peg$currPos, 10).toLowerCase() === peg$c3) {
                            s7 = input.substr(peg$currPos, 10);
                            peg$currPos += 10;
                          } else {
                            s7 = peg$FAILED;
                            if (peg$silentFails === 0) {
                              peg$fail(peg$e3);
                            }
                          }
                          if (s7 !== peg$FAILED) {
                            s8 = peg$parselimit();
                            if (s8 === peg$FAILED) {
                              s8 = null;
                            }
                            peg$savedPos = s0;
                            s0 = peg$f8(s1, s5, s8);
                          } else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                    if (s0 === peg$FAILED) {
                      s0 = peg$currPos;
                      s1 = peg$parsegoal();
                      if (s1 !== peg$FAILED) {
                        s2 = peg$parseamount();
                        if (s2 !== peg$FAILED) {
                          peg$savedPos = s0;
                          s0 = peg$f9(s1, s2);
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    return s0;
  }
  function peg$parsemodifiers() {
    var s0, s2, s3, s4;
    s0 = peg$currPos;
    peg$parse_();
    if (input.charCodeAt(peg$currPos) === 91) {
      s2 = peg$c4;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e4);
      }
    }
    if (s2 !== peg$FAILED) {
      s3 = peg$parsemodifier();
      if (s3 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 93) {
          s4 = peg$c5;
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e5);
          }
        }
        if (s4 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f10(s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parsemodifier() {
    var s0, s1, s3;
    s0 = peg$currPos;
    if (input.substr(peg$currPos, 8).toLowerCase() === peg$c6) {
      s1 = input.substr(peg$currPos, 8);
      peg$currPos += 8;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e6);
      }
    }
    if (s1 === peg$FAILED) {
      if (input.substr(peg$currPos, 8).toLowerCase() === peg$c7) {
        s1 = input.substr(peg$currPos, 8);
        peg$currPos += 8;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e7);
        }
      }
    }
    if (s1 !== peg$FAILED) {
      peg$parse_();
      s3 = peg$parsepercent();
      if (s3 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f11(s1, s3);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parserepeat() {
    var s0, s1, s3;
    peg$silentFails++;
    s0 = peg$currPos;
    if (input.substr(peg$currPos, 5).toLowerCase() === peg$c8) {
      s1 = input.substr(peg$currPos, 5);
      peg$currPos += 5;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e9);
      }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f12();
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parsepositive();
      if (s1 !== peg$FAILED) {
        peg$parse_();
        if (input.substr(peg$currPos, 6).toLowerCase() === peg$c1) {
          s3 = input.substr(peg$currPos, 6);
          peg$currPos += 6;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e1);
          }
        }
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f13(s1);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 4).toLowerCase() === peg$c9) {
          s1 = input.substr(peg$currPos, 4);
          peg$currPos += 4;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e10);
          }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f14();
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parsepositive();
          if (s1 !== peg$FAILED) {
            peg$parse_();
            if (input.substr(peg$currPos, 5).toLowerCase() === peg$c10) {
              s3 = input.substr(peg$currPos, 5);
              peg$currPos += 5;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e11);
              }
            }
            if (s3 !== peg$FAILED) {
              peg$savedPos = s0;
              s0 = peg$f15(s1);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        }
      }
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e8);
      }
    }
    return s0;
  }
  function peg$parselimit() {
    var s0, s2, s4, s6, s8, s10;
    s0 = peg$currPos;
    peg$parse_();
    s2 = peg$parseupTo();
    if (s2 !== peg$FAILED) {
      peg$parse_();
      s4 = peg$parseamount();
      if (s4 !== peg$FAILED) {
        peg$parse_();
        if (input.substr(peg$currPos, 17).toLowerCase() === peg$c11) {
          s6 = input.substr(peg$currPos, 17);
          peg$currPos += 17;
        } else {
          s6 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e12);
          }
        }
        if (s6 !== peg$FAILED) {
          peg$parse_();
          s8 = peg$parsedate();
          if (s8 !== peg$FAILED) {
            peg$parse_();
            s10 = peg$parsehold();
            if (s10 === peg$FAILED) {
              s10 = null;
            }
            peg$savedPos = s0;
            s0 = peg$f16(s4, s8, s10);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      peg$parse_();
      s2 = peg$parseupTo();
      if (s2 !== peg$FAILED) {
        peg$parse_();
        s4 = peg$parseamount();
        if (s4 !== peg$FAILED) {
          peg$parse_();
          if (input.substr(peg$currPos, 7).toLowerCase() === peg$c12) {
            s6 = input.substr(peg$currPos, 7);
            peg$currPos += 7;
          } else {
            s6 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e13);
            }
          }
          if (s6 !== peg$FAILED) {
            peg$parse_();
            s8 = peg$parsehold();
            if (s8 === peg$FAILED) {
              s8 = null;
            }
            peg$savedPos = s0;
            s0 = peg$f17(s4, s8);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        peg$parse_();
        s2 = peg$parseupTo();
        if (s2 !== peg$FAILED) {
          peg$parse_();
          s4 = peg$parseamount();
          if (s4 !== peg$FAILED) {
            peg$parse_();
            s6 = peg$parsehold();
            if (s6 === peg$FAILED) {
              s6 = null;
            }
            peg$savedPos = s0;
            s0 = peg$f18(s4, s6);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      }
    }
    return s0;
  }
  function peg$parsepercentOf() {
    var s0, s1, s3, s5;
    s0 = peg$currPos;
    s1 = peg$parsepercent();
    if (s1 !== peg$FAILED) {
      peg$parse_();
      s3 = peg$parseof();
      if (s3 !== peg$FAILED) {
        peg$parse_();
        if (input.substr(peg$currPos, 8).toLowerCase() === peg$c13) {
          s5 = input.substr(peg$currPos, 8);
          peg$currPos += 8;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e14);
          }
        }
        if (s5 !== peg$FAILED) {
          peg$parse_();
          peg$savedPos = s0;
          s0 = peg$f19(s1);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parsepercent();
      if (s1 !== peg$FAILED) {
        peg$parse_();
        s3 = peg$parseof();
        if (s3 !== peg$FAILED) {
          peg$parse_();
          peg$savedPos = s0;
          s0 = peg$f20(s1);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }
    return s0;
  }
  function peg$parseperiodCount() {
    var s0, s1, s3;
    s0 = peg$currPos;
    if (input.substr(peg$currPos, 3).toLowerCase() === peg$c14) {
      s1 = input.substr(peg$currPos, 3);
      peg$currPos += 3;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e15);
      }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f21();
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parsenumber();
      if (s1 !== peg$FAILED) {
        peg$parse_();
        if (input.substr(peg$currPos, 4).toLowerCase() === peg$c15) {
          s3 = input.substr(peg$currPos, 4);
          peg$currPos += 4;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e16);
          }
        }
        if (s3 !== peg$FAILED) {
          peg$parse_();
          peg$savedPos = s0;
          s0 = peg$f22(s1);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseweek();
        if (s1 !== peg$FAILED) {
          peg$parse_();
          peg$savedPos = s0;
          s0 = peg$f23();
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parsenumber();
          if (s1 !== peg$FAILED) {
            peg$parse_();
            s3 = peg$parseweeks();
            if (s3 !== peg$FAILED) {
              peg$savedPos = s0;
              s0 = peg$f24(s1);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parsenumber();
            if (s1 !== peg$FAILED) {
              peg$parse_();
              if (input.substr(peg$currPos, 6).toLowerCase() === peg$c1) {
                s3 = input.substr(peg$currPos, 6);
                peg$currPos += 6;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e1);
                }
              }
              if (s3 !== peg$FAILED) {
                peg$parse_();
                peg$savedPos = s0;
                s0 = peg$f25(s1);
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              if (input.substr(peg$currPos, 4).toLowerCase() === peg$c9) {
                s1 = input.substr(peg$currPos, 4);
                peg$currPos += 4;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e10);
                }
              }
              if (s1 !== peg$FAILED) {
                peg$parse_();
                peg$savedPos = s0;
                s0 = peg$f26();
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                s1 = peg$parsenumber();
                if (s1 !== peg$FAILED) {
                  peg$parse_();
                  if (input.substr(peg$currPos, 5).toLowerCase() === peg$c10) {
                    s3 = input.substr(peg$currPos, 5);
                    peg$currPos += 5;
                  } else {
                    s3 = peg$FAILED;
                    if (peg$silentFails === 0) {
                      peg$fail(peg$e11);
                    }
                  }
                  if (s3 !== peg$FAILED) {
                    peg$parse_();
                    peg$savedPos = s0;
                    s0 = peg$f27(s1);
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              }
            }
          }
        }
      }
    }
    return s0;
  }
  function peg$parsespendFrom() {
    var s0, s2, s4, s6;
    s0 = peg$currPos;
    peg$parse_();
    if (input.substr(peg$currPos, 5).toLowerCase() === peg$c16) {
      s2 = input.substr(peg$currPos, 5);
      peg$currPos += 5;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e17);
      }
    }
    if (s2 !== peg$FAILED) {
      peg$parse_();
      if (input.substr(peg$currPos, 4).toLowerCase() === peg$c17) {
        s4 = input.substr(peg$currPos, 4);
        peg$currPos += 4;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e18);
        }
      }
      if (s4 !== peg$FAILED) {
        peg$parse_();
        s6 = peg$parsemonth();
        if (s6 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f28(s6);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseweek() {
    var s0;
    if (input.substr(peg$currPos, 4).toLowerCase() === peg$c18) {
      s0 = input.substr(peg$currPos, 4);
      peg$currPos += 4;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e19);
      }
    }
    return s0;
  }
  function peg$parseweeks() {
    var s0;
    if (input.substr(peg$currPos, 5).toLowerCase() === peg$c19) {
      s0 = input.substr(peg$currPos, 5);
      peg$currPos += 5;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e20);
      }
    }
    return s0;
  }
  function peg$parseby() {
    var s0;
    if (input.substr(peg$currPos, 2).toLowerCase() === peg$c20) {
      s0 = input.substr(peg$currPos, 2);
      peg$currPos += 2;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e21);
      }
    }
    return s0;
  }
  function peg$parseof() {
    var s0;
    if (input.substr(peg$currPos, 2).toLowerCase() === peg$c21) {
      s0 = input.substr(peg$currPos, 2);
      peg$currPos += 2;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e22);
      }
    }
    return s0;
  }
  function peg$parserepeatEvery() {
    var s0, s1, s2, s3;
    s0 = peg$currPos;
    if (input.substr(peg$currPos, 6).toLowerCase() === peg$c22) {
      s1 = input.substr(peg$currPos, 6);
      peg$currPos += 6;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e23);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (input.substr(peg$currPos, 5).toLowerCase() === peg$c23) {
        s3 = input.substr(peg$currPos, 5);
        peg$currPos += 5;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e24);
        }
      }
      if (s3 !== peg$FAILED) {
        s1 = [s1, s2, s3];
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parsestarting() {
    var s0;
    if (input.substr(peg$currPos, 8).toLowerCase() === peg$c24) {
      s0 = input.substr(peg$currPos, 8);
      peg$currPos += 8;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e25);
      }
    }
    return s0;
  }
  function peg$parseupTo() {
    var s0, s1, s2, s3;
    s0 = peg$currPos;
    if (input.substr(peg$currPos, 2).toLowerCase() === peg$c25) {
      s1 = input.substr(peg$currPos, 2);
      peg$currPos += 2;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e26);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (input.substr(peg$currPos, 2).toLowerCase() === peg$c26) {
        s3 = input.substr(peg$currPos, 2);
        peg$currPos += 2;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e27);
        }
      }
      if (s3 !== peg$FAILED) {
        s1 = [s1, s2, s3];
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parsehold() {
    var s0, s1;
    s0 = peg$currPos;
    if (input.substr(peg$currPos, 4).toLowerCase() === peg$c27) {
      s1 = input.substr(peg$currPos, 4);
      peg$currPos += 4;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e28);
      }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f29();
    }
    s0 = s1;
    return s0;
  }
  function peg$parseschedule() {
    var s0, s1;
    s0 = peg$currPos;
    if (input.substr(peg$currPos, 8).toLowerCase() === peg$c28) {
      s1 = input.substr(peg$currPos, 8);
      peg$currPos += 8;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e29);
      }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f30();
    }
    s0 = s1;
    return s0;
  }
  function peg$parsefull() {
    var s0, s1;
    s0 = peg$currPos;
    if (input.substr(peg$currPos, 4).toLowerCase() === peg$c29) {
      s1 = input.substr(peg$currPos, 4);
      peg$currPos += 4;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e30);
      }
    }
    if (s1 !== peg$FAILED) {
      peg$parse_();
      peg$savedPos = s0;
      s0 = peg$f31();
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parsepriority() {
    var s0, s1, s2;
    s0 = peg$currPos;
    if (input.substr(peg$currPos, 1).toLowerCase() === peg$c30) {
      s1 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e31);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsenumber();
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f32(s2);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseremainder() {
    var s0, s1, s3;
    s0 = peg$currPos;
    if (input.substr(peg$currPos, 9).toLowerCase() === peg$c31) {
      s1 = input.substr(peg$currPos, 9);
      peg$currPos += 9;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e32);
      }
    }
    if (s1 !== peg$FAILED) {
      peg$parse_();
      s3 = peg$parsepositive();
      if (s3 === peg$FAILED) {
        s3 = null;
      }
      peg$savedPos = s0;
      s0 = peg$f33(s3);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parsetemplate() {
    var s0, s1, s2;
    s0 = peg$currPos;
    if (input.substr(peg$currPos, 9) === peg$c32) {
      s1 = peg$c32;
      peg$currPos += 9;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e33);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsepriority();
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      peg$savedPos = s0;
      s0 = peg$f34(s2);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parsegoal() {
    var s0, s1;
    s0 = peg$currPos;
    if (input.substr(peg$currPos, 5).toLowerCase() === peg$c33) {
      s1 = input.substr(peg$currPos, 5);
      peg$currPos += 5;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e34);
      }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f35();
    }
    s0 = s1;
    return s0;
  }
  function peg$parse_() {
    var s0, s1, s2;
    peg$silentFails++;
    s0 = peg$currPos;
    s1 = [];
    if (peg$r0.test(input.charAt(peg$currPos))) {
      s2 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e36);
      }
    }
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      if (peg$r0.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e36);
        }
      }
    }
    peg$savedPos = s0;
    s1 = peg$f36();
    s0 = s1;
    peg$silentFails--;
    s1 = peg$FAILED;
    if (peg$silentFails === 0) {
      peg$fail(peg$e35);
    }
    return s0;
  }
  function peg$parsed() {
    var s0;
    peg$silentFails++;
    if (peg$r1.test(input.charAt(peg$currPos))) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e39);
      }
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      if (peg$silentFails === 0) {
        peg$fail(peg$e38);
      }
    }
    return s0;
  }
  function peg$parsenumber() {
    var s0, s1, s2;
    peg$silentFails++;
    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parsed();
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parsed();
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      s0 = input.substring(s0, peg$currPos);
    } else {
      s0 = s1;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e40);
      }
    }
    return s0;
  }
  function peg$parsepositive() {
    var s0, s1, s2, s3, s4;
    s0 = peg$currPos;
    s1 = peg$currPos;
    if (peg$r2.test(input.charAt(peg$currPos))) {
      s2 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e41);
      }
    }
    if (s2 !== peg$FAILED) {
      s3 = [];
      if (peg$r1.test(input.charAt(peg$currPos))) {
        s4 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e39);
        }
      }
      while (s4 !== peg$FAILED) {
        s3.push(s4);
        if (peg$r1.test(input.charAt(peg$currPos))) {
          s4 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e39);
          }
        }
      }
      s2 = [s2, s3];
      s1 = s2;
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      s0 = input.substring(s0, peg$currPos);
    } else {
      s0 = s1;
    }
    return s0;
  }
  function peg$parseamount() {
    var s0, s3, s4, s5, s6, s7, s8, s9, s10, s11;
    peg$silentFails++;
    s0 = peg$currPos;
    peg$parsecurrencySymbol();
    peg$parse_();
    s3 = peg$currPos;
    s4 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 45) {
      s5 = peg$c30;
      peg$currPos++;
    } else {
      s5 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e43);
      }
    }
    if (s5 === peg$FAILED) {
      s5 = null;
    }
    s6 = [];
    s7 = peg$parsed();
    if (s7 !== peg$FAILED) {
      while (s7 !== peg$FAILED) {
        s6.push(s7);
        s7 = peg$parsed();
      }
    } else {
      s6 = peg$FAILED;
    }
    if (s6 !== peg$FAILED) {
      s7 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 46) {
        s8 = peg$c34;
        peg$currPos++;
      } else {
        s8 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e44);
        }
      }
      if (s8 !== peg$FAILED) {
        s9 = peg$currPos;
        s10 = peg$parsed();
        if (s10 !== peg$FAILED) {
          s11 = peg$parsed();
          if (s11 === peg$FAILED) {
            s11 = null;
          }
          s10 = [s10, s11];
          s9 = s10;
        } else {
          peg$currPos = s9;
          s9 = peg$FAILED;
        }
        if (s9 === peg$FAILED) {
          s9 = null;
        }
        s8 = [s8, s9];
        s7 = s8;
      } else {
        peg$currPos = s7;
        s7 = peg$FAILED;
      }
      if (s7 === peg$FAILED) {
        s7 = null;
      }
      s5 = [s5, s6, s7];
      s4 = s5;
    } else {
      peg$currPos = s4;
      s4 = peg$FAILED;
    }
    if (s4 !== peg$FAILED) {
      s3 = input.substring(s3, peg$currPos);
    } else {
      s3 = s4;
    }
    if (s3 !== peg$FAILED) {
      peg$savedPos = s0;
      s0 = peg$f38(s3);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      if (peg$silentFails === 0) {
        peg$fail(peg$e42);
      }
    }
    return s0;
  }
  function peg$parsepercent() {
    var s0, s1, s2, s3, s4, s5, s6, s7;
    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$currPos;
    s2 = peg$currPos;
    s3 = [];
    s4 = peg$parsed();
    if (s4 !== peg$FAILED) {
      while (s4 !== peg$FAILED) {
        s3.push(s4);
        s4 = peg$parsed();
      }
    } else {
      s3 = peg$FAILED;
    }
    if (s3 !== peg$FAILED) {
      s4 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 46) {
        s5 = peg$c34;
        peg$currPos++;
      } else {
        s5 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e44);
        }
      }
      if (s5 !== peg$FAILED) {
        s6 = [];
        s7 = peg$parsed();
        if (s7 !== peg$FAILED) {
          while (s7 !== peg$FAILED) {
            s6.push(s7);
            s7 = peg$parsed();
          }
        } else {
          s6 = peg$FAILED;
        }
        if (s6 === peg$FAILED) {
          s6 = null;
        }
        s5 = [s5, s6];
        s4 = s5;
      } else {
        peg$currPos = s4;
        s4 = peg$FAILED;
      }
      if (s4 === peg$FAILED) {
        s4 = null;
      }
      s3 = [s3, s4];
      s2 = s3;
    } else {
      peg$currPos = s2;
      s2 = peg$FAILED;
    }
    if (s2 !== peg$FAILED) {
      s1 = input.substring(s1, peg$currPos);
    } else {
      s1 = s2;
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (input.charCodeAt(peg$currPos) === 37) {
        s3 = peg$c35;
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e46);
        }
      }
      if (s3 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f39(s1);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e45);
      }
    }
    return s0;
  }
  function peg$parseyear() {
    var s0, s1, s2, s3, s4, s5;
    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$currPos;
    s2 = peg$parsed();
    if (s2 !== peg$FAILED) {
      s3 = peg$parsed();
      if (s3 !== peg$FAILED) {
        s4 = peg$parsed();
        if (s4 !== peg$FAILED) {
          s5 = peg$parsed();
          if (s5 !== peg$FAILED) {
            s2 = [s2, s3, s4, s5];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      s0 = input.substring(s0, peg$currPos);
    } else {
      s0 = s1;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e47);
      }
    }
    return s0;
  }
  function peg$parsemonth() {
    var s0, s1, s2, s3, s4, s5;
    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$currPos;
    s2 = peg$parseyear();
    if (s2 !== peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 45) {
        s3 = peg$c30;
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e43);
        }
      }
      if (s3 !== peg$FAILED) {
        s4 = peg$parsed();
        if (s4 !== peg$FAILED) {
          s5 = peg$parsed();
          if (s5 !== peg$FAILED) {
            s2 = [s2, s3, s4, s5];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      s0 = input.substring(s0, peg$currPos);
    } else {
      s0 = s1;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e48);
      }
    }
    return s0;
  }
  function peg$parseday() {
    var s0, s1, s2, s3;
    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$currPos;
    s2 = peg$parsed();
    if (s2 !== peg$FAILED) {
      s3 = peg$parsed();
      if (s3 !== peg$FAILED) {
        s2 = [s2, s3];
        s1 = s2;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      s0 = input.substring(s0, peg$currPos);
    } else {
      s0 = s1;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e49);
      }
    }
    return s0;
  }
  function peg$parsedate() {
    var s0, s1, s2, s3, s4;
    s0 = peg$currPos;
    s1 = peg$currPos;
    s2 = peg$parsemonth();
    if (s2 !== peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 45) {
        s3 = peg$c30;
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e43);
        }
      }
      if (s3 !== peg$FAILED) {
        s4 = peg$parseday();
        if (s4 !== peg$FAILED) {
          s2 = [s2, s3, s4];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      s0 = input.substring(s0, peg$currPos);
    } else {
      s0 = s1;
    }
    return s0;
  }
  function peg$parsecurrencySymbol() {
    var s0, s1, s2;
    peg$silentFails++;
    s0 = peg$currPos;
    if (input.length > peg$currPos) {
      s1 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e51);
      }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = peg$currPos;
      s2 = peg$f40(s1);
      if (s2) {
        s2 = void 0;
      } else {
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        s1 = [s1, s2];
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e50);
      }
    }
    return s0;
  }
  function peg$parserawScheduleName() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11;
    s0 = peg$currPos;
    s1 = peg$currPos;
    s2 = peg$currPos;
    s3 = peg$currPos;
    peg$silentFails++;
    s4 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 91) {
      s5 = peg$c4;
      peg$currPos++;
    } else {
      s5 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e4);
      }
    }
    if (s5 !== peg$FAILED) {
      if (input.substr(peg$currPos, 8).toLowerCase() === peg$c6) {
        s6 = input.substr(peg$currPos, 8);
        peg$currPos += 8;
      } else {
        s6 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e6);
        }
      }
      if (s6 === peg$FAILED) {
        if (input.substr(peg$currPos, 8).toLowerCase() === peg$c7) {
          s6 = input.substr(peg$currPos, 8);
          peg$currPos += 8;
        } else {
          s6 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e7);
          }
        }
      }
      if (s6 !== peg$FAILED) {
        s5 = [s5, s6];
        s4 = s5;
      } else {
        peg$currPos = s4;
        s4 = peg$FAILED;
      }
    } else {
      peg$currPos = s4;
      s4 = peg$FAILED;
    }
    peg$silentFails--;
    if (s4 === peg$FAILED) {
      s3 = void 0;
    } else {
      peg$currPos = s3;
      s3 = peg$FAILED;
    }
    if (s3 !== peg$FAILED) {
      if (peg$r3.test(input.charAt(peg$currPos))) {
        s4 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e52);
        }
      }
      if (s4 !== peg$FAILED) {
        s5 = [];
        s6 = peg$currPos;
        s7 = peg$currPos;
        peg$silentFails++;
        s8 = peg$currPos;
        s9 = peg$parse_();
        if (input.charCodeAt(peg$currPos) === 91) {
          s10 = peg$c4;
          peg$currPos++;
        } else {
          s10 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e4);
          }
        }
        if (s10 !== peg$FAILED) {
          if (input.substr(peg$currPos, 8).toLowerCase() === peg$c6) {
            s11 = input.substr(peg$currPos, 8);
            peg$currPos += 8;
          } else {
            s11 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e6);
            }
          }
          if (s11 === peg$FAILED) {
            if (input.substr(peg$currPos, 8).toLowerCase() === peg$c7) {
              s11 = input.substr(peg$currPos, 8);
              peg$currPos += 8;
            } else {
              s11 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e7);
              }
            }
          }
          if (s11 !== peg$FAILED) {
            s9 = [s9, s10, s11];
            s8 = s9;
          } else {
            peg$currPos = s8;
            s8 = peg$FAILED;
          }
        } else {
          peg$currPos = s8;
          s8 = peg$FAILED;
        }
        peg$silentFails--;
        if (s8 === peg$FAILED) {
          s7 = void 0;
        } else {
          peg$currPos = s7;
          s7 = peg$FAILED;
        }
        if (s7 !== peg$FAILED) {
          if (peg$r4.test(input.charAt(peg$currPos))) {
            s8 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s8 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e53);
            }
          }
          if (s8 !== peg$FAILED) {
            s7 = [s7, s8];
            s6 = s7;
          } else {
            peg$currPos = s6;
            s6 = peg$FAILED;
          }
        } else {
          peg$currPos = s6;
          s6 = peg$FAILED;
        }
        while (s6 !== peg$FAILED) {
          s5.push(s6);
          s6 = peg$currPos;
          s7 = peg$currPos;
          peg$silentFails++;
          s8 = peg$currPos;
          s9 = peg$parse_();
          if (input.charCodeAt(peg$currPos) === 91) {
            s10 = peg$c4;
            peg$currPos++;
          } else {
            s10 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e4);
            }
          }
          if (s10 !== peg$FAILED) {
            if (input.substr(peg$currPos, 8).toLowerCase() === peg$c6) {
              s11 = input.substr(peg$currPos, 8);
              peg$currPos += 8;
            } else {
              s11 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e6);
              }
            }
            if (s11 === peg$FAILED) {
              if (input.substr(peg$currPos, 8).toLowerCase() === peg$c7) {
                s11 = input.substr(peg$currPos, 8);
                peg$currPos += 8;
              } else {
                s11 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e7);
                }
              }
            }
            if (s11 !== peg$FAILED) {
              s9 = [s9, s10, s11];
              s8 = s9;
            } else {
              peg$currPos = s8;
              s8 = peg$FAILED;
            }
          } else {
            peg$currPos = s8;
            s8 = peg$FAILED;
          }
          peg$silentFails--;
          if (s8 === peg$FAILED) {
            s7 = void 0;
          } else {
            peg$currPos = s7;
            s7 = peg$FAILED;
          }
          if (s7 !== peg$FAILED) {
            if (peg$r4.test(input.charAt(peg$currPos))) {
              s8 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s8 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e53);
              }
            }
            if (s8 !== peg$FAILED) {
              s7 = [s7, s8];
              s6 = s7;
            } else {
              peg$currPos = s6;
              s6 = peg$FAILED;
            }
          } else {
            peg$currPos = s6;
            s6 = peg$FAILED;
          }
        }
        s3 = [s3, s4, s5];
        s2 = s3;
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
    } else {
      peg$currPos = s2;
      s2 = peg$FAILED;
    }
    if (s2 !== peg$FAILED) {
      s1 = input.substring(s1, peg$currPos);
    } else {
      s1 = s2;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f41();
    }
    s0 = s1;
    return s0;
  }
  function peg$parsename() {
    var s0, s1, s2, s3;
    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$currPos;
    s2 = [];
    if (peg$r5.test(input.charAt(peg$currPos))) {
      s3 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s3 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e55);
      }
    }
    if (s3 !== peg$FAILED) {
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        if (peg$r5.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e55);
          }
        }
      }
    } else {
      s2 = peg$FAILED;
    }
    if (s2 !== peg$FAILED) {
      s1 = input.substring(s1, peg$currPos);
    } else {
      s1 = s2;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f42();
    }
    s0 = s1;
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e54);
      }
    }
    return s0;
  }
  peg$result = peg$startRuleFunction();
  if (peg$result !== peg$FAILED && peg$currPos === input.length) {
    return peg$result;
  } else {
    if (peg$result !== peg$FAILED && peg$currPos < input.length) {
      peg$fail(peg$endExpectation());
    }
    throw peg$buildStructuredError(
      peg$maxFailExpected,
      peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
      peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
    );
  }
}
const TEMPLATE_PREFIX = "#template";
const GOAL_PREFIX = "#goal";
async function storeTemplates() {
  const categoriesWithTemplates = await getCategoriesWithTemplates();
  for (const { id, templates } of categoriesWithTemplates) {
    const goalDefs = JSON.stringify(templates);
    await update("categories", {
      id,
      goal_def: goalDefs
    });
  }
  await resetCategoryGoalDefsWithNoTemplates();
}
async function checkTemplates() {
  const categoryWithTemplates = await getCategoriesWithTemplates();
  const schedules = await getActiveSchedules();
  const scheduleNames = schedules.map(({ name }) => name);
  const errors = [];
  categoryWithTemplates.forEach(({ name, templates }) => {
    templates.forEach((template) => {
      if (template.type === "error") {
        if (template.error && template.error.includes("adjustment")) {
          errors.push(`${name}: ${template.line}
Error: ${template.error}`);
        } else {
          errors.push(`${name}: ${template.line}`);
        }
      } else if (template.type === "schedule" && !scheduleNames.includes(template.name)) {
        errors.push(`${name}: Schedule “${template.name}” does not exist`);
      }
    });
  });
  if (errors.length) {
    return {
      sticky: true,
      message: "There were errors interpreting some templates:",
      pre: errors.join("\n\n")
    };
  }
  return {
    type: "message",
    message: "All templates passed! 🎉"
  };
}
async function getCategoriesWithTemplates() {
  const templatesForCategory = [];
  const templateNotes = await getCategoriesWithTemplateNotes();
  templateNotes.forEach(({ id, name, note }) => {
    if (!note) {
      return;
    }
    const parsedTemplates = [];
    note.split("\n").forEach((line) => {
      const trimmedLine = line.substring(line.indexOf("#")).trim();
      if (!trimmedLine.startsWith(TEMPLATE_PREFIX) && !trimmedLine.startsWith(GOAL_PREFIX)) {
        return;
      }
      try {
        const parsedTemplate = peg$parse(trimmedLine);
        if (parsedTemplate.type === "schedule" && parsedTemplate.adjustment !== void 0) {
          if (parsedTemplate.adjustment <= -100 || parsedTemplate.adjustment > 1e3) {
            throw new Error(
              `Invalid adjustment percentage (${parsedTemplate.adjustment}%). Must be between -100% and 1000%`
            );
          }
        }
        parsedTemplates.push(parsedTemplate);
      } catch (e) {
        parsedTemplates.push({
          type: "error",
          directive: "error",
          line,
          error: e.message
        });
      }
    });
    if (!parsedTemplates.length) {
      return;
    }
    templatesForCategory.push({
      id,
      name,
      templates: parsedTemplates
    });
  });
  return templatesForCategory;
}
async function resetCategoryGoalDefsWithNoTemplates() {
  await run(
    `
      UPDATE categories
      SET goal_def = NULL
      WHERE id NOT IN (SELECT n.id
                       FROM notes n
                       WHERE lower(note) LIKE '%${TEMPLATE_PREFIX}%'
                          OR lower(note) LIKE '%${GOAL_PREFIX}%')
    `
  );
}
async function getCategoriesWithTemplateNotes() {
  return await all(
    `
      SELECT c.id AS id, c.name as name, n.note AS note
      FROM notes n
             JOIN categories c ON n.id = c.id
      WHERE c.id = n.id
        AND c.tombstone = 0
        AND (lower(note) LIKE '%${TEMPLATE_PREFIX}%'
        OR lower(note) LIKE '%${GOAL_PREFIX}%')
    `
  );
}
async function getActiveSchedules() {
  return await all(
    "SELECT id, rule, active, completed, posts_transaction, tombstone, name from schedules WHERE name NOT NULL AND tombstone = 0"
  );
}
class CategoryTemplateContext {
  /*----------------------------------------------------------------------------
   * Using This Class:
   * 1. instantiate via `await categoryTemplate.init(templates, categoryID, month)`;
   *    templates: all templates for this category (including templates and goals)
   *    categoryID: the ID of the category that this Class will be for
   *    month: the month string of the month for templates being applied
   * 2. gather needed data for external use.  ex: remainder weights, priorities, limitExcess
   * 3. run each priority level that is needed via runTemplatesForPriority
   * 4. run the remainder templates via runRemainder()
   * 5. finish processing by running getValues() and saving values for batch processing.
   * Alternate:
   * If the situation calls for it you can run all templates in a catagory in one go using the
   * method runAll which will run all templates and goals for reference, and can optionally be saved
   */
  //-----------------------------------------------------------------------------
  // Class interface
  // set up the class and check all templates
  static async init(templates, category, month, budgeted) {
    const lastMonthSheet = sheetForMonth(
      subMonths(month, 1)
    );
    const lastMonthBalance = await getSheetValue(
      lastMonthSheet,
      `leftover-${category.id}`
    );
    const carryover = await getSheetBoolean(
      lastMonthSheet,
      `carryover-${category.id}`
    );
    let fromLastMonth;
    if (lastMonthBalance < 0 && !carryover) {
      fromLastMonth = 0;
    } else if (category.is_income) {
      fromLastMonth = 0;
    } else {
      fromLastMonth = lastMonthBalance;
    }
    await CategoryTemplateContext.checkByAndScheduleAndSpend(templates, month);
    await CategoryTemplateContext.checkPercentage(templates);
    const hideDecimal = await aqlQuery(
      q("preferences").filter({ id: "hideFraction" }).select("*")
    );
    return new CategoryTemplateContext(
      templates,
      category,
      month,
      fromLastMonth,
      budgeted,
      hideDecimal.data.length > 0 ? hideDecimal.data[0].value === "true" : false
    );
  }
  isGoalOnly() {
    return this.templates.length === 0 && this.remainder.length === 0 && this.goals.length > 0;
  }
  getPriorities() {
    return Array.from(this.priorities);
  }
  hasRemainder() {
    return this.remainderWeight > 0 && !this.limitMet;
  }
  getRemainderWeight() {
    return this.remainderWeight;
  }
  getLimitExcess() {
    return this.limitExcess;
  }
  // what is the full requested amount this month
  async runAll(available) {
    let toBudget = 0;
    const prioritiesSorted = this.getPriorities().sort();
    for (let i = 0; i < prioritiesSorted.length; i++) {
      const p = prioritiesSorted[i];
      toBudget += await this.runTemplatesForPriority(p, available, available);
    }
    return toBudget;
  }
  // run all templates in a given priority level
  // return: amount budgeted in this priority level
  async runTemplatesForPriority(priority, budgetAvail, availStart) {
    if (!this.priorities.has(priority)) return 0;
    if (this.limitMet) return 0;
    const t = this.templates.filter((t2) => t2.priority === priority);
    let available = budgetAvail || 0;
    let toBudget = 0;
    let byFlag = false;
    let remainder = 0;
    let scheduleFlag = false;
    for (const template of t) {
      let newBudget = 0;
      switch (template.type) {
        case "simple": {
          newBudget = CategoryTemplateContext.runSimple(
            template,
            this.limitAmount
          );
          break;
        }
        case "copy": {
          newBudget = await CategoryTemplateContext.runCopy(template, this);
          break;
        }
        case "periodic": {
          newBudget = CategoryTemplateContext.runPeriodic(template, this);
          break;
        }
        case "spend": {
          newBudget = await CategoryTemplateContext.runSpend(template, this);
          break;
        }
        case "percentage": {
          newBudget = await CategoryTemplateContext.runPercentage(
            template,
            availStart,
            this
          );
          break;
        }
        case "by": {
          if (!byFlag) {
            newBudget = CategoryTemplateContext.runBy(this);
          } else {
            newBudget = 0;
          }
          byFlag = true;
          break;
        }
        case "schedule": {
          if (!scheduleFlag) {
            const budgeted = this.fromLastMonth + toBudget;
            const ret = await runSchedule(
              t,
              this.month,
              budgeted,
              remainder,
              this.fromLastMonth,
              toBudget,
              [],
              this.category
            );
            newBudget = ret.to_budget - toBudget;
            remainder = ret.remainder;
            scheduleFlag = true;
          }
          break;
        }
        case "average": {
          newBudget = await CategoryTemplateContext.runAverage(template, this);
          break;
        }
      }
      available = available - newBudget;
      toBudget += newBudget;
    }
    if (this.limitCheck) {
      if (toBudget + this.toBudgetAmount + this.fromLastMonth >= this.limitAmount) {
        const orig = toBudget;
        toBudget = this.limitAmount - this.toBudgetAmount - this.fromLastMonth;
        this.limitMet = true;
        available = available + orig - toBudget;
      }
    }
    if (this.hideDecimal) toBudget = this.removeFraction(toBudget);
    if (priority > 0 && available < 0 && !this.category.is_income) {
      this.fullAmount += toBudget;
      toBudget = Math.max(0, toBudget + available);
      this.toBudgetAmount += toBudget;
    } else {
      this.fullAmount += toBudget;
      this.toBudgetAmount += toBudget;
    }
    return this.category.is_income ? -toBudget : toBudget;
  }
  runRemainder(budgetAvail, perWeight) {
    if (this.remainder.length === 0) return 0;
    let toBudget = Math.round(this.remainderWeight * perWeight);
    let smallest = 1;
    if (this.hideDecimal) {
      toBudget = this.removeFraction(toBudget);
      smallest = 100;
    }
    if (toBudget > budgetAvail || budgetAvail - toBudget <= smallest) {
      toBudget = budgetAvail;
    }
    if (this.limitCheck) {
      if (toBudget + this.toBudgetAmount + this.fromLastMonth >= this.limitAmount) {
        toBudget = this.limitAmount - this.toBudgetAmount - this.fromLastMonth;
        this.limitMet = true;
      }
    }
    this.toBudgetAmount += toBudget;
    return toBudget;
  }
  getValues() {
    this.runGoal();
    return {
      budgeted: this.toBudgetAmount,
      goal: this.goalAmount,
      longGoal: this.isLongGoal
    };
  }
  //-----------------------------------------------------------------------------
  // Implementation
  category;
  //readonly so we can double check the category this is using
  month;
  templates = [];
  remainder = [];
  goals = [];
  priorities = /* @__PURE__ */ new Set();
  hideDecimal = false;
  remainderWeight = 0;
  toBudgetAmount = 0;
  // amount that will be budgeted by the templates
  fullAmount = null;
  // the full requested amount, start null for remainder only cats
  isLongGoal = null;
  //defaulting the goals to null so templates can be unset
  goalAmount = null;
  fromLastMonth = 0;
  // leftover from last month
  limitMet = false;
  limitExcess = 0;
  limitAmount = 0;
  limitCheck = false;
  limitHold = false;
  previouslyBudgeted = 0;
  constructor(templates, category, month, fromLastMonth, budgeted, hideDecimal = false) {
    this.category = category;
    this.month = month;
    this.fromLastMonth = fromLastMonth;
    this.previouslyBudgeted = budgeted;
    this.hideDecimal = hideDecimal;
    if (templates) {
      templates.forEach((t) => {
        if (t.directive === "template" && t.type !== "remainder") {
          this.templates.push(t);
          if (t.priority !== null) this.priorities.add(t.priority);
        } else if (t.directive === "template" && t.type === "remainder") {
          this.remainder.push(t);
          this.remainderWeight += t.weight;
        } else if (t.directive === "goal" && t.type === "goal") {
          this.goals.push(t);
        }
      });
    }
    this.checkLimit(templates);
    this.checkSpend();
    this.checkGoal();
  }
  runGoal() {
    if (this.goals.length > 0) {
      if (this.isGoalOnly()) this.toBudgetAmount = this.previouslyBudgeted;
      this.isLongGoal = true;
      this.goalAmount = amountToInteger$1(this.goals[0].amount);
      return;
    }
    this.goalAmount = this.fullAmount;
  }
  //-----------------------------------------------------------------------------
  //  Template Validation
  static async checkByAndScheduleAndSpend(templates, month) {
    if (templates.filter((t) => t.type === "schedule" || t.type === "by").length === 0) {
      return;
    }
    const scheduleNames = (await getActiveSchedules()).map(
      ({ name }) => name.trim()
    );
    templates.filter((t) => t.type === "schedule").forEach((t) => {
      if (!scheduleNames.includes(t.name.trim())) {
        throw new Error(`Schedule ${t.name.trim()} does not exist`);
      }
    });
    const lowestPriority = Math.min(
      ...templates.filter((t) => t.type === "schedule" || t.type === "by").map((t) => t.priority)
    );
    templates.filter((t) => t.type === "schedule" || t.type === "by").forEach((t) => {
      if (t.priority !== lowestPriority) {
        throw new Error(
          `Schedule and By templates must be the same priority level. Fix by setting all Schedule and By templates to priority level ${lowestPriority}`
        );
      }
    });
    templates.filter((t) => t.type === "by" || t.type === "spend").forEach((t) => {
      const range2 = differenceInCalendarMonths(
        `${t.month}`,
        month
      );
      if (range2 < 0 && !(t.repeat || t.annual)) {
        throw new Error(
          `Target month has passed, remove or update the target month`
        );
      }
    });
  }
  static async checkPercentage(templates) {
    const pt = templates.filter((t) => t.type === "percentage");
    if (pt.length === 0) return;
    const reqCategories = pt.map((t) => t.category.toLowerCase());
    const availCategories = await getCategories$3();
    const availNames = availCategories.filter((c) => c.is_income).map((c) => c.name.toLocaleLowerCase());
    reqCategories.forEach((n) => {
      if (n === "available funds" || n === "all income") ;
      else if (!availNames.includes(n)) {
        throw new Error(
          `Category "${n}" is not found in available income categories`
        );
      }
    });
  }
  checkLimit(templates) {
    for (const template of templates.filter(
      (t) => t.type === "simple" || t.type === "periodic" || t.type === "remainder"
    ).filter((t) => t.limit)) {
      if (this.limitCheck) {
        throw new Error("Only one `up to` allowed per category");
      }
      if (template.limit.period === "daily") {
        const numDays = differenceInCalendarDays(
          addMonths(this.month, 1),
          this.month
        );
        this.limitAmount += amountToInteger$1(template.limit.amount) * numDays;
      } else if (template.limit.period === "weekly") {
        const nextMonth$1 = nextMonth(this.month);
        let week = template.limit.start;
        const baseLimit = amountToInteger$1(template.limit.amount);
        while (week < nextMonth$1) {
          if (week >= this.month) {
            this.limitAmount += baseLimit;
          }
          week = addWeeks(week, 1);
        }
      } else if (template.limit.period === "monthly") {
        this.limitAmount = amountToInteger$1(template.limit.amount);
      } else {
        throw new Error("Invalid limit period. Check template syntax");
      }
      this.limitCheck = true;
      this.limitHold = template.limit.hold ? true : false;
      if (this.fromLastMonth >= this.limitAmount) {
        this.limitMet = true;
        if (this.limitHold) {
          this.limitExcess = 0;
          this.toBudgetAmount = 0;
          this.fullAmount = 0;
        } else {
          this.limitExcess = this.fromLastMonth - this.limitAmount;
          this.toBudgetAmount = -this.limitExcess;
          this.fullAmount = -this.limitExcess;
        }
      }
    }
  }
  checkSpend() {
    const st = this.templates.filter((t) => t.type === "spend");
    if (st.length > 1) {
      throw new Error("Only one spend template is allowed per category");
    }
  }
  checkGoal() {
    if (this.goals.length > 1) {
      throw new Error(`Only one #goal is allowed per category`);
    }
  }
  removeFraction(amount) {
    return amountToInteger$1(Math.round(integerToAmount(amount)));
  }
  //-----------------------------------------------------------------------------
  //  Processor Functions
  static runSimple(template, limit) {
    if (template.monthly != null) {
      return amountToInteger$1(template.monthly);
    } else {
      return limit;
    }
  }
  static async runCopy(template, templateContext) {
    const sheetName = sheetForMonth(
      subMonths(templateContext.month, template.lookBack)
    );
    return await getSheetValue(
      sheetName,
      `budget-${templateContext.category.id}`
    );
  }
  static runPeriodic(template, templateContext) {
    let toBudget = 0;
    const amount = amountToInteger$1(template.amount);
    const period = template.period.period;
    const numPeriods = template.period.amount;
    let date = template.starting;
    let dateShiftFunction;
    switch (period) {
      case "day":
        dateShiftFunction = addDays;
        break;
      case "week":
        dateShiftFunction = addWeeks;
        break;
      case "month":
        dateShiftFunction = addMonths;
        break;
      case "year":
        dateShiftFunction = (date2, numPeriods2) => addMonths(date2, numPeriods2 * 12);
        break;
    }
    while (templateContext.month > date) {
      date = dateShiftFunction(date, numPeriods);
    }
    if (differenceInCalendarMonths(templateContext.month, date) < 0) {
      return 0;
    }
    const nextMonth2 = addMonths(templateContext.month, 1);
    while (date < nextMonth2) {
      toBudget += amount;
      date = dateShiftFunction(date, numPeriods);
    }
    return toBudget;
  }
  static async runSpend(template, templateContext) {
    let fromMonth = `${template.from}`;
    let toMonth = `${template.month}`;
    let alreadyBudgeted = templateContext.fromLastMonth;
    let firstMonth = true;
    const repeat = template.annual ? (template.repeat || 1) * 12 : template.repeat;
    let m = differenceInCalendarMonths(
      toMonth,
      templateContext.month
    );
    if (repeat && m < 0) {
      while (m < 0) {
        toMonth = addMonths(toMonth, repeat);
        fromMonth = addMonths(fromMonth, repeat);
        m = differenceInCalendarMonths(
          toMonth,
          templateContext.month
        );
      }
    }
    for (let m2 = fromMonth; differenceInCalendarMonths(templateContext.month, m2) > 0; m2 = addMonths(m2, 1)) {
      const sheetName = sheetForMonth(m2);
      if (firstMonth) {
        const spent = await getSheetValue(
          sheetName,
          `sum-amount-${templateContext.category.id}`
        );
        const balance = await getSheetValue(
          sheetName,
          `leftover-${templateContext.category.id}`
        );
        alreadyBudgeted = balance - spent;
        firstMonth = false;
      } else {
        alreadyBudgeted += await getSheetValue(
          sheetName,
          `budget-${templateContext.category.id}`
        );
      }
    }
    const numMonths = differenceInCalendarMonths(
      toMonth,
      templateContext.month
    );
    const target = amountToInteger$1(template.amount);
    if (numMonths < 0) {
      return 0;
    } else {
      return Math.round((target - alreadyBudgeted) / (numMonths + 1));
    }
  }
  static async runPercentage(template, availableFunds, templateContext) {
    const percent = template.percent;
    const cat = template.category.toLowerCase();
    const prev = template.previous;
    let sheetName;
    let monthlyIncome = 1;
    if (prev) {
      sheetName = sheetForMonth(
        subMonths(templateContext.month, 1)
      );
    } else {
      sheetName = sheetForMonth(templateContext.month);
    }
    if (cat === "all income") {
      monthlyIncome = await getSheetValue(sheetName, `total-income`);
    } else if (cat === "available funds") {
      monthlyIncome = availableFunds;
    } else {
      const incomeCat = (await getCategories$3()).find(
        (c) => c.is_income && c.name.toLowerCase() === cat
      );
      monthlyIncome = await getSheetValue(
        sheetName,
        `sum-amount-${incomeCat.id}`
      );
    }
    return Math.max(0, Math.round(monthlyIncome * (percent / 100)));
  }
  static async runAverage(template, templateContext) {
    let sum = 0;
    for (let i = 1; i <= template.numMonths; i++) {
      const sheetName = sheetForMonth(
        subMonths(templateContext.month, i)
      );
      sum += await getSheetValue(
        sheetName,
        `sum-amount-${templateContext.category.id}`
      );
    }
    return -Math.round(sum / template.numMonths);
  }
  static runBy(templateContext) {
    const byTemplates = templateContext.templates.filter(
      (t) => t.type === "by"
    );
    const savedInfo = [];
    let totalNeeded = 0;
    let shortNumMonths;
    for (let i = 0; i < byTemplates.length; i++) {
      const template = byTemplates[i];
      let targetMonth = `${template.month}`;
      const period = template.annual ? (template.repeat || 1) * 12 : template.repeat != null ? template.repeat : null;
      let numMonths = differenceInCalendarMonths(
        targetMonth,
        templateContext.month
      );
      while (numMonths < 0 && period) {
        targetMonth = addMonths(targetMonth, period);
        numMonths = differenceInCalendarMonths(
          targetMonth,
          templateContext.month
        );
      }
      savedInfo.push({ numMonths, period });
      if (numMonths < shortNumMonths || !shortNumMonths) {
        shortNumMonths = numMonths;
      }
    }
    for (let i = 0; i < byTemplates.length; i++) {
      const template = byTemplates[i];
      const numMonths = savedInfo[i].numMonths;
      const period = savedInfo[i].period;
      let amount;
      if (numMonths > shortNumMonths && period) {
        amount = Math.round(
          amountToInteger$1(template.amount) / period * (period - numMonths + shortNumMonths)
        );
      } else if (numMonths > shortNumMonths) {
        amount = Math.round(
          amountToInteger$1(template.amount) / (numMonths + 1) * (shortNumMonths + 1)
        );
      } else {
        amount = amountToInteger$1(template.amount);
      }
      totalNeeded += amount;
    }
    return Math.round(
      (totalNeeded - templateContext.fromLastMonth) / (shortNumMonths + 1)
    );
  }
}
async function applyTemplate({
  month
}) {
  await storeTemplates();
  const categoryTemplates = await getTemplates();
  const ret = await processTemplate(month, false, categoryTemplates);
  return ret;
}
async function overwriteTemplate({
  month
}) {
  await storeTemplates();
  const categoryTemplates = await getTemplates();
  const ret = await processTemplate(month, true, categoryTemplates);
  return ret;
}
async function applyMultipleCategoryTemplates({
  month,
  categoryIds
}) {
  const { data: categoryData } = await aqlQuery(
    q("categories").filter({ id: { $oneof: categoryIds } }).select("*")
  );
  await storeTemplates();
  const categoryTemplates = await getTemplates((c) => categoryIds.includes(c.id));
  const ret = await processTemplate(
    month,
    true,
    categoryTemplates,
    categoryData
  );
  return ret;
}
async function applySingleCategoryTemplate({
  month,
  category
}) {
  const { data: categoryData } = await aqlQuery(
    q("categories").filter({ id: category }).select("*")
  );
  await storeTemplates();
  const categoryTemplates = await getTemplates((c) => c.id === category);
  const ret = await processTemplate(
    month,
    true,
    categoryTemplates,
    categoryData
  );
  return ret;
}
function runCheckTemplates() {
  return checkTemplates();
}
async function getCategories$2() {
  const { data: categoryGroups } = await aqlQuery(q("category_groups").filter({ hidden: false }).select("*"));
  return categoryGroups.flatMap((g) => g.categories || []).filter((c) => !c.hidden);
}
async function getTemplates(filter = () => true) {
  const { data: categoriesWithGoalDef } = await aqlQuery(
    q("categories").filter({ goal_def: { $ne: null } }).select("*")
  );
  const categoryTemplates = {};
  for (const categoryWithGoalDef of categoriesWithGoalDef.filter(filter)) {
    categoryTemplates[categoryWithGoalDef.id] = JSON.parse(
      categoryWithGoalDef.goal_def
    );
  }
  return categoryTemplates;
}
async function setBudgets(month, templateBudget) {
  await batchMessages(async () => {
    templateBudget.forEach((element) => {
      setBudget({
        category: element.category,
        month,
        amount: element.budgeted
      });
    });
  });
}
async function setGoals(month, templateGoal) {
  await batchMessages(async () => {
    templateGoal.forEach((element) => {
      setGoal({
        month,
        category: element.category,
        goal: element.goal,
        long_goal: element.longGoal
      });
    });
  });
}
async function processTemplate(month, force, categoryTemplates, categories = []) {
  const isReflect = isReflectBudget();
  if (!categories.length) {
    categories = (await getCategories$2()).filter((c) => isReflect || !c.is_income);
  }
  const templateContexts = [];
  let availBudget = await getSheetValue(
    sheetForMonth(month),
    `to-budget`
  );
  const prioritiesSet = /* @__PURE__ */ new Set();
  const errors = [];
  const budgetList = [];
  const goalList = [];
  for (const category of categories) {
    const { id } = category;
    const sheetName = sheetForMonth(month);
    const templates = categoryTemplates[id];
    const budgeted = await getSheetValue(sheetName, `budget-${id}`);
    const existingGoal = await getSheetValue(sheetName, `goal-${id}`);
    if ((budgeted === 0 || force) && templates) {
      try {
        const templateContext = await CategoryTemplateContext.init(
          templates,
          category,
          month,
          budgeted
        );
        if (!templateContext.isGoalOnly()) {
          availBudget += budgeted;
        }
        availBudget += templateContext.getLimitExcess();
        templateContext.getPriorities().forEach((p) => prioritiesSet.add(p));
        templateContexts.push(templateContext);
      } catch (e) {
        errors.push(`${category.name}: ${e.message}`);
      }
    } else if (existingGoal !== null && !templates) {
      goalList.push({
        category: id,
        goal: null,
        longGoal: null
      });
    }
  }
  if (templateContexts.length === 0 && errors.length === 0) {
    if (goalList.length > 0) {
      setGoals(month, goalList);
    }
    return {
      type: "message",
      message: "Everything is up to date"
    };
  }
  if (errors.length > 0) {
    return {
      sticky: true,
      message: "There were errors interpreting some templates:",
      pre: errors.join(`

`)
    };
  }
  const priorities = [...prioritiesSet].sort();
  for (const priority of priorities) {
    const availStart = availBudget;
    for (const templateContext of templateContexts) {
      const budget = await templateContext.runTemplatesForPriority(
        priority,
        availBudget,
        availStart
      );
      availBudget -= budget;
    }
  }
  let remainderContexts = templateContexts.filter((c) => c.hasRemainder());
  while (availBudget > 0 && remainderContexts.length > 0) {
    let remainderWeight = 0;
    remainderContexts.forEach(
      (context) => remainderWeight += context.getRemainderWeight()
    );
    const perWeight = availBudget / remainderWeight;
    remainderContexts.forEach((context) => {
      availBudget -= context.runRemainder(availBudget, perWeight);
    });
    remainderContexts = templateContexts.filter((c) => c.hasRemainder());
  }
  templateContexts.forEach((context) => {
    const values = context.getValues();
    budgetList.push({
      category: context.category.id,
      budgeted: values.budgeted
    });
    goalList.push({
      category: context.category.id,
      goal: values.goal,
      longGoal: values.longGoal ? 1 : null
    });
  });
  await setBudgets(month, budgetList);
  await setGoals(month, goalList);
  return {
    type: "message",
    message: `Successfully applied templates to ${templateContexts.length} categories`
  };
}
const app$e = createApp();
app$e.method("budget/budget-amount", mutator(undoable(setBudget)));
app$e.method(
  "budget/copy-previous-month",
  mutator(undoable(copyPreviousMonth))
);
app$e.method(
  "budget/copy-single-month",
  mutator(undoable(copySinglePreviousMonth))
);
app$e.method("budget/set-zero", mutator(undoable(setZero)));
app$e.method("budget/set-3month-avg", mutator(undoable(set3MonthAvg)));
app$e.method("budget/set-6month-avg", mutator(undoable(set6MonthAvg)));
app$e.method("budget/set-12month-avg", mutator(undoable(set12MonthAvg)));
app$e.method("budget/set-n-month-avg", mutator(undoable(setNMonthAvg)));
app$e.method(
  "budget/check-templates",
  mutator(undoable(runCheckTemplates))
);
app$e.method(
  "budget/apply-goal-template",
  mutator(undoable(applyTemplate))
);
app$e.method(
  "budget/apply-multiple-templates",
  mutator(undoable(applyMultipleCategoryTemplates))
);
app$e.method(
  "budget/overwrite-goal-template",
  mutator(undoable(overwriteTemplate))
);
app$e.method(
  "budget/apply-single-template",
  mutator(undoable(applySingleCategoryTemplate))
);
app$e.method(
  "budget/cleanup-goal-template",
  mutator(undoable(cleanupTemplate))
);
app$e.method(
  "budget/hold-for-next-month",
  mutator(undoable(holdForNextMonth))
);
app$e.method("budget/reset-hold", mutator(undoable(resetHold)));
app$e.method(
  "budget/cover-overspending",
  mutator(undoable(coverOverspending))
);
app$e.method(
  "budget/transfer-available",
  mutator(undoable(transferAvailable))
);
app$e.method(
  "budget/cover-overbudgeted",
  mutator(undoable(coverOverbudgeted))
);
app$e.method(
  "budget/transfer-category",
  mutator(undoable(transferCategory))
);
app$e.method(
  "budget/set-carryover",
  mutator(undoable(setCategoryCarryover))
);
app$e.method(
  "budget/reset-income-carryover",
  mutator(undoable(resetIncomeCarryover))
);
app$e.method("get-categories", getCategories$1);
app$e.method("get-budget-bounds", getBudgetBounds);
app$e.method("envelope-budget-month", envelopeBudgetMonth);
app$e.method("tracking-budget-month", trackingBudgetMonth);
app$e.method("category-create", mutator(undoable(createCategory$1)));
app$e.method("category-update", mutator(undoable(updateCategory)));
app$e.method("category-move", mutator(undoable(moveCategory)));
app$e.method("category-delete", mutator(undoable(deleteCategory)));
app$e.method("get-category-groups", getCategoryGroups);
app$e.method("category-group-create", mutator(undoable(createCategoryGroup$1)));
app$e.method("category-group-update", mutator(undoable(updateCategoryGroup)));
app$e.method("category-group-move", mutator(undoable(moveCategoryGroup)));
app$e.method("category-group-delete", mutator(undoable(deleteCategoryGroup)));
app$e.method("must-category-transfer", isCategoryTransferRequired);
async function getCategories$1() {
  const categoryGroups = await getCategoryGroups();
  return {
    grouped: categoryGroups,
    list: categoryGroups.flatMap((g) => g.categories ?? [])
  };
}
async function getBudgetBounds() {
  return await createAllBudgets();
}
async function envelopeBudgetMonth({ month }) {
  const groups = await getCategoriesGrouped();
  const sheetName = sheetForMonth(month);
  function value(name) {
    const v = getCellValue(sheetName, name);
    return { value: v === "" ? 0 : v, name: resolveName(sheetName, name) };
  }
  let values = [
    value("available-funds"),
    value("last-month-overspent"),
    value("buffered"),
    value("total-budgeted"),
    value("to-budget"),
    value("from-last-month"),
    value("total-income"),
    value("total-spent"),
    value("total-leftover")
  ];
  for (const group of groups) {
    const categories = group.categories ?? [];
    if (group.is_income) {
      values.push(value("total-income"));
      for (const cat of categories) {
        values.push(value(`sum-amount-${cat.id}`));
      }
    } else {
      values = values.concat([
        value(`group-budget-${group.id}`),
        value(`group-sum-amount-${group.id}`),
        value(`group-leftover-${group.id}`)
      ]);
      for (const cat of categories) {
        values = values.concat([
          value(`budget-${cat.id}`),
          value(`sum-amount-${cat.id}`),
          value(`leftover-${cat.id}`),
          value(`carryover-${cat.id}`),
          value(`goal-${cat.id}`),
          value(`long-goal-${cat.id}`)
        ]);
      }
    }
  }
  return values;
}
async function trackingBudgetMonth({ month }) {
  const groups = await getCategoriesGrouped();
  const sheetName = sheetForMonth(month);
  function value(name) {
    const v = getCellValue(sheetName, name);
    return { value: v === "" ? 0 : v, name: resolveName(sheetName, name) };
  }
  let values = [
    value("total-budgeted"),
    value("total-budget-income"),
    value("total-saved"),
    value("total-income"),
    value("total-spent"),
    value("real-saved"),
    value("total-leftover")
  ];
  for (const group of groups) {
    values = values.concat([
      value(`group-budget-${group.id}`),
      value(`group-sum-amount-${group.id}`),
      value(`group-leftover-${group.id}`)
    ]);
    const categories = group.categories ?? [];
    for (const cat of categories) {
      values = values.concat([
        value(`budget-${cat.id}`),
        value(`sum-amount-${cat.id}`),
        value(`leftover-${cat.id}`),
        value(`goal-${cat.id}`),
        value(`long-goal-${cat.id}`)
      ]);
      if (!group.is_income) {
        values.push(value(`carryover-${cat.id}`));
      }
    }
  }
  return values;
}
async function createCategory$1({
  name,
  groupId,
  isIncome,
  hidden
}) {
  if (!groupId) {
    throw APIError("Creating a category: groupId is required");
  }
  return await insertCategory({
    name: name.trim(),
    cat_group: groupId,
    is_income: isIncome ? 1 : 0,
    hidden: hidden ? 1 : 0
  });
}
async function updateCategory(category) {
  try {
    await updateCategory$1(
      categoryModel$1.toDb({
        ...category,
        name: category.name.trim()
      })
    );
  } catch (e) {
    if (e instanceof Error && e.message.toLowerCase().includes("unique constraint")) {
      return { error: { type: "category-exists" } };
    }
    throw e;
  }
  return {};
}
async function moveCategory({
  id,
  groupId,
  targetId
}) {
  await batchMessages(async () => {
    await moveCategory$1(id, groupId, targetId);
  });
}
async function deleteCategory({
  id,
  transferId
}) {
  let result = {};
  await batchMessages(async () => {
    const row = await first(
      "SELECT is_income FROM categories WHERE id = ?",
      [id]
    );
    if (!row) {
      result = { error: "no-categories" };
      return;
    }
    const transfer = transferId && await first(
      "SELECT is_income FROM categories WHERE id = ?",
      [transferId]
    );
    if (!row || transferId && !transfer) {
      result = { error: "no-categories" };
      return;
    } else if (transferId && row && transfer && row.is_income !== transfer.is_income) {
      result = { error: "category-type" };
      return;
    }
    if (row.is_income === 0) {
      if (transferId) {
        await doTransfer([id], transferId);
      }
    }
    await deleteCategory$1({ id }, transferId);
  });
  return result;
}
async function getCategoryGroups() {
  const { data: categoryGroups } = await aqlQuery(q("category_groups").select("*"));
  return categoryGroups;
}
async function createCategoryGroup$1({
  name,
  isIncome,
  hidden
}) {
  return await insertCategoryGroup({
    name,
    is_income: isIncome ? 1 : 0,
    hidden: hidden ? 1 : 0
  });
}
async function updateCategoryGroup(group) {
  await updateCategoryGroup$1(categoryGroupModel$1.toDb(group));
}
async function moveCategoryGroup({
  id,
  targetId
}) {
  await batchMessages(async () => {
    await moveCategoryGroup$1(id, targetId);
  });
}
async function deleteCategoryGroup({
  id,
  transferId
}) {
  const groupCategories = await all(
    "SELECT id FROM categories WHERE cat_group = ? AND tombstone = 0",
    [id]
  );
  await batchMessages(async () => {
    if (transferId) {
      await doTransfer(
        groupCategories.map((c) => c.id),
        transferId
      );
    }
    await deleteCategoryGroup$1({ id }, transferId);
  });
}
async function isCategoryTransferRequired({
  id
}) {
  const res = await runQuery(
    `SELECT count(t.id) as count FROM transactions t
       LEFT JOIN category_mapping cm ON cm.id = t.category
       WHERE cm.transferId = ? AND t.tombstone = 0`,
    [id],
    true
  );
  if (res[0].count !== 0) {
    return true;
  }
  return [...get$1().meta().createdMonths].some((month) => {
    const sheetName = sheetForMonth(month);
    const value = get$1().getCellValue(sheetName, "budget-" + id);
    return value != null && value !== 0;
  });
}
const random = Math.random;
function pickRandom(list) {
  return list[Math.floor(random() * list.length) % list.length];
}
function number(start, end) {
  return start + (end - start) * random();
}
function integer(start, end) {
  return Math.round(number(start, end));
}
function findMin(items, field) {
  let item = items[0];
  for (let i = 0; i < items.length; i++) {
    if (items[i][field] < item[field]) {
      item = items[i];
    }
  }
  return item;
}
function getStartingBalanceCat(categories) {
  return categories.find((c) => c.name === "Starting Balances").id;
}
function extractCommonThings(payees, groups) {
  const incomePayee = payees.find((p) => p.name === "Deposit");
  const expensePayees = payees.filter(
    (p) => p.name !== "Deposit" && p.name !== "Starting Balance"
  );
  const expenseGroup = groups.find((g) => !g.is_income);
  const incomeGroup = groups.find((g) => g.is_income);
  const categories = expenseGroup.categories.filter(
    (c) => [
      "Food",
      "Restaurants",
      "Entertainment",
      "Clothing",
      "General",
      "Gift",
      "Medical"
    ].indexOf(c.name) !== -1
  );
  return {
    incomePayee,
    expensePayees: expensePayees.filter((p) => !p.bill),
    incomeGroup,
    expenseCategories: categories,
    billCategories: groups.find((g) => g.name === "Bills").categories,
    billPayees: expensePayees.filter((p) => p.bill)
  };
}
async function fillPrimaryChecking(handlers2, account, payees, groups) {
  const {
    incomePayee,
    expensePayees,
    incomeGroup,
    expenseCategories,
    billCategories,
    billPayees
  } = extractCommonThings(payees, groups);
  const numTransactions = integer(100, 200);
  const transactions = [];
  for (let i = 0; i < numTransactions; i++) {
    let payee;
    if (random() < 0.09) {
      payee = incomePayee;
    } else {
      payee = pickRandom(expensePayees);
    }
    let category;
    if (payee.name === "Deposit") {
      category = incomeGroup.categories.find((c) => c.name === "Income");
    } else {
      category = pickRandom(expenseCategories);
    }
    let amount;
    if (payee.name === "Deposit") {
      amount = integer(5e4, 7e4);
    } else {
      amount = integer(0, random() < 0.05 ? -8e3 : -700);
    }
    const currentDate2 = subDays(
      currentDay(),
      Math.floor(i / 3)
    );
    const transaction2 = {
      id: uuid.v4(),
      amount,
      payee: payee.id,
      account: account.id,
      date: currentDate2,
      category: category.id
    };
    transactions.push(transaction2);
    if (random() < 0.2) {
      const a = Math.round(transaction2.amount / 3);
      const pick = () => payee === incomePayee ? incomeGroup.categories.find((c) => c.name === "Income").id : pickRandom(expenseCategories).id;
      transaction2.subtransactions = [
        {
          id: uuid.v4(),
          date: currentDate2,
          account: account.id,
          amount: a,
          category: pick()
        },
        {
          id: uuid.v4(),
          date: currentDate2,
          account: account.id,
          amount: a,
          category: pick()
        },
        {
          id: uuid.v4(),
          date: currentDate2,
          account: account.id,
          amount: transaction2.amount - a * 2,
          category: pick()
        }
      ];
    }
  }
  const earliestMonth = monthFromDate(
    transactions[transactions.length - 1].date
  );
  const months = rangeInclusive(
    earliestMonth,
    currentMonth()
  );
  const currentDay$1 = currentDay();
  for (const month of months) {
    let date = addDays(month, 12);
    if (isBefore(date, currentDay$1)) {
      transactions.push({
        amount: -1e4,
        payee: billPayees.find((p) => p.name.toLowerCase().includes("power")).id,
        account: account.id,
        date,
        category: billCategories.find((c) => c.name === "Power").id
      });
    }
    date = addDays(month, 18);
    if (isBefore(date, currentDay$1)) {
      transactions.push({
        amount: -9e3,
        payee: billPayees.find((p) => p.name.toLowerCase().includes("water")).id,
        account: account.id,
        date,
        category: billCategories.find((c) => c.name === "Water").id
      });
    }
    date = addDays(month, 2);
    if (isBefore(date, currentDay$1)) {
      transactions.push({
        amount: -12e4,
        payee: billPayees.find((p) => p.name.toLowerCase().includes("housy")).id,
        account: account.id,
        date,
        category: billCategories.find((c) => c.name === "Mortgage").id
      });
    }
    date = addDays(month, 20);
    if (isBefore(date, currentDay$1)) {
      transactions.push({
        amount: -6e3,
        payee: billPayees.find((p) => p.name.toLowerCase().includes("internet")).id,
        account: account.id,
        date,
        category: billCategories.find((c) => c.name === "Internet").id
      });
    }
    date = addDays(month, 23);
    if (isBefore(date, currentDay$1)) {
      transactions.push({
        amount: -7500,
        payee: billPayees.find((p) => p.name.toLowerCase().includes("t-mobile")).id,
        account: account.id,
        date,
        category: billCategories.find((c) => c.name === "Cell").id
      });
    }
  }
  let earliestDate = null;
  transactions.forEach((t) => {
    if (earliestDate == null || t.date < earliestDate) {
      earliestDate = t.date;
    }
  });
  transactions.unshift({
    amount: 1e5,
    payee: payees.find((p) => p.name === "Starting Balance").id,
    account: account.id,
    date: earliestDate,
    category: getStartingBalanceCat(incomeGroup.categories),
    starting_balance_flag: true
  });
  return addTransactions$1(account.id, transactions);
}
async function fillChecking(handlers2, account, payees, groups) {
  const { incomePayee, expensePayees, incomeGroup, expenseCategories } = extractCommonThings(payees, groups);
  const numTransactions = integer(20, 40);
  const transactions = [];
  for (let i = 0; i < numTransactions; i++) {
    let payee;
    if (random() < 0.04) {
      payee = incomePayee;
    } else {
      payee = pickRandom(expensePayees);
    }
    let category;
    if (payee.name === "Deposit") {
      category = incomeGroup.categories.find((c) => c.name === "Income");
    } else {
      category = pickRandom(expenseCategories);
    }
    const amount = payee.name === "Deposit" ? integer(5e4, 7e4) : integer(0, -1e4);
    transactions.push({
      amount,
      payee: payee.id,
      account: account.id,
      date: subDays(currentDay(), i * 2),
      category: category.id
    });
  }
  transactions.unshift({
    amount: integer(9e4, 12e4),
    payee: payees.find((p) => p.name === "Starting Balance").id,
    account: account.id,
    date: transactions[transactions.length - 1].date,
    category: getStartingBalanceCat(incomeGroup.categories),
    starting_balance_flag: true
  });
  await handlers2["transactions-batch-update"]({
    added: transactions,
    fastMode: true
  });
}
async function fillInvestment(handlers2, account, payees, groups) {
  const { incomePayee, incomeGroup } = extractCommonThings(payees, groups);
  const numTransactions = integer(10, 30);
  const transactions = [];
  for (let i = 0; i < numTransactions; i++) {
    const payee = incomePayee;
    const category = incomeGroup.categories.find((c) => c.name === "Income");
    const amount = integer(1e4, 2e4);
    transactions.push({
      amount,
      payee: payee.id,
      account: account.id,
      date: subDays(currentDay(), integer(10, 360)),
      category: category.id
    });
  }
  transactions.unshift({
    amount: integer(1e4, 2e4),
    payee: payees.find((p) => p.name === "Starting Balance").id,
    account: account.id,
    date: findMin(transactions, "date").date,
    category: getStartingBalanceCat(incomeGroup.categories),
    starting_balance_flag: true
  });
  await handlers2["transactions-batch-update"]({
    added: transactions,
    fastMode: true
  });
}
async function fillSavings(handlers2, account, payees, groups) {
  const { incomePayee, expensePayees, incomeGroup, expenseCategories } = extractCommonThings(payees, groups);
  const numTransactions = integer(15, 40);
  const transactions = [];
  for (let i = 0; i < numTransactions; i++) {
    let payee;
    if (random() < 0.3) {
      payee = incomePayee;
    } else {
      payee = pickRandom(expensePayees);
    }
    const category = payee === incomePayee ? incomeGroup.categories.find((c) => c.name === "Income") : pickRandom(expenseCategories);
    const amount = payee === incomePayee ? integer(1e4, 8e4) : integer(-1e4, -2e3);
    transactions.push({
      amount,
      payee: payee.id,
      account: account.id,
      date: subDays(currentDay(), i * 5),
      category: category.id
    });
  }
  transactions.unshift({
    amount: 3e4,
    payee: payees.find((p) => p.name === "Starting Balance").id,
    account: account.id,
    date: transactions[transactions.length - 1].date,
    category: getStartingBalanceCat(incomeGroup.categories),
    starting_balance_flag: true
  });
  await handlers2["transactions-batch-update"]({
    added: transactions,
    fastMode: true
  });
}
async function fillMortgage(handlers2, account, payees, groups) {
  const { incomePayee, incomeGroup } = extractCommonThings(payees, groups);
  const numTransactions = integer(7, 10);
  const amount = integer(1e5, 2e5);
  const category = incomeGroup.categories.find((c) => c.name === "Income");
  const transactions = [
    {
      amount: integer(-3e3, -3500) * 100 * 100,
      payee: payees.find((p) => p.name === "Starting Balance").id,
      account: account.id,
      date: subMonths(currentDay(), numTransactions) + "-02",
      category: getStartingBalanceCat(incomeGroup.categories),
      starting_balance_flag: true
    }
  ];
  for (let i = 0; i < numTransactions; i++) {
    const payee = incomePayee;
    transactions.push({
      amount,
      payee: payee.id,
      account: account.id,
      date: subMonths(currentDay(), i) + "-02",
      category: category.id,
      starting_balance_flag: true
    });
  }
  await handlers2["transactions-batch-update"]({
    added: transactions,
    fastMode: true
  });
}
async function fillOther(handlers2, account, payees, groups) {
  const { incomePayee, incomeGroup } = extractCommonThings(payees, groups);
  const numTransactions = integer(3, 6);
  const category = incomeGroup.categories.find((c) => c.name === "Income");
  const transactions = [
    {
      id: uuid.v4(),
      amount: integer(3250, 3700) * 100 * 100,
      payee: payees.find((p) => p.name === "Starting Balance").id,
      account: account.id,
      date: subMonths(currentDay(), numTransactions) + "-02",
      category: getStartingBalanceCat(incomeGroup.categories),
      starting_balance_flag: true
    }
  ];
  for (let i = 0; i < numTransactions; i++) {
    const payee = incomePayee;
    const amount = integer(4, 9) * 100 * 100;
    transactions.push({
      id: uuid.v4(),
      amount,
      payee: payee.id,
      account: account.id,
      date: subMonths(currentDay(), i) + "-02",
      category: category.id
    });
  }
  await handlers2["transactions-batch-update"]({
    added: transactions,
    fastMode: true
  });
}
async function createBudget$1(accounts, payees, groups) {
  const primaryAccount = accounts.find((a) => a.name = "Bank of America");
  const earliestDate = (await first(
    `SELECT t.date FROM v_transactions t LEFT JOIN accounts a ON t.account = a.id
       WHERE a.offbudget = 0 AND t.is_child = 0 ORDER BY date ASC LIMIT 1`
  )).date;
  const earliestPrimaryDate = (await first(
    `SELECT t.date FROM v_transactions t LEFT JOIN accounts a ON t.account = a.id
       WHERE a.id = ? AND a.offbudget = 0 AND t.is_child = 0 ORDER BY date ASC LIMIT 1`,
    [primaryAccount.id]
  )).date;
  const start = monthFromDate(fromDateRepr(earliestDate));
  const end = currentMonth();
  const months = rangeInclusive(start, end);
  function category(name) {
    for (const group of groups) {
      const cat = group.categories.find((c) => c.name === name);
      if (cat) {
        return cat;
      }
    }
  }
  function setBudget$1(month, category2, amount) {
    return setBudget({ month, category: category2.id, amount });
  }
  function setBudgetIfSpent(month, cat) {
    const spent = getCellValue(
      sheetForMonth(month),
      `sum-amount-${cat.id}`
    );
    if (spent < 0) {
      setBudget$1(month, cat, -spent);
    }
  }
  await runMutator(
    () => batchMessages(async () => {
      for (const month of months) {
        if (month >= monthFromDate(fromDateRepr(earliestPrimaryDate))) {
          setBudget$1(month, category("Food"), 4e4);
          setBudget$1(month, category("Restaurants"), 3e4);
          setBudget$1(month, category("Entertainment"), 1e4);
          setBudget$1(month, category("Clothing"), 3e3);
          setBudget$1(month, category("General"), 5e4);
          setBudget$1(month, category("Gift"), 7500);
          setBudget$1(month, category("Medical"), 1e4);
          setBudget$1(month, category("Cell"), 7500);
          setBudget$1(month, category("Internet"), 6e3);
          setBudget$1(month, category("Mortgage"), 12e4);
          setBudget$1(month, category("Water"), 9e3);
          setBudget$1(month, category("Power"), 1e4);
        } else {
          setBudgetIfSpent(month, category("Food"));
          setBudgetIfSpent(month, category("Restaurants"));
          setBudgetIfSpent(month, category("Entertainment"));
          setBudgetIfSpent(month, category("Clothing"));
          setBudgetIfSpent(month, category("General"));
          setBudgetIfSpent(month, category("Gift"));
          setBudgetIfSpent(month, category("Medical"));
          setBudgetIfSpent(month, category("Cell"));
          setBudgetIfSpent(month, category("Internet"));
          setBudgetIfSpent(month, category("Mortgage"));
          setBudgetIfSpent(month, category("Water"));
          setBudgetIfSpent(month, category("Power"));
        }
      }
    })
  );
  await waitOnSpreadsheet();
  await runMutator(
    () => batchMessages(async () => {
      let prevSaved = 0;
      for (const month of months) {
        if (month >= monthFromDate(fromDateRepr(earliestPrimaryDate)) && month <= currentMonth()) {
          const sheetName2 = sheetForMonth(month);
          const toBudget2 = getCellValue(
            sheetName2,
            "to-budget"
          );
          const available = toBudget2 - prevSaved;
          if (available - 403e3 > 0) {
            setBudget$1(month, category("Savings"), available - 403e3);
            setBuffer(month, 403e3);
            prevSaved += available - 403e3;
          } else if (available > 0) {
            setBuffer(month, available);
          }
        }
      }
    })
  );
  await waitOnSpreadsheet();
  const sheetName = sheetForMonth(currentMonth());
  const toBudget = getCellValue(sheetName, "to-budget");
  if (toBudget < 0) {
    await addTransactions$1(primaryAccount.id, [
      {
        amount: -toBudget,
        category: category("Income").id,
        date: currentMonth() + "-01"
      }
    ]);
  }
  await waitOnSpreadsheet();
}
async function createTestBudget(handlers2) {
  setSyncingMode("import");
  await execQuery("PRAGMA journal_mode = OFF");
  await runQuery("DELETE FROM categories;");
  await runQuery("DELETE FROM category_groups");
  const accounts = [
    { name: "Bank of America" },
    { name: "Ally Savings" },
    { name: "Capital One Checking" },
    { name: "HSBC" },
    { name: "Vanguard 401k", offBudget: true },
    { name: "Mortgage", offBudget: true },
    { name: "House Asset", offBudget: true },
    { name: "Roth IRA", offBudget: true }
  ];
  await runMutator(async () => {
    for (const account of accounts) {
      account.id = await handlers2["account-create"](account);
    }
  });
  const newPayees = [
    { name: "Starting Balance" },
    { name: "Kroger" },
    { name: "Publix" },
    { name: "Home Depot" },
    { name: "Movies" },
    { name: "Online store" },
    { name: "Deposit" },
    { name: "Dominion Power", bill: true },
    { name: "Extra Watery", bill: true },
    { name: "Housy House", bill: true },
    { name: "Fast Internet", bill: true },
    { name: "T-mobile", bill: true }
  ];
  const payees = [];
  await runMutator(
    () => batchMessages(async () => {
      for (const newPayee of newPayees) {
        const id = await handlers2["payee-create"]({ name: newPayee.name });
        payees.push({
          id,
          name: newPayee.name,
          ...newPayee
        });
      }
    })
  );
  const newCategoryGroups = [
    {
      name: "Usual Expenses",
      categories: [
        { name: "Savings" },
        { name: "Medical" },
        { name: "Gift" },
        { name: "General" },
        { name: "Clothing" },
        { name: "Entertainment" },
        { name: "Restaurants" },
        { name: "Food" }
      ]
    },
    {
      name: "Bills",
      categories: [
        { name: "Power" },
        { name: "Water" },
        { name: "Mortgage" },
        { name: "Internet" },
        { name: "Cell" }
      ]
    },
    {
      name: "Income",
      is_income: true,
      categories: [
        { name: "Income", is_income: true },
        { name: "Misc", is_income: true },
        { name: "Starting Balances", is_income: true }
      ]
    }
  ];
  const categoryGroups = [];
  await runMutator(async () => {
    for (const group of newCategoryGroups) {
      const groupId = await handlers2["category-group-create"]({
        name: group.name,
        isIncome: group.is_income
      });
      categoryGroups.push({
        ...group,
        id: groupId,
        categories: []
      });
      for (const category of group.categories) {
        const categoryId = await handlers2["category-create"]({
          ...category,
          isIncome: category.is_income,
          groupId
        });
        categoryGroups[categoryGroups.length - 1].categories.push({
          ...category,
          id: categoryId,
          group: groupId
        });
      }
    }
  });
  const allGroups = (await runHandler(handlers2["get-categories"])).grouped;
  setSyncingMode("import");
  await runMutator(
    () => batchMessages(async () => {
      for (const account of accounts) {
        if (account.name === "Bank of America") {
          await fillPrimaryChecking(handlers2, account, payees, allGroups);
        } else if (account.name === "Capital One Checking" || account.name === "HSBC") {
          await fillChecking(handlers2, account, payees, allGroups);
        } else if (account.name === "Ally Savings") {
          await fillSavings(handlers2, account, payees, allGroups);
        } else if (account.name === "Vanguard 401k" || account.name === "Roth IRA") {
          await fillInvestment(handlers2, account, payees, allGroups);
        } else if (account.name === "Mortgage") {
          await fillMortgage(handlers2, account, payees, allGroups);
        } else if (account.name === "House Asset") {
          await fillOther(handlers2, account, payees, allGroups);
        } else {
          console.error("Unknown account name for test budget: ", account.name);
          await fillChecking(handlers2, account, payees, allGroups);
        }
      }
    })
  );
  setSyncingMode("import");
  const primaryAccount = accounts.find((a) => a.name = "Bank of America");
  const { data: primaryBalance } = await aqlQuery(
    q("transactions").filter({ account: primaryAccount.id }).calculate({ $sum: "$amount" }).serialize()
  );
  if (primaryBalance < 0) {
    const { data: results } = await aqlQuery(
      q("transactions").filter({ account: primaryAccount.id, amount: { $gt: 0 } }).limit(1).select(["id", "amount"]).serialize()
    );
    const lastDeposit = results[0];
    await runHandler(handlers2["transaction-update"], {
      ...lastDeposit,
      amount: lastDeposit.amount + -primaryBalance + integer(1e4, 2e4)
    });
  }
  setSyncingMode("disabled");
  await reloadSpreadsheet(db$1);
  await createAllBudgets();
  await waitOnSpreadsheet();
  await runMutator(
    () => batchMessages(async () => {
      const account = accounts.find((acc) => acc.name === "Bank of America");
      await runHandler(handlers2["schedule/create"], {
        schedule: {
          name: "Phone bills",
          posts_transaction: false
        },
        conditions: [
          {
            op: "is",
            field: "payee",
            value: payees.find((item) => item.name === "Dominion Power").id
          },
          {
            op: "is",
            field: "account",
            value: account.id
          },
          {
            op: "is",
            field: "date",
            value: {
              start: currentDay(),
              frequency: "monthly",
              patterns: [],
              skipWeekend: false,
              weekendSolveMode: "after"
            }
          },
          { op: "isapprox", field: "amount", value: -12e3 }
        ]
      });
      await runHandler(handlers2["schedule/create"], {
        schedule: {
          name: "Internet bill",
          posts_transaction: false
        },
        conditions: [
          {
            op: "is",
            field: "payee",
            value: payees.find((item) => item.name === "Fast Internet").id
          },
          {
            op: "is",
            field: "account",
            value: account.id
          },
          {
            op: "is",
            field: "date",
            value: subDays(currentDay(), 1)
          },
          { op: "isapprox", field: "amount", value: -14e3 }
        ]
      });
      await runHandler(handlers2["schedule/create"], {
        schedule: {
          name: "Wedding",
          posts_transaction: false
        },
        conditions: [
          {
            op: "is",
            field: "date",
            value: {
              start: subDays(currentDay(), 3),
              frequency: "monthly",
              patterns: [],
              skipWeekend: false,
              weekendSolveMode: "after"
            }
          },
          { op: "is", field: "amount", value: -27e5 }
        ]
      });
      await runHandler(handlers2["schedule/create"], {
        schedule: {
          name: "Utilities",
          posts_transaction: false
        },
        conditions: [
          {
            op: "is",
            field: "account",
            value: account.id
          },
          {
            op: "is",
            field: "date",
            value: {
              start: addDays(currentDay(), 1),
              frequency: "monthly",
              patterns: [],
              skipWeekend: false,
              weekendSolveMode: "after"
            }
          },
          { op: "is", field: "amount", value: -19e4 }
        ]
      });
    })
  );
  await createBudget$1(accounts, payees, allGroups);
}
async function importActual(_filepath, buffer) {
  await exports.handlers["close-budget"]();
  let id;
  try {
    ({ id } = await importBuffer(
      { cloudFileId: null, groupId: null },
      buffer
    ));
  } catch (e) {
    if (e.type === "FileDownloadError") {
      return { error: e.reason };
    }
    throw e;
  }
  const sqliteDb = await openDatabase$1(
    join$1(getBudgetDir(id), "db.sqlite")
  );
  execQuery$2(
    sqliteDb,
    `
          DELETE FROM kvcache;
          DELETE FROM kvcache_key;
        `
  );
  closeDatabase$1(sqliteDb);
  await exports.handlers["load-budget"]({ id });
  await exports.handlers["get-budget-bounds"]();
  await waitOnSpreadsheet();
  await upload().catch(() => {
  });
}
function send(name, args) {
  return send$2(name, args);
}
async function batchBudgetUpdates(func) {
  await send("api/batch-budget-start");
  try {
    await func();
  } finally {
    await send("api/batch-budget-end");
  }
}
function setBudgetAmount(month, categoryId, value) {
  return send("api/budget-set-amount", { month, categoryId, amount: value });
}
function setBudgetCarryover(month, categoryId, flag) {
  return send("api/budget-set-carryover", { month, categoryId, flag });
}
function addTransactions(accountId, transactions, { learnCategories = false, runTransfers = false } = {}) {
  return send("api/transactions-add", {
    accountId,
    transactions,
    learnCategories,
    runTransfers
  });
}
function getAccounts() {
  return send("api/accounts-get");
}
function createAccount(account, initialBalance) {
  return send("api/account-create", { account, initialBalance });
}
function createCategoryGroup(group) {
  return send("api/category-group-create", { group });
}
function getCategories() {
  return send("api/categories-get", { grouped: false });
}
function createCategory(category) {
  return send("api/category-create", { category });
}
function getPayees$1() {
  return send("api/payees-get");
}
function createPayee$1(payee) {
  return send("api/payee-create", { payee });
}
function amountToInteger(n) {
  return Math.round(n * 100);
}
async function importAccounts$1(data, entityIdMap) {
  const accounts = sortByKey(data.accounts, "sortableIndex");
  return Promise.all(
    accounts.map(async (account) => {
      if (!account.isTombstone) {
        const id = await createAccount({
          name: account.accountName,
          offbudget: account.onBudget ? false : true,
          closed: account.hidden ? true : false
        });
        entityIdMap.set(account.entityId, id);
      }
    })
  );
}
async function importCategories$1(data, entityIdMap) {
  const masterCategories = sortByKey(data.masterCategories, "sortableIndex");
  await Promise.all(
    masterCategories.map(async (masterCategory) => {
      if (masterCategory.type === "OUTFLOW" && !masterCategory.isTombstone && masterCategory.subCategories && masterCategory.subCategories.some((cat) => !cat.isTombstone)) {
        const id = await createCategoryGroup({
          name: masterCategory.name,
          is_income: false
        });
        entityIdMap.set(masterCategory.entityId, id);
        if (masterCategory.note) {
          send$2("notes-save", { id, note: masterCategory.note });
        }
        if (masterCategory.subCategories) {
          const subCategories = sortByKey(
            masterCategory.subCategories,
            "sortableIndex"
          );
          subCategories.reverse();
          for (const category of subCategories) {
            if (!category.isTombstone) {
              let categoryName = category.name;
              if (masterCategory.name === "Hidden Categories") {
                const categoryNameParts = categoryName.split(" ` ");
                categoryNameParts.pop();
                categoryName = categoryNameParts.join("/").trim();
              }
              const id2 = await createCategory({
                name: categoryName,
                group_id: entityIdMap.get(category.masterCategoryId)
              });
              entityIdMap.set(category.entityId, id2);
              if (category.note) {
                send$2("notes-save", { id: id2, note: category.note });
              }
            }
          }
        }
      }
    })
  );
}
async function importPayees$1(data, entityIdMap) {
  for (const payee of data.payees) {
    if (!payee.isTombstone) {
      const id = await createPayee$1({
        name: payee.name,
        category: entityIdMap.get(payee.autoFillCategoryId) || null,
        transfer_acct: entityIdMap.get(payee.targetAccountId) || null
      });
      entityIdMap.set(payee.entityId, id);
    }
  }
}
async function importTransactions$1(data, entityIdMap) {
  const categories = await getCategories();
  const incomeCategoryId = categories.find(
    (cat) => cat.name === "Income"
  ).id;
  const accounts = await getAccounts();
  const payees = await getPayees$1();
  function getCategory(id) {
    if (id == null || id === "Category/__Split__") {
      return null;
    } else if (id === "Category/__ImmediateIncome__" || id === "Category/__DeferredIncome__") {
      return incomeCategoryId;
    }
    return entityIdMap.get(id);
  }
  function isOffBudget(acctId) {
    const acct = accounts.find((acct2) => acct2.id === acctId);
    if (!acct) {
      throw new Error("Could not find account for transaction when importing");
    }
    return acct.offbudget;
  }
  for (const transaction2 of data.transactions) {
    entityIdMap.set(transaction2.entityId, uuid.v4());
    if (transaction2.subTransactions) {
      for (const subTransaction of transaction2.subTransactions) {
        entityIdMap.set(subTransaction.entityId, uuid.v4());
      }
    }
  }
  const transactionsGrouped = groupBy(data.transactions, "accountId");
  await Promise.all(
    [...transactionsGrouped.keys()].map(async (accountId) => {
      const transactions = transactionsGrouped.get(accountId);
      const toImport = transactions.map((transaction2) => {
        if (transaction2.isTombstone) {
          return null;
        }
        const id = entityIdMap.get(transaction2.entityId);
        function transferProperties(t) {
          const transferId = entityIdMap.get(t.transferTransactionId) || null;
          let payee = null;
          let imported_payee = null;
          if (transferId) {
            payee = payees.find(
              (p) => p.transfer_acct === entityIdMap.get(t.targetAccountId)
            ).id;
          } else {
            payee = entityIdMap.get(t.payeeId);
            imported_payee = data.payees.find(
              (p) => p.entityId === t.payeeId
            )?.name;
          }
          return {
            transfer_id: transferId,
            payee,
            imported_payee
          };
        }
        const newTransaction = {
          id,
          amount: amountToInteger(transaction2.amount),
          category: isOffBudget(entityIdMap.get(accountId)) ? null : getCategory(transaction2.categoryId),
          date: transaction2.date,
          notes: transaction2.memo || null,
          cleared: transaction2.cleared === "Cleared" || transaction2.cleared === "Reconciled",
          reconciled: transaction2.cleared === "Reconciled",
          ...transferProperties(transaction2),
          subtransactions: transaction2.subTransactions && transaction2.subTransactions.filter((st) => !st.isTombstone).map((t) => {
            return {
              id: entityIdMap.get(t.entityId),
              amount: amountToInteger(t.amount),
              category: getCategory(t.categoryId),
              notes: t.memo || null,
              ...transferProperties(t)
            };
          })
        };
        return newTransaction;
      }).filter((x) => x);
      await addTransactions(entityIdMap.get(accountId), toImport, {
        learnCategories: true
      });
    })
  );
}
function fillInBudgets(data, categoryBudgets) {
  const budgets = [...categoryBudgets];
  data.masterCategories.forEach((masterCategory) => {
    if (masterCategory.subCategories) {
      masterCategory.subCategories.forEach((category) => {
        if (!budgets.find((b) => b.categoryId === category.entityId)) {
          budgets.push({
            budgeted: 0,
            categoryId: category.entityId
          });
        }
      });
    }
  });
  return budgets;
}
async function importBudgets$1(data, entityIdMap) {
  const budgets = sortByKey(data.monthlyBudgets, "month");
  await batchBudgetUpdates(async () => {
    for (const budget of budgets) {
      const filled = fillInBudgets(
        data,
        budget.monthlySubCategoryBudgets.filter((b) => !b.isTombstone)
      );
      await Promise.all(
        filled.map(async (catBudget) => {
          const amount = amountToInteger(catBudget.budgeted);
          const catId = entityIdMap.get(catBudget.categoryId);
          const month = monthFromDate(budget.month);
          if (!catId) {
            return;
          }
          await setBudgetAmount(month, catId, amount);
          if (catBudget.overspendingHandling === "AffectsBuffer") {
            await setBudgetCarryover(month, catId, false);
          } else if (catBudget.overspendingHandling === "Confined") {
            await setBudgetCarryover(month, catId, true);
          }
        })
      );
    }
  });
}
function estimateRecentness(str) {
  return str.split(",").reduce((total, version) => {
    const [_, number2] = version.split("-");
    return total + parseInt(number2);
  }, 0);
}
function findLatestDevice(zipped, entries) {
  let devices = entries.map((entry) => {
    const contents = zipped.readFile(entry).toString("utf8");
    let data;
    try {
      data = JSON.parse(contents);
    } catch (e) {
      return null;
    }
    if (data.hasFullKnowledge) {
      return {
        deviceGUID: data.deviceGUID,
        shortName: data.shortDeviceId,
        recentness: estimateRecentness(data.knowledge)
      };
    }
    return null;
  }).filter((x) => x);
  devices = sortByKey(devices, "recentness");
  return devices[devices.length - 1].deviceGUID;
}
async function doImport$1(data) {
  const entityIdMap = /* @__PURE__ */ new Map();
  console.log("Importing Accounts...");
  await importAccounts$1(data, entityIdMap);
  console.log("Importing Categories...");
  await importCategories$1(data, entityIdMap);
  console.log("Importing Payees...");
  await importPayees$1(data, entityIdMap);
  console.log("Importing Transactions...");
  await importTransactions$1(data, entityIdMap);
  console.log("Importing Budgets...");
  await importBudgets$1(data, entityIdMap);
  console.log("Setting up...");
}
function getBudgetName$1(filepath) {
  let unixFilepath = normalizePathSep(filepath);
  if (!/\.zip/.test(unixFilepath)) {
    return null;
  }
  unixFilepath = unixFilepath.replace(/\.zip$/, "").replace(/.ynab4$/, "");
  const m = unixFilepath.match(/([^/~]+)[^/]*$/);
  if (!m) {
    return null;
  }
  return m[1];
}
function getFile(entries, path2) {
  const files = entries.filter((e) => e.entryName === path2);
  if (files.length === 0) {
    throw new Error("Could not find file: " + path2);
  }
  if (files.length >= 2) {
    throw new Error("File name matches multiple files: " + path2);
  }
  return files[0];
}
function join(...paths) {
  return paths.slice(1).reduce(
    (full, path2) => {
      return full + "/" + path2.replace(/^\//, "");
    },
    paths[0].replace(/\/$/, "")
  );
}
function parseFile$2(buffer) {
  const zipped = new AdmZip(buffer);
  const entries = zipped.getEntries();
  let root = "";
  const dirMatch = entries[0].entryName.match(/([^/]*\.ynab4)/);
  if (dirMatch) {
    root = dirMatch[1] + "/";
  }
  const metaStr = zipped.readFile(getFile(entries, root + "Budget.ymeta"));
  const meta = JSON.parse(metaStr.toString("utf8"));
  const budgetPath = join(root, meta.relativeDataFolderName);
  const deviceFiles = entries.filter(
    (e) => e.entryName.startsWith(join(budgetPath, "devices"))
  );
  const deviceGUID = findLatestDevice(zipped, deviceFiles);
  const yfullPath = join(budgetPath, deviceGUID, "Budget.yfull");
  let contents;
  try {
    contents = zipped.readFile(getFile(entries, yfullPath)).toString("utf8");
  } catch (e) {
    console.log(e);
    throw new Error("Error reading Budget.yfull file");
  }
  try {
    return JSON.parse(contents);
  } catch (e) {
    throw new Error("Error parsing Budget.yfull file");
  }
}
const YNAB4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  doImport: doImport$1,
  getBudgetName: getBudgetName$1,
  parseFile: parseFile$2
}, Symbol.toStringTag, { value: "Module" }));
function amountFromYnab(amount) {
  return Math.round(amount / 10);
}
function importAccounts(data, entityIdMap) {
  return Promise.all(
    data.accounts.map(async (account) => {
      if (!account.deleted) {
        const id = await createAccount({
          name: account.name,
          offbudget: account.on_budget ? false : true,
          closed: account.closed
        });
        entityIdMap.set(account.id, id);
      }
    })
  );
}
async function importCategories(data, entityIdMap) {
  const categories = await getCategories();
  const incomeCatId = findIdByName(categories, "Income");
  const ynabIncomeCategories = ["To be Budgeted", "Inflow: Ready to Assign"];
  function checkSpecialCat(cat) {
    if (cat.category_group_id === findIdByName(data.category_groups, "Internal Master Category")) {
      if (ynabIncomeCategories.some(
        (ynabIncomeCategory) => equalsIgnoreCase(cat.name, ynabIncomeCategory)
      )) {
        return "income";
      } else {
        return "internal";
      }
    } else if (cat.category_group_id === findIdByName(data.category_groups, "Credit Card Payments")) {
      return "creditCard";
    } else if (cat.category_group_id === findIdByName(data.category_groups, "Income")) {
      return "income";
    }
  }
  for (const group of data.category_groups) {
    if (!group.deleted) {
      let groupId;
      if (!equalsIgnoreCase(group.name, "Internal Master Category") && !equalsIgnoreCase(group.name, "Credit Card Payments") && !equalsIgnoreCase(group.name, "Hidden Categories") && !equalsIgnoreCase(group.name, "Income")) {
        let run2 = true;
        const MAX_RETRY = 10;
        let count = 1;
        const origName = group.name;
        while (run2) {
          try {
            groupId = await createCategoryGroup({
              name: group.name,
              is_income: false,
              hidden: group.hidden
            });
            entityIdMap.set(group.id, groupId);
            run2 = false;
          } catch (e) {
            group.name = origName + "-" + count.toString();
            count += 1;
            if (count >= MAX_RETRY) {
              run2 = false;
              throw Error(e.message);
            }
          }
        }
      }
      if (equalsIgnoreCase(group.name, "Income")) {
        groupId = incomeCatId;
        entityIdMap.set(group.id, groupId);
      }
      const cats = data.categories.filter(
        (cat) => cat.category_group_id === group.id
      );
      for (const cat of cats.reverse()) {
        if (!cat.deleted) {
          switch (checkSpecialCat(cat)) {
            case "income": {
              const id = incomeCatId;
              entityIdMap.set(cat.id, id);
              break;
            }
            case "creditCard":
            // ignores it
            case "internal":
              break;
            default: {
              let run2 = true;
              const MAX_RETRY = 10;
              let count = 1;
              const origName = cat.name;
              while (run2) {
                try {
                  const id = await createCategory({
                    name: cat.name,
                    group_id: groupId,
                    hidden: cat.hidden
                  });
                  entityIdMap.set(cat.id, id);
                  run2 = false;
                } catch (e) {
                  cat.name = origName + "-" + count.toString();
                  count += 1;
                  if (count >= MAX_RETRY) {
                    run2 = false;
                    throw Error(e.message);
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
function importPayees(data, entityIdMap) {
  return Promise.all(
    data.payees.map(async (payee) => {
      if (!payee.deleted) {
        const id = await createPayee$1({
          name: payee.name
        });
        entityIdMap.set(payee.id, id);
      }
    })
  );
}
async function importTransactions(data, entityIdMap) {
  const payees = await getPayees$1();
  const categories = await getCategories();
  const incomeCatId = findIdByName(categories, "Income");
  const startingBalanceCatId = findIdByName(categories, "Starting Balances");
  const startingPayeeYNAB = findIdByName(data.payees, "Starting Balance");
  const transactionsGrouped = groupBy(data.transactions, "account_id");
  const subtransactionsGrouped = groupBy(
    data.subtransactions,
    "transaction_id"
  );
  const payeesByTransferAcct = payees.filter((payee) => payee?.transfer_acct).map((payee) => [payee.transfer_acct, payee]);
  const payeeTransferAcctHashMap = new Map(
    payeesByTransferAcct
  );
  const orphanTransferMap = /* @__PURE__ */ new Map();
  const orphanSubtransfer = [];
  const orphanSubtransferTrxId = [];
  const orphanSubtransferAcctIdByTrxIdMap = /* @__PURE__ */ new Map();
  const orphanSubtransferDateByTrxIdMap = /* @__PURE__ */ new Map();
  for (const transaction2 of data.subtransactions) {
    entityIdMap.set(transaction2.id, uuid.v4());
    if (transaction2.transfer_account_id) {
      orphanSubtransfer.push(transaction2);
      orphanSubtransferTrxId.push(transaction2.transaction_id);
    }
  }
  for (const transaction2 of data.transactions) {
    entityIdMap.set(transaction2.id, uuid.v4());
    if (transaction2.transfer_account_id && !transaction2.transfer_transaction_id) {
      const key = transaction2.account_id + "#" + transaction2.transfer_account_id;
      if (!orphanTransferMap.has(key)) {
        orphanTransferMap.set(key, [transaction2]);
      } else {
        orphanTransferMap.get(key).push(transaction2);
      }
    }
    if (orphanSubtransferTrxId.includes(transaction2.id)) {
      orphanSubtransferAcctIdByTrxIdMap.set(
        transaction2.id,
        transaction2.account_id
      );
      orphanSubtransferDateByTrxIdMap.set(transaction2.id, transaction2.date);
    }
  }
  const orphanSubtransferMap = orphanSubtransfer.reduce(
    (map, subtransaction) => {
      const key = subtransaction.transfer_account_id + "#" + orphanSubtransferAcctIdByTrxIdMap.get(subtransaction.transaction_id);
      if (!map.has(key)) {
        map.set(key, [subtransaction]);
      } else {
        map.get(key).push(subtransaction);
      }
      return map;
    },
    /* @__PURE__ */ new Map()
  );
  const orphanTransferComparator = (a, b) => {
    const date_a = "date" in a ? a.date : orphanSubtransferDateByTrxIdMap.get(a.transaction_id);
    const date_b = "date" in b ? b.date : orphanSubtransferDateByTrxIdMap.get(b.transaction_id);
    const amount_a = "date" in a ? a.amount : -a.amount;
    const amount_b = "date" in b ? b.amount : -b.amount;
    if (date_a > date_b) return 1;
    if (date_a < date_b) return -1;
    if (amount_a > amount_b) return 1;
    if (amount_a < amount_b) return -1;
    if (a.memo > b.memo) return 1;
    if (a.memo < b.memo) return -1;
    return 0;
  };
  const orphanTrxIdSubtrxIdMap = /* @__PURE__ */ new Map();
  orphanTransferMap.forEach((transactions, key) => {
    const subtransactions = orphanSubtransferMap.get(key);
    if (subtransactions) {
      transactions.sort(orphanTransferComparator);
      subtransactions.sort(orphanTransferComparator);
      let transactionIdx = 0;
      let subtransactionIdx = 0;
      do {
        switch (orphanTransferComparator(
          transactions[transactionIdx],
          subtransactions[subtransactionIdx]
        )) {
          case 0:
            orphanTrxIdSubtrxIdMap.set(
              transactions[transactionIdx].id,
              entityIdMap.get(subtransactions[subtransactionIdx].id)
            );
            orphanTrxIdSubtrxIdMap.set(
              subtransactions[subtransactionIdx].id,
              entityIdMap.get(transactions[transactionIdx].id)
            );
            transactionIdx++;
            subtransactionIdx++;
            break;
          case -1:
            transactionIdx++;
            break;
          case 1:
            subtransactionIdx++;
            break;
        }
      } while (transactionIdx < transactions.length && subtransactionIdx < subtransactions.length);
    }
  });
  await Promise.all(
    [...transactionsGrouped.keys()].map(async (accountId) => {
      const transactions = transactionsGrouped.get(accountId);
      const toImport = transactions.map((transaction2) => {
        if (transaction2.deleted) {
          return null;
        }
        const subtransactions = subtransactionsGrouped.get(transaction2.id);
        const newTransaction = {
          id: entityIdMap.get(transaction2.id),
          account: entityIdMap.get(transaction2.account_id),
          date: transaction2.date,
          amount: amountFromYnab(transaction2.amount),
          category: entityIdMap.get(transaction2.category_id) || null,
          cleared: ["cleared", "reconciled"].includes(transaction2.cleared),
          reconciled: transaction2.cleared === "reconciled",
          notes: transaction2.memo || null,
          imported_id: transaction2.import_id || null,
          transfer_id: entityIdMap.get(transaction2.transfer_transaction_id) || orphanTrxIdSubtrxIdMap.get(transaction2.id) || null,
          subtransactions: subtransactions ? subtransactions.map((subtrans) => {
            return {
              id: entityIdMap.get(subtrans.id),
              amount: amountFromYnab(subtrans.amount),
              category: entityIdMap.get(subtrans.category_id) || null,
              notes: subtrans.memo,
              transfer_id: orphanTrxIdSubtrxIdMap.get(subtrans.id) || null,
              payee: null,
              imported_payee: null
            };
          }) : null,
          payee: null,
          imported_payee: null
        };
        const transactionPayeeUpdate = (trx, newTrx) => {
          if (trx.transfer_account_id) {
            const mappedTransferAccountId = entityIdMap.get(
              trx.transfer_account_id
            );
            newTrx.payee = payeeTransferAcctHashMap.get(
              mappedTransferAccountId
            )?.id;
          } else {
            newTrx.payee = entityIdMap.get(trx.payee_id);
            newTrx.imported_payee = data.payees.find(
              (p) => !p.deleted && p.id === trx.payee_id
            )?.name;
          }
        };
        transactionPayeeUpdate(transaction2, newTransaction);
        if (newTransaction.subtransactions) {
          subtransactions.forEach((subtrans) => {
            const newSubtransaction = newTransaction.subtransactions.find(
              (newSubtrans) => newSubtrans.id === entityIdMap.get(subtrans.id)
            );
            transactionPayeeUpdate(subtrans, newSubtransaction);
          });
        }
        if (transaction2.payee_id === startingPayeeYNAB && entityIdMap.get(transaction2.category_id) === incomeCatId) {
          newTransaction.category = startingBalanceCatId;
          newTransaction.payee = null;
        }
        return newTransaction;
      }).filter((x) => x);
      await addTransactions(entityIdMap.get(accountId), toImport, {
        learnCategories: true
      });
    })
  );
}
async function importBudgets(data, entityIdMap) {
  const budgets = sortByKey(data.months, "month");
  const internalCatIdYnab = findIdByName(
    data.category_groups,
    "Internal Master Category"
  );
  const creditcardCatIdYnab = findIdByName(
    data.category_groups,
    "Credit Card Payments"
  );
  await batchBudgetUpdates(async () => {
    for (const budget of budgets) {
      const month = monthFromDate(budget.month);
      await Promise.all(
        budget.categories.map(async (catBudget) => {
          const catId = entityIdMap.get(catBudget.id);
          const amount = Math.round(catBudget.budgeted / 10);
          if (!catId || catBudget.category_group_id === internalCatIdYnab || catBudget.category_group_id === creditcardCatIdYnab) {
            return;
          }
          await setBudgetAmount(month, catId, amount);
        })
      );
    }
  });
}
async function doImport(data) {
  const entityIdMap = /* @__PURE__ */ new Map();
  console.log("Importing Accounts...");
  await importAccounts(data, entityIdMap);
  console.log("Importing Categories...");
  await importCategories(data, entityIdMap);
  console.log("Importing Payees...");
  await importPayees(data, entityIdMap);
  console.log("Importing Transactions...");
  await importTransactions(data, entityIdMap);
  console.log("Importing Budgets...");
  await importBudgets(data, entityIdMap);
  console.log("Setting up...");
}
function parseFile$1(buffer) {
  let data = JSON.parse(buffer.toString());
  if (data.data) {
    data = data.data;
  }
  if (data.budget) {
    data = data.budget;
  }
  return data;
}
function getBudgetName(_filepath, data) {
  return data.budget_name || data.name;
}
function equalsIgnoreCase(stringa, stringb) {
  return stringa.localeCompare(stringb, void 0, {
    sensitivity: "base"
  }) === 0;
}
function findByNameIgnoreCase(categories, name) {
  return categories.find((cat) => equalsIgnoreCase(cat.name, name));
}
function findIdByName(categories, name) {
  return findByNameIgnoreCase(categories, name)?.id;
}
const YNAB5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  doImport,
  getBudgetName,
  parseFile: parseFile$1
}, Symbol.toStringTag, { value: "Module" }));
const importers = {
  ynab4: YNAB4,
  ynab5: YNAB5
};
async function handleBudgetImport(type, filepath, buffer) {
  if (type === "actual") {
    return importActual(filepath, buffer);
  }
  const importer = importers[type];
  try {
    let data;
    let budgetName;
    try {
      data = importer.parseFile(buffer);
      budgetName = importer.getBudgetName(filepath, data);
    } catch (e) {
      console.error("failed to parse file", e);
    }
    if (!budgetName) {
      return { error: "not-" + type };
    }
    try {
      await exports.handlers["api/start-import"]({ budgetName });
    } catch (e) {
      console.error("failed to start import", e);
      return { error: "unknown" };
    }
    await importer.doImport(data);
  } catch (e) {
    await exports.handlers["api/abort-import"]();
    console.error("failed to run import", e);
    return { error: "unknown" };
  }
  await exports.handlers["api/finish-import"]();
}
function migrateParentIds(_oldValues, newValues) {
  newValues.forEach((items, table) => {
    if (table === "transactions") {
      const toApply = [];
      items.forEach((newValue) => {
        if (newValue.isChild === 1 && newValue.parent_id == null && newValue.id.includes("/")) {
          const parentId = newValue.id.split("/")[0];
          toApply.push({
            dataset: "transactions",
            row: newValue.id,
            column: "parent_id",
            value: parentId,
            timestamp: Timestamp.send()
          });
        }
      });
      if (toApply.length > 0) {
        applyMessages(toApply);
      }
    }
  });
}
let _unlisten = null;
function listen() {
  unlisten();
  _unlisten = addSyncListener(migrateParentIds);
}
function unlisten() {
  if (_unlisten) {
    _unlisten();
    _unlisten = null;
  }
}
async function runMigration$3(db2) {
  function getValue(node) {
    return node.expr != null ? node.expr : node.cachedValue;
  }
  db2.execQuery(`
CREATE TABLE zero_budget_months
  (id TEXT PRIMARY KEY,
   buffered INTEGER DEFAULT 0);

CREATE TABLE zero_budgets
  (id TEXT PRIMARY KEY,
   month INTEGER,
   category TEXT,
   amount INTEGER DEFAULT 0,
   carryover INTEGER DEFAULT 0);

CREATE TABLE reflect_budgets
  (id TEXT PRIMARY KEY,
   month INTEGER,
   category TEXT,
   amount INTEGER DEFAULT 0,
   carryover INTEGER DEFAULT 0);

CREATE TABLE notes
  (id TEXT PRIMARY KEY,
   note TEXT);

CREATE TABLE kvcache (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE kvcache_key (id INTEGER PRIMARY KEY, key REAL);
`);
  const budget = db2.runQuery(
    `SELECT * FROM spreadsheet_cells WHERE name LIKE 'budget%!budget-%'`,
    [],
    true
  );
  db2.transaction(() => {
    budget.forEach((monthBudget) => {
      const match = monthBudget.name.match(
        /^(budget-report|budget)(\d+)!budget-(.+)$/
      );
      if (match == null) {
        console.log("Warning: invalid budget month name", monthBudget.name);
        return;
      }
      const type = match[1];
      const month = match[2].slice(0, 4) + "-" + match[2].slice(4);
      const dbmonth = parseInt(match[2]);
      const cat = match[3];
      let amount = parseInt(getValue(monthBudget));
      if (isNaN(amount)) {
        amount = 0;
      }
      const sheetName = monthBudget.name.split("!")[0];
      const carryover = db2.runQuery(
        "SELECT * FROM spreadsheet_cells WHERE name = ?",
        [`${sheetName}!carryover-${cat}`],
        true
      );
      const table = type === "budget-report" ? "reflect_budgets" : "zero_budgets";
      db2.runQuery(
        `INSERT INTO ${table} (id, month, category, amount, carryover) VALUES (?, ?, ?, ?, ?)`,
        [
          `${month}-${cat}`,
          dbmonth,
          cat,
          amount,
          carryover.length > 0 && getValue(carryover[0]) === "true" ? 1 : 0
        ]
      );
    });
  });
  const buffers = db2.runQuery(
    `SELECT * FROM spreadsheet_cells WHERE name LIKE 'budget%!buffered'`,
    [],
    true
  );
  db2.transaction(() => {
    buffers.forEach((buffer) => {
      const match = buffer.name.match(/^budget(\d+)!buffered$/);
      if (match) {
        const month = match[1].slice(0, 4) + "-" + match[1].slice(4);
        let amount = parseInt(getValue(buffer));
        if (isNaN(amount)) {
          amount = 0;
        }
        db2.runQuery(
          `INSERT INTO zero_budget_months (id, buffered) VALUES (?, ?)`,
          [month, amount]
        );
      }
    });
  });
  const notes = db2.runQuery(
    `SELECT * FROM spreadsheet_cells WHERE name LIKE 'notes!%'`,
    [],
    true
  );
  const parseNote = (str) => {
    try {
      const value = JSON.parse(str);
      return value && value !== "" ? value : null;
    } catch (e) {
      return null;
    }
  };
  db2.transaction(() => {
    notes.forEach((note) => {
      const parsed = parseNote(getValue(note));
      if (parsed) {
        const [, id] = note.name.split("!");
        db2.runQuery(`INSERT INTO notes (id, note) VALUES (?, ?)`, [id, parsed]);
      }
    });
  });
  db2.execQuery(`
    DROP TABLE spreadsheet_cells;
    ANALYZE;
    VACUUM;
  `);
}
async function runMigration$2(db2) {
  const categories = await db2.runQuery(
    "SELECT id FROM categories WHERE tombstone = 0",
    [],
    true
  );
  const customReports = await db2.runQuery(
    "SELECT id, selected_categories, conditions FROM custom_reports WHERE tombstone = 0 AND selected_categories IS NOT NULL",
    [],
    true
  );
  for (const report of customReports) {
    const conditions = report.conditions ? JSON.parse(report.conditions) : [];
    const selectedCategories = report.selected_categories ? JSON.parse(report.selected_categories) : [];
    const selectedCategoryIds = selectedCategories.map(({ id }) => id);
    const areAllCategoriesSelected = !categories.find(
      ({ id }) => !selectedCategoryIds.includes(id)
    );
    if (areAllCategoriesSelected) {
      continue;
    }
    if (conditions.find(({ field }) => field === "category")) {
      continue;
    }
    await db2.runQuery("UPDATE custom_reports SET conditions = ? WHERE id = ?", [
      JSON.stringify([
        ...conditions,
        {
          field: "category",
          op: "oneOf",
          value: selectedCategoryIds,
          type: "id"
        }
      ]),
      report.id
    ]);
  }
  await db2.runQuery(
    "UPDATE custom_reports SET selected_categories = NULL WHERE tombstone = 0"
  );
}
async function runMigration$1(db2) {
  db2.transaction(() => {
    db2.execQuery(`
      CREATE TABLE dashboard
        (id TEXT PRIMARY KEY,
         type TEXT,
         width INTEGER,
         height INTEGER,
         x INTEGER,
         y INTEGER,
         meta TEXT,
         tombstone INTEGER DEFAULT 0);

      INSERT INTO dashboard (id, type, width, height, x, y)
      VALUES
        ('${uuid.v4()}','net-worth-card', 8, 2, 0, 0),
        ('${uuid.v4()}', 'cash-flow-card', 4, 2, 8, 0),
        ('${uuid.v4()}', 'spending-card', 4, 2, 0, 2);
    `);
    const reports = db2.runQuery(
      "SELECT id FROM custom_reports WHERE tombstone = 0 ORDER BY name COLLATE NOCASE ASC",
      [],
      true
    );
    reports.forEach((report, id) => {
      db2.runQuery(
        `INSERT INTO dashboard (id, type, width, height, x, y, meta) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uuid.v4(),
          "custom-report",
          4,
          2,
          id * 4 % 12,
          2 + Math.floor(id / 3) * 2,
          JSON.stringify({ id: report.id })
        ]
      );
    });
  });
}
const SYNCED_PREF_KEYS = [
  "firstDayOfWeekIdx",
  "dateFormat",
  "numberFormat",
  "hideFraction",
  "isPrivacyEnabled",
  /^show-extra-balances-/,
  /^hide-cleared-/,
  /^parse-date-/,
  /^csv-mappings-/,
  /^csv-delimiter-/,
  /^csv-has-header-/,
  /^ofx-fallback-missing-payee-/,
  /^flip-amount-/,
  "budgetType",
  /^flags\./
];
async function runMigration(db2, { fs: fs2, fileId }) {
  await db2.execQuery(`
    CREATE TABLE preferences
       (id TEXT PRIMARY KEY,
        value TEXT);
  `);
  try {
    const budgetDir = fs2.getBudgetDir(fileId);
    const fullpath = fs2.join(budgetDir, "metadata.json");
    const prefs2 = JSON.parse(await fs2.readFile(fullpath));
    if (typeof prefs2 !== "object") {
      return;
    }
    await Promise.all(
      Object.keys(prefs2).map(async (key) => {
        if (!SYNCED_PREF_KEYS.find(
          (keyMatcher) => keyMatcher instanceof RegExp ? keyMatcher.test(key) : keyMatcher === key
        )) {
          return;
        }
        await db2.runQuery("INSERT INTO preferences (id, value) VALUES (?, ?)", [
          key,
          String(prefs2[key])
        ]);
      })
    );
  } catch (e) {
  }
}
let MIGRATIONS_DIR = migrationsPath;
const javascriptMigrations = {
  1632571489012: runMigration$3,
  1722717601e3: runMigration$2,
  1722804019e3: runMigration$1,
  1723665565e3: runMigration
};
function getMigrationId(name) {
  return parseInt(name.match(/^(\d)+/)[0]);
}
async function patchBadMigrations(db2) {
  const badFiltersMigration = 1685375406832;
  const newFiltersMigration = 1688749527273;
  const appliedIds = await getAppliedMigrations(db2);
  if (appliedIds.includes(badFiltersMigration)) {
    await runQuery$1(db2, "DELETE FROM __migrations__ WHERE id = ?", [
      badFiltersMigration
    ]);
    await runQuery$1(db2, "INSERT INTO __migrations__ (id) VALUES (?)", [
      newFiltersMigration
    ]);
  }
}
async function getAppliedMigrations(db2) {
  const rows = await runQuery$1(
    db2,
    "SELECT * FROM __migrations__ ORDER BY id ASC",
    [],
    true
  );
  return rows.map((row) => row.id);
}
async function getMigrationList(migrationsDir) {
  const files = await listDir(migrationsDir);
  return files.filter((name) => name.match(/(\.sql|\.js)$/)).sort((m1, m2) => {
    const id1 = getMigrationId(m1);
    const id2 = getMigrationId(m2);
    if (id1 < id2) {
      return -1;
    } else if (id1 > id2) {
      return 1;
    }
    return 0;
  });
}
function getPending(appliedIds, all2) {
  return all2.filter((name) => {
    const id = getMigrationId(name);
    return appliedIds.indexOf(id) === -1;
  });
}
async function applyJavaScript(db2, id) {
  const dbInterface = {
    runQuery: (query, params, fetchAll2) => runQuery$1(db2, query, params, fetchAll2),
    execQuery: (query) => execQuery$2(db2, query),
    transaction: (func) => transaction$1(db2, func)
  };
  if (javascriptMigrations[id] == null) {
    throw new Error("Could not find JS migration code to run for " + id);
  }
  const run2 = javascriptMigrations[id];
  return run2(dbInterface, {
    fs,
    fileId: getPrefs()?.id
  });
}
async function applySql(db2, sql) {
  try {
    await execQuery$2(db2, sql);
  } catch (e) {
    console.log("Error applying sql:", sql);
    throw e;
  }
}
async function applyMigration(db2, name, migrationsDir) {
  const code = await readFile(join$1(migrationsDir, name));
  if (name.match(/\.js$/)) {
    await applyJavaScript(db2, getMigrationId(name));
  } else {
    await applySql(db2, code);
  }
  await runQuery$1(db2, "INSERT INTO __migrations__ (id) VALUES (?)", [
    getMigrationId(name)
  ]);
}
function checkDatabaseValidity(appliedIds, available) {
  for (let i = 0; i < appliedIds.length; i++) {
    if (i >= available.length || appliedIds[i] !== getMigrationId(available[i])) {
      console.error("Database is out of sync with migrations:", {
        appliedIds,
        available
      });
      throw new Error("out-of-sync-migrations");
    }
  }
}
async function migrate(db2) {
  await patchBadMigrations(db2);
  const appliedIds = await getAppliedMigrations(db2);
  const available = await getMigrationList(MIGRATIONS_DIR);
  checkDatabaseValidity(appliedIds, available);
  const pending = getPending(appliedIds, available);
  for (const migration of pending) {
    await applyMigration(db2, migration, MIGRATIONS_DIR);
  }
  return pending;
}
async function runMigrations() {
  await migrate(getDatabase());
}
async function updateViews() {
  const hashKey = "view-hash";
  const row = await first(
    "SELECT value FROM __meta__ WHERE key = ?",
    [hashKey]
  );
  const { value: hash } = row || {};
  const views = makeViews(schema, schemaConfig);
  const currentHash = md5(views);
  if (hash !== currentHash) {
    await execQuery(views);
    await runQuery(
      "INSERT OR REPLACE INTO __meta__ (key, value) VALUES (?, ?)",
      [hashKey, currentHash]
    );
  }
}
async function updateVersion() {
  await runMigrations();
  await updateViews();
}
async function uniqueBudgetName(initialName = "My Finances") {
  const budgets = await exports.handlers["get-budgets"]();
  let idx = 1;
  let newName = initialName;
  while (budgets.find((file) => file.name === newName)) {
    newName = `${initialName} ${idx}`;
    idx++;
  }
  return newName;
}
async function validateBudgetName(name) {
  const trimmedName = name.trim();
  const uniqueName = await uniqueBudgetName(trimmedName);
  let message = null;
  if (trimmedName === "") message = "Budget name cannot be blank";
  if (trimmedName.length > 100) {
    message = "Budget name is too long (max length 100)";
  }
  if (uniqueName !== trimmedName) {
    message = `“${name}” already exists, try “${uniqueName}” instead`;
  }
  return message ? { valid: false, message } : { valid: true };
}
async function idFromBudgetName(name) {
  let id = name.replace(/( |[^A-Za-z0-9])/g, "-") + "-" + uuid.v4().slice(0, 7);
  let index = 0;
  let budgetDir = getBudgetDir(id);
  while (await exists(budgetDir)) {
    index++;
    budgetDir = getBudgetDir(id + index.toString());
  }
  if (index > 0) {
    id = id + index.toString();
  }
  return id;
}
const LATEST_BACKUP_FILENAME = "db.latest.sqlite";
let serviceInterval = null;
async function getBackups$1(id) {
  const budgetDir = getBudgetDir(id);
  const backupDir = join$1(budgetDir, "backups");
  let paths = [];
  if (await exists(backupDir)) {
    paths = await listDir(backupDir);
    paths = paths.filter((file) => file.match(/\.sqlite$/));
  }
  const backups = await Promise.all(
    paths.map(async (path2) => {
      const mtime = await getModifiedTime(join$1(backupDir, path2));
      return {
        id: path2,
        date: new Date(mtime)
      };
    })
  );
  backups.sort((b1, b2) => {
    if (b1.date < b2.date) {
      return 1;
    } else if (b1.date > b2.date) {
      return -1;
    }
    return 0;
  });
  return backups;
}
async function getLatestBackup(id) {
  const budgetDir = getBudgetDir(id);
  if (await exists(join$1(budgetDir, LATEST_BACKUP_FILENAME))) {
    return {
      id: LATEST_BACKUP_FILENAME,
      date: null,
      isLatest: true
    };
  }
  return null;
}
async function getAvailableBackups(id) {
  const backups = await getBackups$1(id);
  const latestBackup = await getLatestBackup(id);
  if (latestBackup) {
    backups.unshift(latestBackup);
  }
  return backups.map((backup) => ({
    ...backup,
    date: backup.date ? d__namespace.format(backup.date, "yyyy-MM-dd H:mm") : null
  }));
}
async function updateBackups(backups) {
  const byDay = backups.reduce((groups, backup) => {
    const day = d__namespace.format(backup.date, "yyyy-MM-dd");
    groups[day] = groups[day] || [];
    groups[day].push(backup);
    return groups;
  }, {});
  const removed = [];
  for (const day of Object.keys(byDay)) {
    const dayBackups = byDay[day];
    const isToday = day === currentDay();
    for (const backup of dayBackups.slice(isToday ? 3 : 1)) {
      removed.push(backup.id);
    }
  }
  const currentBackups = backups.filter((backup) => !removed.includes(backup.id));
  return removed.concat(currentBackups.slice(10).map((backup) => backup.id));
}
async function makeBackup$1(id) {
  const budgetDir = getBudgetDir(id);
  if (await exists(join$1(budgetDir, LATEST_BACKUP_FILENAME))) {
    await removeFile$1(join$1(getBudgetDir(id), LATEST_BACKUP_FILENAME));
  }
  const backupId = `${uuid.v4()}.sqlite`;
  const backupPath = join$1(budgetDir, "backups", backupId);
  if (!await exists(join$1(budgetDir, "backups"))) {
    await mkdir(join$1(budgetDir, "backups"));
  }
  await copyFile(join$1(budgetDir, "db.sqlite"), backupPath);
  const db2 = openDatabase$1(backupPath);
  await runQuery$1(db2, "DELETE FROM messages_crdt");
  await runQuery$1(db2, "DELETE FROM messages_clock");
  closeDatabase$1(db2);
  const toRemove = await updateBackups(await getBackups$1(id));
  for (const id2 of toRemove) {
    await removeFile$1(join$1(budgetDir, "backups", id2));
  }
  send$1("backups-updated", await getAvailableBackups(id));
}
async function loadBackup$1(id, backupId) {
  const budgetDir = getBudgetDir(id);
  if (!await exists(join$1(budgetDir, LATEST_BACKUP_FILENAME))) {
    await copyFile(
      join$1(budgetDir, "db.sqlite"),
      join$1(budgetDir, LATEST_BACKUP_FILENAME)
    );
    await copyFile(
      join$1(budgetDir, "metadata.json"),
      join$1(budgetDir, "metadata.latest.json")
    );
    stopBackupService();
    startBackupService(id);
    await loadPrefs(id);
  }
  if (backupId === LATEST_BACKUP_FILENAME) {
    console.log("Reverting backup");
    await copyFile(
      join$1(budgetDir, LATEST_BACKUP_FILENAME),
      join$1(budgetDir, "db.sqlite")
    );
    await copyFile(
      join$1(budgetDir, "metadata.latest.json"),
      join$1(budgetDir, "metadata.json")
    );
    await removeFile$1(join$1(budgetDir, LATEST_BACKUP_FILENAME));
    await removeFile$1(join$1(budgetDir, "metadata.latest.json"));
    try {
      await upload();
    } catch (e) {
    }
    unloadPrefs();
  } else {
    console.log("Loading backup", backupId);
    await loadPrefs(id);
    await savePrefs({
      groupId: null,
      lastSyncedTimestamp: null,
      lastUploaded: null
    });
    try {
      await upload();
    } catch (e) {
    }
    unloadPrefs();
    await copyFile(
      join$1(budgetDir, "backups", backupId),
      join$1(budgetDir, "db.sqlite")
    );
  }
}
function startBackupService(id) {
  if (serviceInterval) {
    clearInterval(serviceInterval);
  }
  serviceInterval = setInterval(
    async () => {
      console.log("Making backup");
      await makeBackup$1(id);
    },
    1e3 * 60 * 15
  );
}
function stopBackupService() {
  clearInterval(serviceInterval);
  serviceInterval = null;
}
const DEMO_BUDGET_ID = "_demo-budget";
const TEST_BUDGET_ID = "_test-budget";
const app$d = createApp();
app$d.method("validate-budget-name", handleValidateBudgetName);
app$d.method("unique-budget-name", handleUniqueBudgetName);
app$d.method("get-budgets", getBudgets);
app$d.method("get-remote-files", getRemoteFiles);
app$d.method("get-user-file-info", getUserFileInfo);
app$d.method("reset-budget-cache", mutator(resetBudgetCache));
app$d.method("upload-budget", uploadBudget);
app$d.method("download-budget", downloadBudget);
app$d.method("sync-budget", syncBudget);
app$d.method("load-budget", loadBudget);
app$d.method("create-demo-budget", createDemoBudget);
app$d.method("close-budget", closeBudget);
app$d.method("delete-budget", deleteBudget);
app$d.method("duplicate-budget", duplicateBudget);
app$d.method("create-budget", createBudget);
app$d.method("import-budget", importBudget);
app$d.method("export-budget", exportBudget);
app$d.method("upload-file-web", uploadFileWeb);
app$d.method("backups-get", getBackups);
app$d.method("backup-load", loadBackup);
app$d.method("backup-make", makeBackup);
app$d.method("get-last-opened-backup", getLastOpenedBackup);
async function handleValidateBudgetName({ name }) {
  return validateBudgetName(name);
}
async function handleUniqueBudgetName({ name }) {
  return uniqueBudgetName(name);
}
async function getBudgets() {
  const paths = await listDir(getDocumentDir());
  const budgets = await Promise.all(
    paths.map(async (name) => {
      const prefsPath = join$1(getDocumentDir(), name, "metadata.json");
      if (await exists(prefsPath)) {
        let prefs2;
        try {
          prefs2 = JSON.parse(await readFile(prefsPath));
        } catch (e) {
          console.log("Error parsing metadata:", e.stack);
          return null;
        }
        if (name !== DEMO_BUDGET_ID) {
          return {
            id: name,
            ...prefs2.cloudFileId ? { cloudFileId: prefs2.cloudFileId } : {},
            ...prefs2.encryptKeyId ? { encryptKeyId: prefs2.encryptKeyId } : {},
            ...prefs2.groupId ? { groupId: prefs2.groupId } : {},
            ...prefs2.owner ? { owner: prefs2.owner } : {},
            name: prefs2.budgetName || "(no name)"
          };
        }
      }
      return null;
    })
  );
  return budgets.filter(Boolean);
}
async function getRemoteFiles() {
  return listRemoteFiles();
}
async function getUserFileInfo(fileId) {
  return getRemoteFile(fileId);
}
async function resetBudgetCache() {
  await loadUserBudgets(db$1);
  get$1().recomputeAll();
  await waitOnSpreadsheet();
}
async function uploadBudget({ id } = {}) {
  if (id) {
    if (getPrefs()) {
      throw new Error("upload-budget: id given but prefs already loaded");
    }
    await loadPrefs(id);
  }
  try {
    await upload();
  } catch (e) {
    console.log(e);
    if (e.type === "FileUploadError") {
      return { error: e };
    }
    captureException(e);
    return { error: { reason: "internal" } };
  } finally {
    if (id) {
      unloadPrefs();
    }
  }
  return {};
}
async function downloadBudget({
  cloudFileId
}) {
  let result;
  try {
    result = await download(cloudFileId);
  } catch (e) {
    if (e.type === "FileDownloadError") {
      if (e.reason === "file-exists" && e.meta.id) {
        await loadPrefs(e.meta.id);
        const name = getPrefs().budgetName;
        unloadPrefs();
        e.meta = { ...e.meta, name };
      }
      return { error: e };
    } else {
      captureException(e);
      return { error: { reason: "internal" } };
    }
  }
  const id = result.id;
  await loadBudget({ id });
  result = await syncBudget();
  if (result.error) {
    return result;
  }
  return { id };
}
async function syncBudget() {
  setSyncingMode("enabled");
  const result = await initialFullSync();
  return result;
}
async function loadBudget({ id }) {
  const currentPrefs = getPrefs();
  if (currentPrefs) {
    if (currentPrefs.id === id) {
      return {};
    } else {
      await closeBudget();
    }
  }
  const res = await _loadBudget(id);
  return res;
}
async function createDemoBudget() {
  await setItem("readOnly", "");
  return createBudget({
    budgetName: "Demo Budget",
    testMode: true,
    testBudgetId: DEMO_BUDGET_ID
  });
}
async function closeBudget() {
  await waitOnSpreadsheet();
  unloadSpreadsheet();
  clearFullSyncTimeout();
  await app$d.stopServices();
  await closeDatabase();
  try {
    await setItem("lastBudget", "");
  } catch (e) {
  }
  unloadPrefs();
  await stopBackupService();
  return "ok";
}
async function deleteBudget({
  id,
  cloudFileId
}) {
  if (cloudFileId) {
    await removeFile(cloudFileId).catch(() => {
    });
  }
  if (id) {
    try {
      await openDatabase(id);
      await closeDatabase();
      const budgetDir = getBudgetDir(id);
      await removeDirRecursively(budgetDir);
    } catch (e) {
      return "fail";
    }
  }
  return "ok";
}
async function duplicateBudget({
  id,
  newName,
  cloudSync,
  open
}) {
  const { valid, message } = await validateBudgetName(newName);
  if (!valid) throw new Error(message);
  const budgetDir = getBudgetDir(id);
  const newId = await idFromBudgetName(newName);
  const metadataText = await readFile(join$1(budgetDir, "metadata.json"));
  const metadata = JSON.parse(metadataText);
  metadata.id = newId;
  metadata.budgetName = newName;
  [
    "cloudFileId",
    "groupId",
    "lastUploaded",
    "encryptKeyId",
    "lastSyncedTimestamp"
  ].forEach((item) => {
    if (metadata[item]) delete metadata[item];
  });
  try {
    const newBudgetDir = getBudgetDir(newId);
    await mkdir(newBudgetDir);
    await writeFile(
      join$1(newBudgetDir, "metadata.json"),
      JSON.stringify(metadata)
    );
    await copyFile(
      join$1(budgetDir, "db.sqlite"),
      join$1(newBudgetDir, "db.sqlite")
    );
  } catch (error2) {
    try {
      const newBudgetDir = getBudgetDir(newId);
      if (await exists(newBudgetDir)) {
        await removeDirRecursively(newBudgetDir);
      }
    } catch {
    }
    throw new Error(`Failed to duplicate budget file: ${error2.message}`);
  }
  const { error } = await _loadBudget(newId);
  if (error) {
    console.log("Error duplicating budget: " + error);
    return error;
  }
  if (cloudSync) {
    try {
      await upload();
    } catch (error2) {
      console.warn("Failed to sync duplicated budget to cloud:", error2);
    }
  }
  await closeBudget();
  if (open === "original") await _loadBudget(id);
  if (open === "copy") await _loadBudget(newId);
  return newId;
}
async function createBudget({
  budgetName,
  avoidUpload,
  testMode,
  testBudgetId
} = {}) {
  let id;
  if (testMode) {
    budgetName = budgetName || "Test Budget";
    id = testBudgetId || TEST_BUDGET_ID;
    if (await exists(getBudgetDir(id))) {
      await removeDirRecursively(getBudgetDir(id));
    }
  } else {
    if (!budgetName) {
      budgetName = await uniqueBudgetName();
    }
    id = await idFromBudgetName(budgetName);
  }
  const budgetDir = getBudgetDir(id);
  await mkdir(budgetDir);
  await copyFile(bundledDatabasePath, join$1(budgetDir, "db.sqlite"));
  await writeFile(
    join$1(budgetDir, "metadata.json"),
    JSON.stringify(getDefaultPrefs(id, budgetName))
  );
  const { error } = await _loadBudget(id);
  if (error) {
    console.log("Error creating budget: " + error);
    return { error };
  }
  if (!avoidUpload && !testMode) {
    try {
      await upload();
    } catch (e) {
    }
  }
  if (testMode) {
    await createTestBudget(app$j.handlers);
  }
  return {};
}
async function importBudget({
  filepath,
  type
}) {
  try {
    if (!await exists(filepath)) {
      throw new Error(`File not found at the provided path: ${filepath}`);
    }
    const buffer = Buffer.from(await readFile(filepath, "binary"));
    const results = await handleBudgetImport(type, filepath, buffer);
    return results || {};
  } catch (err) {
    err.message = "Error importing budget: " + err.message;
    captureException(err);
    return { error: "internal-error" };
  }
}
async function exportBudget() {
  try {
    return {
      data: await exportBuffer()
    };
  } catch (err) {
    err.message = "Error exporting budget: " + err.message;
    captureException(err);
    return { error: "internal-error" };
  }
}
function onSheetChange({ names }) {
  names.map((name) => {
    const node = get$1()._getNode(name);
    return { name: node.name, value: node.value };
  });
}
async function _loadBudget(id) {
  let dir;
  try {
    dir = getBudgetDir(id);
  } catch (e) {
    captureException(
      new Error("`getBudgetDir` failed in `loadBudget`: " + e.message)
    );
    return { error: "budget-not-found" };
  }
  if (!await exists(dir)) {
    captureException(new Error("budget directory does not exist"));
    return { error: "budget-not-found" };
  }
  try {
    await loadPrefs(id);
    await openDatabase(id);
  } catch (e) {
    captureException(e);
    await closeBudget();
    return { error: "opening-budget" };
  }
  if (!getPrefs().userId) {
    const userId = await getItem("user-token");
    await savePrefs({ userId });
  }
  try {
    await updateVersion();
  } catch (e) {
    console.warn("Error updating", e);
    let result;
    if (e.message.includes("out-of-sync-migrations")) {
      result = { error: "out-of-sync-migrations" };
    } else if (e.message.includes("out-of-sync-data")) {
      result = { error: "out-of-sync-data" };
    } else {
      captureException(e);
      logger.info("Error updating budget " + id, e);
      console.log("Error updating budget", e);
      result = { error: "loading-budget" };
    }
    await closeBudget();
    return result;
  }
  await loadClock();
  if (getPrefs().resetClock) {
    getClock().timestamp.setNode(makeClientId());
    await runQuery(
      "INSERT OR REPLACE INTO messages_clock (id, clock) VALUES (1, ?)",
      [serializeClock(getClock())]
    );
    await savePrefs({ resetClock: false });
  }
  if (process.env.NODE_ENV !== "test") {
    await startBackupService(id);
  }
  try {
    await loadSpreadsheet(db$1, onSheetChange);
  } catch (e) {
    captureException(e);
    await closeBudget();
    return { error: "opening-budget" };
  }
  const { value: budgetType = "envelope" } = await first(
    "SELECT value from preferences WHERE id = ?",
    ["budgetType"]
  ) ?? {};
  get$1().meta().budgetType = budgetType;
  await createAllBudgets();
  await loadMappings();
  await loadRules();
  await listen();
  await app$j.startServices();
  clearUndo();
  if (process.env.NODE_ENV !== "test") {
    if (id === DEMO_BUDGET_ID) {
      setSyncingMode("disabled");
    } else {
      if (getServer()) {
        setSyncingMode("enabled");
      } else {
        setSyncingMode("disabled");
      }
      await setItem("lastBudget", id);
      await possiblyUpload();
    }
  }
  app$d.events.emit("load-budget", { id });
  return {};
}
async function uploadFileWeb({
  filename,
  contents
}) {
  {
    return null;
  }
}
async function getBackups({ id }) {
  return getAvailableBackups(id);
}
async function loadBackup({ id, backupId }) {
  await loadBackup$1(id, backupId);
}
async function makeBackup({ id }) {
  await makeBackup$1(id);
}
async function getLastOpenedBackup() {
  const id = await getItem("lastBudget");
  if (id && id !== "") {
    const budgetDir = getBudgetDir(id);
    if (await exists(budgetDir)) {
      return id;
    }
  }
  return null;
}
const DEFAULT_DASHBOARD_STATE = [
  {
    type: "net-worth-card",
    width: 8,
    height: 2,
    x: 0,
    y: 0,
    meta: null
  },
  {
    type: "cash-flow-card",
    width: 4,
    height: 2,
    x: 8,
    y: 0,
    meta: null
  },
  {
    type: "spending-card",
    width: 4,
    height: 2,
    x: 0,
    y: 2,
    meta: null
  }
];
const reportModel = {
  validate(report, { update: update2 } = {}) {
    requiredFields("Report", report, ["conditionsOp"], update2);
    if (!update2 || "conditionsOp" in report) {
      if (!["and", "or"].includes(report.conditionsOp)) {
        throw new ValidationError(
          "Invalid filter conditionsOp: " + report.conditionsOp
        );
      }
    }
    return report;
  },
  toJS(row) {
    return {
      id: row.id,
      name: row.name,
      startDate: row.start_date,
      endDate: row.end_date,
      isDateStatic: row.date_static === 1,
      dateRange: row.date_range,
      mode: row.mode,
      groupBy: row.group_by,
      sortBy: row.sort_by,
      interval: row.interval,
      balanceType: row.balance_type,
      showEmpty: row.show_empty === 1,
      showOffBudget: row.show_offbudget === 1,
      showHiddenCategories: row.show_hidden === 1,
      showUncategorized: row.show_uncategorized === 1,
      includeCurrentInterval: row.include_current === 1,
      graphType: row.graph_type,
      conditions: row.conditions,
      conditionsOp: row.conditions_op
    };
  },
  fromJS(report) {
    return {
      id: report.id,
      name: report.name,
      start_date: report.startDate,
      end_date: report.endDate,
      date_static: report.isDateStatic ? 1 : 0,
      date_range: report.dateRange,
      mode: report.mode,
      group_by: report.groupBy,
      sort_by: report.sortBy,
      interval: report.interval,
      balance_type: report.balanceType,
      show_empty: report.showEmpty ? 1 : 0,
      show_offbudget: report.showOffBudget ? 1 : 0,
      show_hidden: report.showHiddenCategories ? 1 : 0,
      show_uncategorized: report.showUncategorized ? 1 : 0,
      include_current: report.includeCurrentInterval ? 1 : 0,
      graph_type: report.graphType,
      conditions: report.conditions,
      conditions_op: report.conditionsOp
    };
  }
};
async function reportNameExists(name, reportId, newItem) {
  const idForName = await first(
    "SELECT id from custom_reports WHERE tombstone = 0 AND name = ?",
    [name]
  );
  if (idForName === null) {
    return false;
  }
  if (!newItem) {
    return idForName.id !== reportId;
  }
  return true;
}
async function createReport(report) {
  const reportId = uuid.v4();
  const item = {
    ...report,
    id: reportId
  };
  if (!item.name) {
    throw new Error("Report name is required");
  }
  const nameExists = await reportNameExists(item.name, item.id ?? "", true);
  if (nameExists) {
    throw new Error("There is already a report named " + item.name);
  }
  await insertWithSchema("custom_reports", reportModel.fromJS(item));
  return reportId;
}
async function updateReport(item) {
  if (!item.name) {
    throw new Error("Report name is required");
  }
  if (!item.id) {
    throw new Error("Report recall error");
  }
  const nameExists = await reportNameExists(item.name, item.id, false);
  if (nameExists) {
    throw new Error("There is already a report named " + item.name);
  }
  await updateWithSchema("custom_reports", reportModel.fromJS(item));
}
async function deleteReport(id) {
  await delete_("custom_reports", id);
}
const app$c = createApp();
app$c.method("report/create", mutator(undoable(createReport)));
app$c.method("report/update", mutator(undoable(updateReport)));
app$c.method("report/delete", mutator(undoable(deleteReport)));
function isExportedCustomReportWidget(widget) {
  return widget.type === "custom-report";
}
const exportModel = {
  validate(dashboard) {
    requiredFields("Dashboard", dashboard, ["version", "widgets"]);
    if (!Array.isArray(dashboard.widgets)) {
      throw new ValidationError(
        "Invalid dashboard.widgets data type: it must be an array of widgets."
      );
    }
    dashboard.widgets.forEach((widget, idx) => {
      requiredFields(`Dashboard widget #${idx}`, widget, [
        "type",
        "x",
        "y",
        "width",
        "height",
        ...isExportedCustomReportWidget(widget) ? ["meta"] : []
      ]);
      if (!Number.isInteger(widget.x)) {
        throw new ValidationError(
          `Invalid widget.${idx}.x data-type for value ${widget.x}.`
        );
      }
      if (!Number.isInteger(widget.y)) {
        throw new ValidationError(
          `Invalid widget.${idx}.y data-type for value ${widget.y}.`
        );
      }
      if (!Number.isInteger(widget.width)) {
        throw new ValidationError(
          `Invalid widget.${idx}.width data-type for value ${widget.width}.`
        );
      }
      if (!Number.isInteger(widget.height)) {
        throw new ValidationError(
          `Invalid widget.${idx}.height data-type for value ${widget.height}.`
        );
      }
      if (![
        "net-worth-card",
        "cash-flow-card",
        "spending-card",
        "custom-report",
        "markdown-card",
        "summary-card",
        "calendar-card"
      ].includes(widget.type)) {
        throw new ValidationError(
          `Invalid widget.${idx}.type value ${widget.type}.`
        );
      }
      if (isExportedCustomReportWidget(widget)) {
        reportModel.validate(widget.meta);
      }
    });
  }
};
async function updateDashboard(widgets) {
  const { data: dbWidgets } = await aqlQuery(
    q("dashboard").filter({ id: { $oneof: widgets.map(({ id }) => id) } }).select("*")
  );
  const dbWidgetMap = new Map(
    dbWidgets.map((widget) => [widget.id, widget])
  );
  await Promise.all(
    widgets.filter((widget) => !isMatch(dbWidgetMap.get(widget.id) ?? {}, widget)).map((widget) => update("dashboard", widget))
  );
}
async function updateDashboardWidget(widget) {
  await updateWithSchema("dashboard", widget);
}
async function resetDashboard() {
  await batchMessages(async () => {
    await Promise.all([
      // Delete all widgets
      deleteAll("dashboard"),
      // Insert the default state
      ...DEFAULT_DASHBOARD_STATE.map(
        (widget) => insertWithSchema("dashboard", widget)
      )
    ]);
  });
}
async function addDashboardWidget(widget) {
  if (!("x" in widget) && !("y" in widget)) {
    const data = await first(
      "SELECT x, y, width, height FROM dashboard WHERE tombstone = 0 ORDER BY y DESC, x DESC"
    );
    if (!data) {
      widget.x = 0;
      widget.y = 0;
    } else {
      const xBoundaryCheck = data.x + data.width + widget.width;
      widget.x = xBoundaryCheck > 12 ? 0 : data.x + data.width;
      widget.y = data.y + (xBoundaryCheck > 12 ? data.height : 0);
    }
  }
  await insertWithSchema("dashboard", widget);
}
async function removeDashboardWidget(widgetId) {
  await delete_("dashboard", widgetId);
}
async function importDashboard({ filepath }) {
  try {
    if (!await exists(filepath)) {
      throw new Error(`File not found at the provided path: ${filepath}`);
    }
    const content = await readFile(filepath);
    const parsedContent = JSON.parse(content);
    exportModel.validate(parsedContent);
    const customReportIds = await all(
      "SELECT id from custom_reports"
    );
    const customReportIdSet = new Set(customReportIds.map(({ id }) => id));
    await batchMessages(async () => {
      await Promise.all([
        // Delete all widgets
        deleteAll("dashboard"),
        // Insert new widgets
        ...parsedContent.widgets.map(
          (widget) => insertWithSchema("dashboard", {
            type: widget.type,
            width: widget.width,
            height: widget.height,
            x: widget.x,
            y: widget.y,
            meta: isExportedCustomReportWidget(widget) ? { id: widget.meta.id } : widget.meta
          })
        ),
        // Insert new custom reports
        ...parsedContent.widgets.filter(isExportedCustomReportWidget).filter(({ meta }) => !customReportIdSet.has(meta.id)).map(
          ({ meta }) => insertWithSchema("custom_reports", reportModel.fromJS(meta))
        ),
        // Update existing reports
        ...parsedContent.widgets.filter(isExportedCustomReportWidget).filter(({ meta }) => customReportIdSet.has(meta.id)).map(
          ({ meta }) => updateWithSchema("custom_reports", {
            // Replace `undefined` values with `null`
            // (null clears the value in DB; undefined breaks the operation)
            ...Object.fromEntries(
              Object.entries(reportModel.fromJS(meta)).map(([key, value]) => [
                key,
                value ?? null
              ])
            ),
            tombstone: false
          })
        )
      ]);
    });
    return { status: "ok" };
  } catch (err) {
    if (err instanceof Error) {
      err.message = "Error importing file: " + err.message;
      captureException(err);
    }
    if (err instanceof SyntaxError) {
      return { error: "json-parse-error" };
    }
    if (err instanceof ValidationError) {
      return { error: "validation-error", message: err.message };
    }
    return { error: "internal-error" };
  }
}
const app$b = createApp();
app$b.method("dashboard-update", mutator(undoable(updateDashboard)));
app$b.method("dashboard-update-widget", mutator(undoable(updateDashboardWidget)));
app$b.method("dashboard-reset", mutator(undoable(resetDashboard)));
app$b.method("dashboard-add-widget", mutator(undoable(addDashboardWidget)));
app$b.method("dashboard-remove-widget", mutator(undoable(removeDashboardWidget)));
app$b.method("dashboard-import", mutator(undoable(importDashboard)));
const app$a = createApp();
app$a.method("key-make", keyMake);
app$a.method("key-test", keyTest);
async function keyMake({ password }) {
  if (!getPrefs()) {
    throw new Error("key-make must be called with file loaded");
  }
  const salt = randomBytes(32).toString("base64");
  const id = uuid.v4();
  const key = await createKey({ id, password, salt });
  await loadKey(key);
  const testContent = await makeTestMessage(key.getId());
  return await resetSync$1({
    key,
    salt,
    testContent: JSON.stringify({
      ...testContent,
      value: testContent.value.toString("base64")
    })
  });
}
async function keyTest({
  cloudFileId,
  password
}) {
  const userToken = await getItem("user-token");
  if (cloudFileId == null) {
    cloudFileId = getPrefs().cloudFileId;
  }
  let validCloudFileId;
  let res;
  try {
    const serverConfig = getServer();
    if (!serverConfig) {
      throw new Error("No sync server configured.");
    }
    res = await post(serverConfig.SYNC_SERVER + "/user-get-key", {
      token: userToken,
      fileId: cloudFileId
    });
    validCloudFileId = cloudFileId;
  } catch (e) {
    console.log(e);
    return { error: { reason: "network" } };
  }
  const { id, salt, test: originalTest } = res;
  if (!originalTest) {
    return { error: { reason: "old-key-style" } };
  }
  const test = JSON.parse(originalTest);
  const key = await createKey({ id, password, salt });
  loadKey(key);
  try {
    await decrypt(Buffer.from(test.value, "base64"), test.meta);
  } catch (e) {
    console.log(e);
    unloadKey(key);
    return { error: { reason: "decrypt-failure" } };
  }
  const keys2 = JSON.parse(await getItem(`encrypt-keys`) || "{}");
  keys2[validCloudFileId] = key.serialize();
  await setItem("encrypt-keys", JSON.stringify(keys2));
  if (getPrefs()) {
    await savePrefs({ encryptKeyId: key.getId() });
  }
  return {};
}
const filterModel = {
  validate(filter, { update: update2 } = {}) {
    requiredFields("transaction_filters", filter, ["conditions"], update2);
    if (!update2 || "conditionsOp" in filter) {
      if (!["and", "or"].includes(filter.conditionsOp)) {
        throw new Error("Invalid filter conditionsOp: " + filter.conditionsOp);
      }
    }
    return filter;
  },
  toJS(row) {
    const { conditions, conditions_op, ...fields } = row;
    return {
      ...fields,
      conditionsOp: conditions_op,
      conditions: parseConditionsOrActions(conditions)
    };
  },
  fromJS(filter) {
    const { conditionsOp, ...row } = filter;
    if (conditionsOp) {
      row.conditions_op = conditionsOp;
    }
    return row;
  }
};
async function filterNameExists(name, filterId, newItem) {
  const idForName = await first(
    "SELECT id from transaction_filters WHERE tombstone = 0 AND name = ?",
    [name]
  );
  if (idForName === null) {
    return false;
  }
  if (!newItem) {
    return idForName.id !== filterId;
  }
  return true;
}
function conditionExists(item, filters, newItem) {
  const { conditions, conditionsOp } = item;
  let fConditionFound = null;
  filters.some((filter) => {
    if ((conditions.length === 1 || filter.conditionsOp === conditionsOp) && !filter.tombstone && filter.conditions.length === conditions.length) {
      const allConditionsMatch = !conditions.some(
        (cond) => !filter.conditions.some(
          (fcond) => cond.value === fcond.value && cond.op === fcond.op && cond.field === fcond.field && filterOptionsMatch(cond.options, fcond.options)
        )
      );
      if (allConditionsMatch) {
        fConditionFound = filter;
        return true;
      }
    }
    return false;
  });
  if (!newItem) {
    return fConditionFound ? fConditionFound.id !== item.id ? fConditionFound.name : false : false;
  }
  return fConditionFound ? fConditionFound.name : false;
}
function filterOptionsMatch(options1, options2) {
  const opt1 = options1 ?? {};
  const opt2 = options2 ?? {};
  const keys1 = Object.keys(opt1);
  const keys2 = Object.keys(opt2);
  if (keys1.length !== keys2.length) {
    return false;
  }
  return keys1.every((key) => opt1[key] === opt2[key]);
}
async function createFilter(filter) {
  const filterId = uuid.v4();
  const item = {
    id: filterId,
    conditions: filter.state.conditions,
    conditionsOp: filter.state.conditionsOp,
    name: filter.state.name
  };
  if (item.name) {
    if (await filterNameExists(item.name, item.id, true)) {
      throw new Error("There is already a filter named " + item.name);
    }
  } else {
    throw new Error("Filter name is required");
  }
  if (item.conditions.length > 0) {
    const condExists = conditionExists(item, filter.filters, true);
    if (condExists) {
      throw new Error(
        "Duplicate filter warning: conditions already exist. Filter name: " + condExists
      );
    }
  } else {
    throw new Error("Conditions are required");
  }
  await insertWithSchema("transaction_filters", filterModel.fromJS(item));
  return filterId;
}
async function updateFilter(filter) {
  const item = {
    id: filter.state.id,
    conditions: filter.state.conditions,
    conditionsOp: filter.state.conditionsOp,
    name: filter.state.name
  };
  if (item.name) {
    if (await filterNameExists(item.name, item.id, false)) {
      throw new Error("There is already a filter named " + item.name);
    }
  } else {
    throw new Error("Filter name is required");
  }
  if (item.conditions.length > 0) {
    const condExists = conditionExists(item, filter.filters, false);
    if (condExists) {
      throw new Error(
        "Duplicate filter warning: conditions already exist. Filter name: " + condExists
      );
    }
  } else {
    throw new Error("Conditions are required");
  }
  await updateWithSchema("transaction_filters", filterModel.fromJS(item));
}
async function deleteFilter(id) {
  await delete_("transaction_filters", id);
}
const app$9 = createApp();
app$9.method("filter-create", mutator(createFilter));
app$9.method("filter-update", mutator(updateFilter));
app$9.method("filter-delete", mutator(undoable(deleteFilter)));
const app$8 = createApp();
app$8.method("notes-save", updateNotes);
async function updateNotes({ id, note }) {
  await update("notes", { id, note });
}
const app$7 = createApp();
app$7.method("payee-create", mutator(undoable(createPayee)));
app$7.method("common-payees-get", getCommonPayees);
app$7.method("payees-get", getPayees);
app$7.method("payees-get-orphaned", getOrphanedPayees);
app$7.method("payees-get-rule-counts", getPayeeRuleCounts);
app$7.method(
  "payees-merge",
  mutator(
    undoable(mergePayees, (args) => ({
      mergeIds: args.mergeIds,
      targetId: args.targetId
    }))
  )
);
app$7.method("payees-batch-change", mutator(undoable(batchChangePayees)));
app$7.method("payees-check-orphaned", checkOrphanedPayees);
app$7.method("payees-get-rules", getPayeeRules);
async function createPayee({ name }) {
  return insertPayee({ name });
}
async function getCommonPayees() {
  return (await getCommonPayees$1()).map(payeeModel$1.fromDb);
}
async function getPayees() {
  return (await getPayees$2()).map(payeeModel$1.fromDb);
}
async function getOrphanedPayees() {
  return await syncGetOrphanedPayees();
}
async function getPayeeRuleCounts() {
  const payeeCounts = {};
  iterateIds(getRules$1(), "payee", (rule, id) => {
    if (payeeCounts[id] == null) {
      payeeCounts[id] = 0;
    }
    payeeCounts[id]++;
  });
  return payeeCounts;
}
async function mergePayees({
  targetId,
  mergeIds
}) {
  await mergePayees$1(targetId, mergeIds);
}
async function batchChangePayees({
  added,
  deleted,
  updated
}) {
  await batchMessages(async () => {
    if (deleted) {
      await Promise.all(
        deleted.map((p) => ({ id: p.id })).map((p) => deletePayee(p))
      );
    }
    if (added) {
      await Promise.all(
        added.map((p) => payeeModel$1.toDb(p)).map((p) => insertPayee(p))
      );
    }
    if (updated) {
      await Promise.all(
        updated.map((p) => payeeModel$1.toDb(p, { update: true })).map((p) => updatePayee(p))
      );
    }
  });
}
async function checkOrphanedPayees({
  ids
}) {
  const orphaned = new Set(await getOrphanedPayees$1());
  return ids.filter((id) => orphaned.has(id));
}
async function getPayeeRules({
  id
}) {
  return getRulesForPayee(id).map((rule) => rule.serialize());
}
const app$6 = createApp();
app$6.method("preferences/save", mutator(undoable(saveSyncedPrefs)));
app$6.method("preferences/get", getSyncedPrefs);
app$6.method("save-global-prefs", saveGlobalPrefs);
app$6.method("load-global-prefs", loadGlobalPrefs);
app$6.method("save-prefs", saveMetadataPrefs);
app$6.method("load-prefs", loadMetadataPrefs);
async function saveSyncedPrefs({
  id,
  value
}) {
  if (!id) {
    return;
  }
  await update("preferences", { id, value });
}
async function getSyncedPrefs() {
  const prefs2 = await all(
    "SELECT id, value FROM preferences"
  );
  return prefs2.reduce((carry, { value, id }) => {
    carry[id] = value;
    return carry;
  }, {});
}
async function saveGlobalPrefs(prefs2) {
  if (!prefs2) {
    return "ok";
  }
  if (prefs2.maxMonths !== void 0) {
    await setItem("max-months", "" + prefs2.maxMonths);
  }
  if (prefs2.categoryExpandedState !== void 0) {
    await setItem(
      "category-expanded-state",
      "" + prefs2.categoryExpandedState
    );
  }
  if (prefs2.documentDir !== void 0 && await exists(prefs2.documentDir)) {
    await setItem("document-dir", prefs2.documentDir);
  }
  if (prefs2.floatingSidebar !== void 0) {
    await setItem("floating-sidebar", "" + prefs2.floatingSidebar);
  }
  if (prefs2.language !== void 0) {
    await setItem("language", prefs2.language);
  }
  if (prefs2.theme !== void 0) {
    await setItem("theme", prefs2.theme);
  }
  if (prefs2.preferredDarkTheme !== void 0) {
    await setItem(
      "preferred-dark-theme",
      prefs2.preferredDarkTheme
    );
  }
  if (prefs2.serverSelfSignedCert !== void 0) {
    await setItem(
      "server-self-signed-cert",
      prefs2.serverSelfSignedCert
    );
  }
  if (prefs2.syncServerConfig !== void 0) {
    await setItem("syncServerConfig", prefs2.syncServerConfig);
  }
  return "ok";
}
async function loadGlobalPrefs() {
  const {
    "floating-sidebar": floatingSidebar,
    "category-expanded-state": categoryExpandedState,
    "max-months": maxMonths,
    "document-dir": documentDir2,
    "encrypt-key": encryptKey,
    language,
    theme,
    "preferred-dark-theme": preferredDarkTheme,
    "server-self-signed-cert": serverSelfSignedCert,
    syncServerConfig
  } = await multiGet([
    "floating-sidebar",
    "category-expanded-state",
    "max-months",
    "document-dir",
    "encrypt-key",
    "language",
    "theme",
    "preferred-dark-theme",
    "server-self-signed-cert",
    "syncServerConfig"
  ]);
  return {
    floatingSidebar: floatingSidebar === "true",
    categoryExpandedState: stringToInteger(categoryExpandedState || "") || 0,
    maxMonths: stringToInteger(maxMonths || "") || 1,
    documentDir: documentDir2 || getDefaultDocumentDir(),
    keyId: encryptKey && JSON.parse(encryptKey).id,
    language,
    theme: theme === "light" || theme === "dark" || theme === "auto" || theme === "development" || theme === "midnight" ? theme : "auto",
    preferredDarkTheme: preferredDarkTheme === "dark" || preferredDarkTheme === "midnight" ? preferredDarkTheme : "dark",
    serverSelfSignedCert: serverSelfSignedCert || void 0,
    syncServerConfig: syncServerConfig || void 0
  };
}
async function saveMetadataPrefs(prefsToSet) {
  if (!prefsToSet) {
    return "ok";
  }
  const { cloudFileId } = getPrefs();
  if (prefsToSet.budgetName && cloudFileId) {
    const userToken = await getItem("user-token");
    const syncServer = getServer()?.SYNC_SERVER;
    if (!syncServer) {
      throw new Error("No sync server set");
    }
    await post(syncServer + "/update-user-filename", {
      token: userToken,
      fileId: cloudFileId,
      name: prefsToSet.budgetName
    });
  }
  await savePrefs(prefsToSet);
  return "ok";
}
async function loadMetadataPrefs() {
  return getPrefs();
}
function validateRule(rule) {
  function runValidation(array, validate) {
    const result = array.map((item) => {
      try {
        validate(item);
      } catch (e) {
        if (e instanceof RuleError) {
          console.warn("Invalid rule", e);
          return e.type;
        }
        throw e;
      }
      return null;
    });
    return result.filter((res) => typeof res === "string").length ? result : null;
  }
  const conditionErrors = runValidation(
    rule.conditions,
    (cond) => new Condition(cond.op, cond.field, cond.value, cond.options)
  );
  const actionErrors = runValidation(
    rule.actions,
    (action) => action.op === "set-split-amount" ? new Action(action.op, null, action.value, action.options) : action.op === "link-schedule" ? new Action(action.op, null, action.value, null) : action.op === "prepend-notes" || action.op === "append-notes" ? new Action(action.op, null, action.value, null) : new Action(action.op, action.field, action.value, action.options)
  );
  if (conditionErrors || actionErrors) {
    return {
      conditionErrors,
      actionErrors
    };
  }
  return null;
}
const app$5 = createApp();
app$5.method("rule-validate", ruleValidate);
app$5.method("rule-add", mutator(addRule));
app$5.method("rule-update", mutator(updateRule));
app$5.method("rule-delete", mutator(deleteRule));
app$5.method("rule-delete-all", mutator(deleteAllRules));
app$5.method("rule-apply-actions", mutator(undoable(applyRuleActions)));
app$5.method("rule-add-payee-rename", mutator(addRulePayeeRename));
app$5.method("rules-get", getRules);
app$5.method("rule-get", getRule);
app$5.method("rules-run", runRules);
async function ruleValidate(rule) {
  const error = validateRule(rule);
  return { error };
}
async function addRule(rule) {
  const error = validateRule(rule);
  if (error) {
    return { error };
  }
  const id = await insertRule(rule);
  return { id, ...rule };
}
async function updateRule(rule) {
  const error = validateRule(rule);
  if (error) {
    return { error };
  }
  await updateRule$1(rule);
  return rule;
}
async function deleteRule(id) {
  return deleteRule$1(id);
}
async function deleteAllRules(ids) {
  let someDeletionsFailed = false;
  await batchMessages(async () => {
    for (const id of ids) {
      const res = await deleteRule$1(id);
      if (res === false) {
        someDeletionsFailed = true;
      }
    }
  });
  return { someDeletionsFailed };
}
async function applyRuleActions({
  transactions,
  actions
}) {
  return applyActions(transactions, actions);
}
async function addRulePayeeRename({
  fromNames,
  to
}) {
  return updatePayeeRenameRule(fromNames, to);
}
async function getRule({
  id
}) {
  const rule = getRules$1().find((rule2) => rule2.id === id);
  return rule ? rule.serialize() : null;
}
async function getRules() {
  return rankRules(getRules$1()).map((rule) => rule.serialize());
}
async function runRules({
  transaction: transaction2
}) {
  return runRules$1(transaction2);
}
const app$4 = createApp();
app$4.method("get-cell", getCell);
app$4.method("get-cell-names", getCellNames);
app$4.method("create-query", createQuery);
async function getCell({
  sheetName,
  name
}) {
  const node = get$1()._getNode(resolveName(sheetName, name));
  return { name: node.name, value: node.value };
}
async function getCellNames({ sheetName }) {
  const names = [];
  for (const name of get$1().getNodes().keys()) {
    const { sheet: nodeSheet, name: nodeName } = unresolveName(name);
    if (nodeSheet === sheetName) {
      names.push(nodeName);
    }
  }
  return names;
}
async function createQuery({
  sheetName,
  name,
  query
}) {
  get$1().createQuery(sheetName, name, query);
  return "ok";
}
const app$3 = createApp();
app$3.method("sync", sync);
app$3.method("sync-reset", resetSync);
app$3.method("sync-repair", repairSync);
async function sync() {
  return await fullSync();
}
async function resetSync() {
  return await resetSync$1();
}
async function repairSync() {
  await repairSync$1();
}
const app$2 = createApp();
app$2.method("tags-get", getTags);
app$2.method("tags-create", mutator(undoable(createTag)));
app$2.method("tags-delete", mutator(undoable(deleteTag)));
app$2.method("tags-delete-all", mutator(deleteAllTags));
app$2.method("tags-update", mutator(undoable(updateTag)));
async function getTags() {
  return await getTags$1();
}
async function createTag({
  tag,
  color,
  description = null
}) {
  const id = await insertTag({
    tag: tag.trim(),
    color: color.trim(),
    description
  });
  return { id, tag, color, description };
}
async function deleteTag(tag) {
  await deleteTag$1(tag);
  return tag.id;
}
async function deleteAllTags(ids) {
  await batchMessages(async () => {
    for (const id of ids) {
      await deleteTag$1({ id });
    }
  });
  return ids;
}
async function updateTag(tag) {
  await updateTag$1(tag);
  return tag;
}
const app$1 = createApp();
app$1.method("tools/fix-split-transactions", fixSplitTransactions);
async function fixSplitTransactions() {
  const blankPayeeRows = await all(`
    SELECT t.*, p.payee AS parentPayee FROM v_transactions_internal t
    LEFT JOIN v_transactions_internal p ON t.parent_id = p.id
    WHERE t.is_child = 1 AND t.payee IS NULL AND p.payee IS NOT NULL
  `);
  await runMutator(async () => {
    const updated = blankPayeeRows.map((row) => ({
      id: row.id,
      payee: row.parentPayee
    }));
    await batchUpdateTransactions({ updated });
  });
  const clearedRows = await all(`
    SELECT t.id, p.cleared FROM v_transactions_internal t
    LEFT JOIN v_transactions_internal p ON t.parent_id = p.id
    WHERE t.is_child = 1 AND t.cleared != p.cleared
  `);
  await runMutator(async () => {
    const updated = clearedRows.map((row) => ({
      id: row.id,
      cleared: row.cleared === 1
    }));
    await batchUpdateTransactions({ updated });
  });
  const deletedRows = await all(`
    SELECT t.* FROM v_transactions_internal t
    LEFT JOIN v_transactions_internal p ON t.parent_id = p.id
    WHERE t.is_child = 1 AND t.tombstone = 0 AND (p.tombstone = 1 OR p.id IS NULL)
  `);
  await runMutator(async () => {
    const updated = deletedRows.map((row) => ({ id: row.id, tombstone: true }));
    await batchUpdateTransactions({ updated });
  });
  const splitTransactions = (await aqlQuery(
    q("transactions").options({ splits: "grouped" }).filter({
      is_parent: true
    }).select("*")
  )).data;
  const mismatchedSplits = splitTransactions.filter((t) => {
    const subValue = t.subtransactions.reduce((acc, st) => acc + st.amount, 0);
    return subValue !== t.amount;
  });
  const brokenTransfers = await all(`
    SELECT t1.id
    FROM v_transactions_internal t1
           JOIN accounts a1 ON t1.account = a1.id
           JOIN v_transactions_internal t2 ON t1.transfer_id = t2.id
           JOIN accounts a2 ON t2.account = a2.id
    WHERE a1.offbudget = a2.offbudget
      AND t1.category IS NOT NULL
  `);
  await runMutator(async () => {
    const updated = brokenTransfers.map((row) => ({
      id: row.id,
      category: null
    }));
    await batchUpdateTransactions({ updated });
  });
  const errorRows = await all(`
    SELECT id FROM v_transactions_internal WHERE error IS NOT NULL AND is_parent = 0
  `);
  await runMutator(async () => {
    const updated = errorRows.map(({ id }) => ({ id, error: null }));
    await batchUpdateTransactions({ updated });
  });
  const parentTransactionsWithCategory = await all(`
    SELECT id FROM transactions WHERE isParent = 1 AND category IS NOT NULL
  `);
  await runMutator(async () => {
    const updated = parentTransactionsWithCategory.map(({ id }) => ({
      id,
      category: null
    }));
    await batchUpdateTransactions({ updated });
  });
  return {
    numBlankPayees: blankPayeeRows.length,
    numCleared: clearedRows.length,
    numDeleted: deletedRows.length,
    numTransfersFixed: brokenTransfers.length,
    numNonParentErrorsFixed: errorRows.length,
    numParentTransactionsWithCategoryFixed: parentTransactionsWithCategory.length,
    mismatchedSplits
  };
}
async function exportToCSV(transactions, accounts, categoryGroups, payees) {
  const accountNamesById = accounts.reduce((reduced, { id, name }) => {
    reduced[id] = name;
    return reduced;
  }, {});
  const categoryNamesById = categoryGroups.reduce(
    (reduced, { name, categories: subCategories }) => {
      subCategories.forEach(
        (subCategory) => reduced[subCategory.id] = `${name}: ${subCategory.name}`
      );
      return reduced;
    },
    {}
  );
  const payeeNamesById = payees.reduce((reduced, { id, name }) => {
    reduced[id] = name;
    return reduced;
  }, {});
  const transactionsForExport = transactions.map(
    ({
      account,
      date,
      payee,
      notes,
      category,
      amount,
      cleared,
      reconciled
    }) => ({
      Account: accountNamesById[account],
      Date: date,
      Payee: payeeNamesById[payee],
      Notes: notes,
      Category: categoryNamesById[category],
      Amount: amount == null ? 0 : integerToAmount(amount),
      Cleared: cleared,
      Reconciled: reconciled
    })
  );
  return sync$1.stringify(transactionsForExport, { header: true });
}
async function exportQueryToCSV(query) {
  const { data: transactions } = await aqlQuery(
    query.select([
      { Id: "id" },
      { Account: "account.name" },
      { Date: "date" },
      { Payee: "payee.name" },
      { ParentId: "parent_id" },
      { IsParent: "is_parent" },
      { IsChild: "is_child" },
      { SortOrder: "sort_order" },
      { Notes: "notes" },
      { Category: "category.name" },
      { Amount: "amount" },
      { Cleared: "cleared" },
      { Reconciled: "reconciled" }
    ]).options({ splits: "all" })
  );
  const parentsChildCount = /* @__PURE__ */ new Map();
  const childSplitOrder = /* @__PURE__ */ new Map();
  for (const trans of transactions) {
    if (trans.IsChild) {
      let childNumber = parentsChildCount.get(trans.ParentId) || 0;
      childNumber++;
      childSplitOrder.set(trans.Id, childNumber);
      parentsChildCount.set(trans.ParentId, childNumber);
    }
  }
  const transactionsForExport = transactions.map((trans) => {
    return {
      Account: trans.Account,
      Date: trans.Date,
      Payee: trans.Payee,
      Notes: trans.IsParent ? "(SPLIT INTO " + parentsChildCount.get(trans.Id) + ") " + (trans.Notes || "") : trans.IsChild ? "(SPLIT " + childSplitOrder.get(trans.Id) + " OF " + parentsChildCount.get(trans.ParentId) + ") " + (trans.Notes || "") : trans.Notes,
      Category: trans.Category,
      Amount: trans.IsParent ? 0 : trans.Amount == null ? 0 : integerToAmount(trans.Amount),
      Split_Amount: trans.IsParent ? integerToAmount(trans.Amount) : 0,
      Cleared: trans.Reconciled === true ? "Reconciled" : trans.Cleared === true ? "Cleared" : "Not cleared"
    };
  });
  return sync$1.stringify(transactionsForExport, { header: true });
}
function sgml2Xml(sgml) {
  return sgml.replace(/&/g, "&#038;").replace(/&amp;/g, "&#038;").replace(/>\s+</g, "><").replace(/\s+</g, "<").replace(/>\s+/g, ">").replace(/\.(?=[^<>]*>)/g, "").replace(/<(\w+?)>([^<]+)/g, "<$1>$2</<added>$1>").replace(/<\/<added>(\w+?)>(<\/\1>)?/g, "</$1>");
}
function html2Plain(value) {
  return value?.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/(&amp;|&#038;)/g, "&");
}
async function parseXml(content) {
  return await xml2js.parseStringPromise(content, {
    explicitArray: false,
    trim: true
  });
}
function getStmtTrn(data) {
  const ofx = data?.["OFX"];
  if (ofx?.["CREDITCARDMSGSRSV1"] != null) {
    return getCcStmtTrn(ofx);
  } else if (ofx?.["INVSTMTMSGSRSV1"] != null) {
    return getInvStmtTrn(ofx);
  } else {
    return getBankStmtTrn(ofx);
  }
}
function getBankStmtTrn(ofx) {
  const msg = ofx?.["BANKMSGSRSV1"];
  const stmtTrnRs = getAsArray(msg?.["STMTTRNRS"]);
  const result = stmtTrnRs.flatMap((s) => {
    const stmtRs = s?.["STMTRS"];
    const tranList = stmtRs?.["BANKTRANLIST"];
    const stmtTrn = tranList?.["STMTTRN"];
    return getAsArray(stmtTrn);
  });
  return result;
}
function getCcStmtTrn(ofx) {
  const msg = ofx?.["CREDITCARDMSGSRSV1"];
  const stmtTrnRs = getAsArray(msg?.["CCSTMTTRNRS"]);
  const result = stmtTrnRs.flatMap((s) => {
    const stmtRs = s?.["CCSTMTRS"];
    const tranList = stmtRs?.["BANKTRANLIST"];
    const stmtTrn = tranList?.["STMTTRN"];
    return getAsArray(stmtTrn);
  });
  return result;
}
function getInvStmtTrn(ofx) {
  const msg = ofx?.["INVSTMTMSGSRSV1"];
  const stmtTrnRs = getAsArray(msg?.["INVSTMTTRNRS"]);
  const result = stmtTrnRs.flatMap((s) => {
    const stmtRs = s?.["INVSTMTRS"];
    const tranList = stmtRs?.["INVTRANLIST"];
    const stmtTrn = tranList?.["INVBANKTRAN"]?.flatMap((t) => t?.["STMTTRN"]);
    return getAsArray(stmtTrn);
  });
  return result;
}
function getAsArray(value) {
  return Array.isArray(value) ? value : value === void 0 ? [] : [value];
}
function mapOfxTransaction(stmtTrn) {
  const dtPosted = stmtTrn["DTPOSTED"];
  const transactionDate = dtPosted ? new Date(
    Number(dtPosted.substring(0, 4)),
    // year
    Number(dtPosted.substring(4, 6)) - 1,
    // month (zero-based index)
    Number(dtPosted.substring(6, 8))
    // date
  ) : null;
  return {
    amount: stmtTrn["TRNAMT"],
    type: stmtTrn["TRNTYPE"],
    fitId: stmtTrn["FITID"],
    date: dayFromDate(transactionDate),
    name: html2Plain(stmtTrn["NAME"]),
    memo: html2Plain(stmtTrn["MEMO"])
  };
}
async function ofx2json(ofx) {
  const contents = ofx.split(/<OFX\s?>/, 2);
  const headerString = contents[0].split(/\r?\n/);
  const headers = {};
  headerString.forEach((attrs) => {
    if (attrs) {
      const headAttr = attrs.split(/:/, 2);
      headers[headAttr[0]] = headAttr[1];
    }
  });
  const content = `<OFX>${contents[1]}`;
  let dataParsed = null;
  try {
    dataParsed = await parseXml(content);
  } catch (e) {
    const sanitized = sgml2Xml(content);
    dataParsed = await parseXml(sanitized);
  }
  return {
    headers,
    transactions: getStmtTrn(dataParsed).map(mapOfxTransaction)
  };
}
function qif2json(qif, options = {}) {
  const lines = qif.split("\n").filter(Boolean);
  let line = lines.shift();
  const type = /!Type:([^$]*)$/.exec(line.trim());
  const data = {
    dateFormat: options.dateFormat,
    transactions: []
  };
  const transactions = data.transactions;
  let transaction2 = {};
  if (!type || !type.length) {
    throw new Error("File does not appear to be a valid qif file: " + line);
  }
  data.type = type[1];
  let division = {};
  while (line = lines.shift()) {
    line = line.trim();
    if (line === "^") {
      transactions.push(transaction2);
      transaction2 = {};
      continue;
    }
    switch (line[0]) {
      case "D":
        transaction2.date = line.substring(1);
        break;
      case "T":
        transaction2.amount = line.substring(1);
        break;
      case "N":
        transaction2.number = line.substring(1);
        break;
      case "M":
        transaction2.memo = line.substring(1);
        break;
      case "A":
        transaction2.address = (transaction2.address || []).concat(
          line.substring(1)
        );
        break;
      case "P":
        transaction2.payee = line.substring(1).replace(/&amp;/g, "&");
        break;
      case "L":
        const lArray = line.substring(1).split(":");
        transaction2.category = lArray[0];
        if (lArray[1] !== void 0) {
          transaction2.subcategory = lArray[1];
        }
        break;
      case "C":
        transaction2.clearedStatus = line.substring(1);
        break;
      case "S":
        const sArray = line.substring(1).split(":");
        division.category = sArray[0];
        if (sArray[1] !== void 0) {
          division.subcategory = sArray[1];
        }
        break;
      case "E":
        division.description = line.substring(1);
        break;
      case "$":
        division.amount = parseFloat(line.substring(1));
        if (!(transaction2.division instanceof Array)) {
          transaction2.division = [];
        }
        transaction2.division.push(division);
        division = {};
        break;
      default:
        throw new Error("Unknown Detail Code: " + line[0]);
    }
  }
  if (Object.keys(transaction2).length) {
    transactions.push(transaction2);
  }
  return data;
}
function findKeys(obj, key) {
  let result = [];
  for (const i in obj) {
    if (!obj.hasOwnProperty(i)) continue;
    if (i === key) {
      if (Array.isArray(obj[i])) {
        result = result.concat(obj[i]);
      } else {
        result.push(obj[i]);
      }
    }
    if (typeof obj[i] === "object") {
      result = result.concat(findKeys(obj[i], key));
    }
  }
  return result;
}
function getPayeeNameFromTxDtls(TxDtls, isDebit) {
  if (TxDtls?.RltdPties) {
    const key = isDebit ? TxDtls.RltdPties.Cdtr : TxDtls.RltdPties.Dbtr;
    const Nm = findKeys(key, "Nm");
    return Nm.length > 0 ? Nm[0] : null;
  }
  return null;
}
function getNotesFromTxDtls(TxDtls) {
  if (TxDtls?.RmtInf) {
    const Ustrd = TxDtls.RmtInf.Ustrd;
    return Array.isArray(Ustrd) ? Ustrd.join(" ") : Ustrd;
  }
  return null;
}
function convertToNumberOrNull(value) {
  const number2 = Number(value);
  return isNaN(number2) ? null : number2;
}
function getDtOrDtTm(Date2) {
  if (!Date2) {
    return null;
  }
  if ("DtTm" in Date2) {
    return Date2.DtTm.slice(0, 10);
  }
  return Date2?.Dt;
}
async function xmlCAMT2json(content) {
  const data = await xml2js.parseStringPromise(content, { explicitArray: false });
  const entries = findKeys(data, "Ntry");
  const transactions = [];
  for (const entry of entries) {
    const id = entry.AcctSvcrRef;
    const amount = convertToNumberOrNull(entry.Amt?._);
    const isDebit = entry.CdtDbtInd === "DBIT";
    const date = getDtOrDtTm(entry.ValDt) || getDtOrDtTm(entry.BookgDt);
    if (Array.isArray(entry.NtryDtls?.TxDtls)) {
      entry.NtryDtls.TxDtls.forEach((TxDtls) => {
        const subPayee = getPayeeNameFromTxDtls(TxDtls, isDebit);
        const subNotes = getNotesFromTxDtls(TxDtls);
        const Amt = findKeys(TxDtls, "Amt");
        const amount2 = Amt.length > 0 ? convertToNumberOrNull(Amt[0]._) : null;
        transactions.push({
          amount: isDebit ? -amount2 : amount2,
          date,
          payee_name: subPayee,
          imported_payee: subPayee,
          notes: subNotes
        });
      });
    } else {
      let payee_name;
      let notes;
      payee_name = getPayeeNameFromTxDtls(entry.NtryDtls?.TxDtls, isDebit);
      if (!payee_name && entry.AddtlNtryInf) {
        payee_name = entry.AddtlNtryInf;
      }
      notes = getNotesFromTxDtls(entry.NtryDtls?.TxDtls);
      if (!notes && entry.AddtlNtryInf && entry.AddtlNtryInf !== payee_name) {
        notes = entry.AddtlNtryInf;
      }
      if (!payee_name && !notes && entry.NtryRef) {
        notes = entry.NtryRef;
      }
      if (payee_name && notes && payee_name.includes(notes)) {
        notes = null;
      }
      const transaction2 = {
        amount: isDebit ? -amount : amount,
        date,
        payee_name,
        imported_payee: payee_name,
        notes
      };
      if (id) {
        transaction2.imported_id = id;
      }
      transactions.push(transaction2);
    }
  }
  return transactions.filter(
    (trans) => trans.date != null && trans.amount != null
  );
}
async function parseFile(filepath, options = {}) {
  const errors = Array();
  const m = filepath.match(/\.[^.]*$/);
  if (m) {
    const ext = m[0];
    switch (ext.toLowerCase()) {
      case ".qif":
        return parseQIF(filepath, options);
      case ".csv":
      case ".tsv":
        return parseCSV(filepath, options);
      case ".ofx":
      case ".qfx":
        return parseOFX(filepath, options);
      case ".xml":
        return parseCAMT(filepath, options);
    }
  }
  errors.push({
    message: "Invalid file type",
    internal: ""
  });
  return { errors, transactions: [] };
}
async function parseCSV(filepath, options) {
  const errors = Array();
  let contents = await readFile(filepath);
  if (options.skipLines > 0) {
    const lines = contents.split(/\r?\n/);
    contents = lines.slice(options.skipLines).join("\r\n");
  }
  let data;
  try {
    data = sync$2.parse(contents, {
      columns: options?.hasHeaderRow,
      bom: true,
      delimiter: options?.delimiter || ",",
      // eslint-disable-next-line actual/typography
      quote: '"',
      trim: true,
      relax_column_count: true,
      skip_empty_lines: true
    });
  } catch (err) {
    errors.push({
      message: "Failed parsing: " + err.message,
      internal: err.message
    });
    return { errors, transactions: [] };
  }
  return { errors, transactions: data };
}
async function parseQIF(filepath, options = {}) {
  const errors = Array();
  const contents = await readFile(filepath);
  let data;
  try {
    data = qif2json(contents);
  } catch (err) {
    errors.push({
      message: "Failed parsing: doesn’t look like a valid QIF file.",
      internal: err.stack
    });
    return { errors, transactions: [] };
  }
  return {
    errors: [],
    transactions: data.transactions.map((trans) => ({
      amount: trans.amount != null ? looselyParseAmount(trans.amount) : null,
      date: trans.date,
      payee_name: trans.payee,
      imported_payee: trans.payee,
      notes: options.importNotes ? trans.memo || null : null
    })).filter((trans) => trans.date != null && trans.amount != null)
  };
}
async function parseOFX(filepath, options) {
  const errors = Array();
  const contents = await readFile(filepath);
  let data;
  try {
    data = await ofx2json(contents);
  } catch (err) {
    errors.push({
      message: "Failed importing file",
      internal: err.stack
    });
    return { errors };
  }
  const useMemoFallback = options.fallbackMissingPayeeToMemo;
  return {
    errors,
    transactions: data.transactions.map((trans) => {
      return {
        amount: trans.amount,
        imported_id: trans.fitId,
        date: trans.date,
        payee_name: trans.name || (useMemoFallback ? trans.memo : null),
        imported_payee: trans.name || (useMemoFallback ? trans.memo : null),
        notes: options.importNotes ? trans.memo || null : null
        //memo used for payee
      };
    })
  };
}
async function parseCAMT(filepath, options = {}) {
  const errors = Array();
  const contents = await readFile(filepath);
  let data;
  try {
    data = await xmlCAMT2json(contents);
  } catch (err) {
    console.error(err);
    errors.push({
      message: "Failed importing file",
      internal: err.stack
    });
    return { errors };
  }
  return {
    errors,
    transactions: data.map((trans) => ({
      ...trans,
      notes: options.importNotes ? trans.notes : null
    }))
  };
}
async function mergeTransactions(transactions) {
  const txIds = transactions?.map((x) => x?.id).filter(Boolean) || [];
  if (txIds.length !== 2) {
    throw new Error(
      "Merging is only possible with 2 transactions, but found " + JSON.stringify(transactions)
    );
  }
  const [a, b] = await Promise.all(
    txIds.map(getTransaction)
  );
  if (!a || !b) {
    throw new Error("One of the provided transactions does not exist");
  } else if (a.amount !== b.amount) {
    throw new Error("Transaction amounts must match for merge");
  }
  const { keep, drop } = determineKeepDrop(a, b);
  await Promise.all([
    updateTransaction$2({
      id: keep.id,
      payee: keep.payee || drop.payee,
      category: keep.category || drop.category,
      notes: keep.notes || drop.notes,
      cleared: keep.cleared || drop.cleared,
      reconciled: keep.reconciled || drop.reconciled
    }),
    deleteTransaction$2(drop)
  ]);
  return keep.id;
}
function determineKeepDrop(a, b) {
  if (b.imported_id && !a.imported_id) {
    return { keep: b, drop: a };
  } else if (a.imported_id && !b.imported_id) {
    return { keep: a, drop: b };
  }
  if (b.imported_payee && !a.imported_payee) {
    return { keep: b, drop: a };
  } else if (a.imported_payee && !b.imported_payee) {
    return { keep: a, drop: b };
  }
  if (a.date.localeCompare(b.date) < 0) {
    return { keep: a, drop: b };
  } else {
    return { keep: b, drop: a };
  }
}
async function handleBatchUpdateTransactions({
  added,
  deleted,
  updated,
  learnCategories
}) {
  const result = await batchUpdateTransactions({
    added,
    updated,
    deleted,
    learnCategories
  });
  return result;
}
async function addTransaction(transaction2) {
  await handleBatchUpdateTransactions({ added: [transaction2] });
  return {};
}
async function updateTransaction(transaction2) {
  await handleBatchUpdateTransactions({ updated: [transaction2] });
  return {};
}
async function deleteTransaction(transaction2) {
  await handleBatchUpdateTransactions({ deleted: [transaction2] });
  return {};
}
async function parseTransactionsFile({
  filepath,
  options
}) {
  return parseFile(filepath, options);
}
async function exportTransactions({
  transactions,
  accounts,
  categoryGroups,
  payees
}) {
  return exportToCSV(transactions, accounts, categoryGroups, payees);
}
async function exportTransactionsQuery({
  query: queryState
}) {
  return exportQueryToCSV(new Query(queryState));
}
async function getEarliestTransaction() {
  const { data } = await aqlQuery(
    q("transactions").options({ splits: "none" }).orderBy({ date: "asc" }).select("*").limit(1)
  );
  return data[0] || null;
}
const app = createApp();
app.method(
  "transactions-batch-update",
  mutator(undoable(handleBatchUpdateTransactions))
);
app.method("transactions-merge", mutator(undoable(mergeTransactions)));
app.method("transaction-add", mutator(addTransaction));
app.method("transaction-update", mutator(updateTransaction));
app.method("transaction-delete", mutator(deleteTransaction));
app.method("transactions-parse-file", mutator(parseTransactionsFile));
app.method("transactions-export", mutator(exportTransactions));
app.method("transactions-export-query", mutator(exportTransactionsQuery));
app.method("get-earliest-transaction", getEarliestTransaction);
exports.handlers = {};
exports.handlers["undo"] = mutator(async function() {
  return undo();
});
exports.handlers["redo"] = mutator(function() {
  return redo();
});
exports.handlers["make-filters-from-conditions"] = async function({
  conditions,
  applySpecialCases
}) {
  return conditionsToAQL(conditions, { applySpecialCases });
};
exports.handlers["query"] = async function(query) {
  if (query["table"] == null) {
    throw new Error("query has no table, did you forgot to call `.serialize`?");
  }
  return aqlQuery(query);
};
exports.handlers["get-server-version"] = async function() {
  if (!getServer()) {
    return { error: "no-server" };
  }
  let version;
  try {
    const res = await get(getServer().BASE_SERVER + "/info");
    const info = JSON.parse(res);
    version = info.build.version;
  } catch (err) {
    return { error: "network-failure" };
  }
  return { version };
};
exports.handlers["get-server-url"] = async function() {
  return getServer() && getServer().BASE_SERVER;
};
exports.handlers["set-server-url"] = async function({ url, validate = true }) {
  if (url == null) {
    await removeItem("user-token");
  } else {
    url = url.replace(/\/+$/, "");
    if (validate) {
      const result = await runHandler(exports.handlers["subscribe-needs-bootstrap"], {
        url
      });
      if ("error" in result) {
        return { error: result.error };
      }
    }
  }
  await setItem("server-url", url);
  await setItem("did-bootstrap", true);
  setServer(url);
  return {};
};
exports.handlers["app-focused"] = async function() {
  if (getPrefs() && getPrefs().id) {
    fullSync();
  }
};
exports.handlers = installAPI(exports.handlers);
override((name, args) => runHandler(app$j.handlers[name], args));
app$j.handlers = exports.handlers;
app$j.combine(
  app$g,
  app$f,
  app$e,
  app$b,
  app$8,
  app$6,
  app$1,
  app$9,
  app$c,
  app$5,
  app$h,
  app,
  app$i,
  app$7,
  app$4,
  app$3,
  app$d,
  app$a,
  app$2
);
function getDefaultDocumentDir() {
  return join$1(process.env.ACTUAL_DOCUMENT_DIR, "Actual");
}
async function setupDocumentsDir() {
  async function ensureExists(dir) {
    if (!await exists(dir)) {
      await mkdir(dir);
    }
  }
  let documentDir2 = await getItem("document-dir");
  if (documentDir2) {
    try {
      await ensureExists(documentDir2);
    } catch (e) {
      documentDir2 = null;
    }
  }
  if (!documentDir2) {
    documentDir2 = getDefaultDocumentDir();
  }
  await ensureExists(documentDir2);
  _setDocumentDir(documentDir2);
}
async function initApp(isDev, socketName) {
  await init$1();
  await Promise.all([init$3(), init$4()]);
  await setupDocumentsDir();
  const keysStr = await getItem("encrypt-keys");
  if (keysStr) {
    try {
      const keys2 = JSON.parse(keysStr);
      await Promise.all(
        Object.keys(keys2).map((fileId) => {
          return loadKey(keys2[fileId]);
        })
      );
    } catch (e) {
      console.log("Error loading key", e);
      throw new Error("load-key-error");
    }
  }
  const url = await getItem("server-url");
  if (!url) {
    await removeItem("user-token");
  }
  setServer(url);
  init$2(socketName, app$j.handlers);
  global.$query = aqlQuery;
  global.$q = q;
  if (isDev) {
    global.$send = (name, args) => runHandler(app$j.handlers[name], args);
    global.$db = db$1;
    global.$setSyncingMode = setSyncingMode;
  }
}
async function init(config2) {
  let dataDir, serverURL;
  if (config2) {
    dataDir = config2.dataDir;
    serverURL = config2.serverURL;
  } else {
    dataDir = process.env.ACTUAL_DATA_DIR;
    serverURL = process.env.ACTUAL_SERVER_URL;
  }
  await init$1();
  await Promise.all([init$3({ persist: false }), init$4()]);
  _setDocumentDir(dataDir || process.cwd());
  if (serverURL) {
    setServer(serverURL);
    if (config2.password) {
      await runHandler(exports.handlers["subscribe-sign-in"], {
        password: config2.password
      });
    }
  } else {
    setServer(null);
    app$j.events.on("load-budget", () => {
      setSyncingMode("offline");
    });
  }
  return lib;
}
const lib = {
  getDataDir,
  sendMessage: (msg, args) => send$1(),
  send: async (name, args) => {
    const res = await runHandler(app$j.handlers[name], args);
    return res;
  },
  on: (name, func) => app$j.events.on(name, func),
  q,
  db: db$1
};
exports.getDefaultDocumentDir = getDefaultDocumentDir;
exports.init = init;
exports.initApp = initApp;
exports.lib = lib;
//# sourceMappingURL=main.js.map
