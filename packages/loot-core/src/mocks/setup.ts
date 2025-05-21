// @ts-strict-ignore
import * as nativeFs from 'fs';

import * as fetchClient from '../platform/client/fetch';
import * as sqlite from '../platform/server/sqlite';
import * as db from '../server/db';
import * as MigrationsType from '../server/migrate/migrations';
import {
  enableGlobalMutations,
  disableGlobalMutations,
} from '../server/mutators';
import { setServer } from '../server/server-config';
import * as sheet from '../server/sheet';
import { setSyncingMode } from '../server/sync';
import * as rules from '../server/transactions/transaction-rules';
import { updateVersion } from '../server/update';
import { resetTracer, tracer } from '../shared/test-helpers';

vi.mock('../platform/client/fetch');
vi.mock('../platform/exceptions');
vi.mock('../platform/server/asyncStorage');
vi.mock('../platform/server/connection');
vi.mock('../server/post');

// By default, syncing is disabled
setSyncingMode('disabled');

// Set a mock url for the testing server
setServer('https://test.env');

process.on('unhandledRejection', reason => {
  console.log('REJECTION', reason);
});

global.IS_TESTING = true;

let _time = 123456789;
const _oldDateNow = global.Date.now;
global.Date.now = () => _time;

global.restoreDateNow = () => (global.Date.now = _oldDateNow);
global.restoreFakeDateNow = () => (global.Date.now = () => _time);

global.stepForwardInTime = time => {
  if (time) {
    _time = time;
  } else {
    _time += 1000;
  }
};

global.resetTime = () => {
  _time = 123456789;
};

let _id = 1;
global.resetRandomId = () => {
  _id = 1;
};

vi.mock('uuid', () => ({
  v4: () => {
    return 'id' + _id++;
  },
}));
vi.mock('../server/migrate/migrations', async () => {
  const realMigrations = await vi.importActual<typeof MigrationsType>(
    '../server/migrate/migrations',
  );
  return {
    ...realMigrations,
    migrate: async db => {
      _id = 100_000_000;
      await realMigrations.migrate(db);
      _id = 1;
    },
  };
});

global.getDatabaseDump = async function (tables) {
  if (!tables) {
    const rows = await sqlite.runQuery<{ name }>(
      db.getDatabase(),
      "SELECT name FROM sqlite_master WHERE type='table'",
      [],
      true,
    );

    tables = rows.map(row => row.name);
  }

  const data = await Promise.all(
    tables.map(async table => {
      let sortColumn;
      switch (table) {
        case 'spreadsheet_cells':
          sortColumn = 'name';
          break;
        case 'created_budgets':
          sortColumn = 'month';
          break;
        case 'db_version':
          sortColumn = 'version';
          break;
        default:
          sortColumn = 'id';
      }

      return [
        table,
        await sqlite.runQuery(
          db.getDatabase(),
          'SELECT * FROM ' + table + ' ORDER BY ' + sortColumn,
          [],
          true,
        ),
      ];
    }),
  );

  const grouped = {};
  data.forEach(table => (grouped[table[0]] = table[1]));
  return grouped;
};

// If you want to test the sql.js backend, you need this so it knows
// where to find the webassembly file
// process.env.PUBLIC_URL =
//   __dirname + '/../../../../node_modules/@jlongster/sql.js/dist/';

global.emptyDatabase = function (avoidUpdate) {
  return async () => {
    const path = ':memory:';
    // let path = `/tmp/foo-${Math.random()}.sqlite`;
    // console.log('Using db ' + path);

    await sqlite.init();

    const memoryDB = await sqlite.openDatabase(path);
    sqlite.execQuery(
      memoryDB,
      nativeFs.readFileSync(__dirname + '/../server/sql/init.sql', 'utf8'),
    );

    db.setDatabase(memoryDB);
    await db.runQuery('INSERT INTO db_version (version) VALUES (?)', ['0.0.1']);

    if (!avoidUpdate) {
      await updateVersion();
      await db.loadClock();
    }
  };
};

beforeEach(() => {
  // This is necessary to create a valid rules state
  rules.resetState();
  resetTracer();
});

afterEach(() => {
  global.resetRandomId();
  tracer.end();
  fetchClient.clearServer();

  return new Promise(resolve => {
    if (sheet.get()) {
      sheet.get().onFinish(() => {
        sheet.unloadSpreadsheet();
        resolve(undefined);
      });
    } else {
      resolve(undefined);
    }
  });
});

// Tests by default are allowed to mutate the db at any time
beforeEach(() => enableGlobalMutations());
afterEach(() => disableGlobalMutations());
