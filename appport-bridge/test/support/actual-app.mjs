// Disposable Actual sync server for the consumer test, with synthetic users and budgets. Test-only.
//
// Requires the repository's own builds: `yarn build:api` (packages/api/dist) and
// `yarn workspace @actual-app/sync-server build` (packages/sync-server/build). ACTUAL_API_PATH and
// ACTUAL_SYNC_SERVER_ENTRY override their locations.
//
// Users: the server's owner (an ADMIN, created by /account/bootstrap) is a throwaway; admins can open every budget by
// design. bob and carol are ordinary users created with /admin/users. Password login only ever signs in the owner (multi-user
// login needs OpenID), so their sessions are inserted into the server's `sessions` table, exactly as the repository's own
// test setup does (packages/sync-server/vitest.globalSetup.js).

import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  freePort,
  http,
  openOracle,
  startProcess,
  tempDir,
} from '#lib/harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
export const API_PATH =
  process.env.ACTUAL_API_PATH ??
  join(REPO, 'packages', 'api', 'dist', 'index.js');
const SERVER_ENTRY =
  process.env.ACTUAL_SYNC_SERVER_ENTRY ??
  join(REPO, 'packages', 'sync-server', 'build', 'app.js');

export async function startActual() {
  const work = tempDir('actual-appport-');
  const serverFiles = join(work, 'server-files'),
    userFiles = join(work, 'user-files');
  mkdirSync(serverFiles);
  mkdirSync(userFiles);
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const proc = await startProcess(process.execPath, [SERVER_ENTRY], {
    cwd: dirname(dirname(SERVER_ENTRY)),
    env: {
      ACTUAL_DATA_DIR: work,
      ACTUAL_SERVER_FILES: serverFiles,
      ACTUAL_USER_FILES: userFiles,
      ACTUAL_PORT: String(port),
      ACTUAL_HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
    },
    readyUrl: `${base}/account/needs-bootstrap`,
    name: 'actual-sync-server',
    timeoutMs: 60_000,
  });

  const boot = await http(base, 'POST', '/account/bootstrap', {
    body: { password: `synthetic-owner-${randomBytes(6).toString('hex')}` },
  });
  const ownerToken = boot.json?.data?.token;
  if (!ownerToken) throw new Error(`bootstrap failed: ${boot.status}`);

  const { DatabaseSync } = await import('node:sqlite');
  const accountDb = new DatabaseSync(join(serverFiles, 'account.sqlite')); // writable: test setup only (sessions for bob/carol)
  const users = {};
  for (const name of ['bob', 'carol']) {
    const created = await http(base, 'POST', '/admin/users', {
      headers: { 'x-actual-token': ownerToken },
      body: { userName: name, displayName: name, role: 'BASIC', enabled: true },
    });
    const userId = created.json?.data?.id;
    if (!userId) throw new Error(`create ${name}: ${created.status}`);
    const token = randomBytes(24).toString('hex');
    accountDb
      .prepare(
        "INSERT INTO sessions (token, expires_at, user_id, auth_method) VALUES (?, -1, ?, 'password')",
      )
      .run(token, userId);
    users[name] = { name, userId, token, credential: `Bearer ${token}` };
  }
  accountDb.close();

  const budgets = {};
  for (const name of ['bob', 'carol']) {
    const dataDir = join(work, `seed-${name}`);
    mkdirSync(dataDir);
    const out = execFileSync(
      process.execPath,
      [
        join(HERE, 'seed-budget.cjs'),
        API_PATH,
        dataDir,
        base,
        users[name].token,
        `Synthetic ${name} budget`,
        `Syn-${name}`,
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    budgets[name] = JSON.parse(out.trim().split('\n').pop());
  }

  const server = await openOracle(join(serverFiles, 'account.sqlite'));
  const opened = []; // downloaded budget databases, closed on stop()

  /** Independent observation: download the stored budget file from the sync server as its owner and open its db.sqlite. */
  async function storedBudget(owner) {
    const b = budgets[owner];
    const res = await fetch(`${base}/sync/download-user-file`, {
      headers: {
        'x-actual-token': users[owner].token,
        'x-actual-file-id': b.fileId,
      },
    });
    if (!res.ok) throw new Error(`download ${owner}: ${res.status}`);
    const dir = join(work, `oracle-${owner}-${Date.now()}`);
    mkdirSync(dir);
    writeFileSync(
      join(dir, 'budget.zip'),
      Buffer.from(await res.arrayBuffer()),
    );
    execFileSync('python3', [
      '-c',
      "import sys, zipfile; zipfile.ZipFile(sys.argv[1]).extract('db.sqlite', sys.argv[2])",
      join(dir, 'budget.zip'),
      dir,
    ]);
    const db = await openOracle(join(dir, 'db.sqlite'));
    opened.push(db);
    {
      return {
        accounts: db.all(
          'SELECT id, name, offbudget, closed FROM accounts WHERE tombstone = 0 ORDER BY name',
        ),
        transactions: accountId =>
          db.all(
            'SELECT id, date, amount, notes FROM transactions WHERE acct = ? AND tombstone = 0 AND isParent = 0 ORDER BY date, id',
            accountId,
          ),
        budgeted: (month, categoryId) =>
          db.get(
            'SELECT amount FROM zero_budgets WHERE month = ? AND category = ?',
            Number(month.replace('-', '')),
            categoryId,
          )?.amount ?? 0,
        categoryName: id =>
          db.get('SELECT name FROM categories WHERE id = ?', id)?.name,
      };
    }
  }

  return {
    base,
    work,
    users,
    budgets,
    storedBudget,
    /** Server-side ownership, from the sync server's own `files` table. */
    fileOwner: owner =>
      server.get(
        'SELECT f.owner, u.user_name FROM files f LEFT JOIN users u ON u.id = f.owner WHERE f.id = ?',
        budgets[owner].fileId,
      ),
    /** The sync server's stored state for a budget: message count and the stored file's bytes. Used to show reads change nothing. */
    serverState: owner => {
      const groupDb = join(userFiles, `group-${budgets[owner].syncId}.sqlite`);
      let messages = 0;
      try {
        execFileSync('test', ['-f', groupDb]);
        messages = Number(
          execFileSync(
            process.execPath,
            [
              '--no-warnings',
              '-e',
              `const {DatabaseSync}=require("node:sqlite");const d=new DatabaseSync(${JSON.stringify(groupDb)},{readOnly:true});process.stdout.write(String(d.prepare("SELECT count(*) n FROM messages_binary").get().n))`,
            ],
            { encoding: 'utf8' },
          ),
        );
      } catch {}
      return {
        messages,
        file: readFileSync(
          join(userFiles, `file-${budgets[owner].fileId}.blob`),
        ).toString('base64'),
      };
    },
    async stop() {
      for (const db of opened) db.close();
      server.close();
      await proc.stop();
    },
  };
}
