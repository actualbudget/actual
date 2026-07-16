import * as fs from 'fs';
import * as path from 'path';

import { describe, expect, it } from 'vitest';

import { getMigrationId } from './migrations';

// Migrations newer than this id must be additive-only. Clients tolerate
// budgets and sync messages from newer app versions (see
// `replayPendingMessages` and `checkDatabaseValidity`), which is only
// safe if newer migrations never remove or rename what older clients
// depend on. Dropping/recreating views is fine — they hold no data —
// but their columns must stay backwards-compatible (a code-review
// concern, not enforceable here).
const ADDITIVE_ONLY_CUTOFF = 1780606215001;

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../migrations');

// Matched against the raw source, comments and strings included, so
// nothing destructive can hide inside a comment or a quoted literal.
// The flip side: a comment merely *mentioning* e.g. "DROP TABLE" fails
// the test too — just reword it. That false positive is the price of
// not parsing SQL here, and it fails in the safe direction.
const FORBIDDEN_PATTERNS = [
  { name: 'DROP TABLE', regex: /\bDROP\s+TABLE\b/i },
  { name: 'DROP COLUMN', regex: /\bDROP\s+COLUMN\b/i },
  { name: 'RENAME (table or column)', regex: /\bRENAME\s+(TO|COLUMN)\b/i },
  {
    // New columns must be nullable or have a DEFAULT, so rows written
    // by older clients (which don't know the column) stay valid
    name: 'ADD COLUMN with NOT NULL but no DEFAULT',
    regex: /\bADD\s+COLUMN(?![^,;)]*\bDEFAULT\b)[^,;)]*\bNOT\s+NULL\b/i,
  },
];

describe('migrations are additive-only', () => {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(name => /\.(sql|js)$/.test(name))
    .filter(name => getMigrationId(name) > ADDITIVE_ONLY_CUTOFF);

  it.each(files)('%s contains no destructive schema changes', file => {
    const source = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const violations = FORBIDDEN_PATTERNS.filter(({ regex }) =>
      regex.test(source),
    ).map(({ name }) => name);

    expect(
      violations,
      `Migration ${file} is destructive (${violations.join('; ')}). ` +
        'Migrations must be additive-only so that older clients keep ' +
        'working: no dropping or renaming tables/columns, and new ' +
        'columns must be nullable or have a DEFAULT. If you need to ' +
        'retire a column, stop reading it but leave it in place. ' +
        '(A comment merely mentioning a destructive statement also ' +
        'trips this check — reword it.)',
    ).toEqual([]);
  });

  it.each([
    'DROP TABLE foo;',
    'ALTER TABLE foo DROP COLUMN bar;',
    'ALTER TABLE foo RENAME TO bar;',
    'ALTER TABLE foo RENAME COLUMN a TO b;',
    'ALTER TABLE foo ADD COLUMN bar TEXT NOT NULL;',
    "INSERT INTO x VALUES ('a--b'); DROP TABLE foo;",
  ])('sanity check: flags `%s`', sql => {
    expect(FORBIDDEN_PATTERNS.some(({ regex }) => regex.test(sql))).toBe(true);
  });

  it.each([
    'ALTER TABLE foo ADD COLUMN bar TEXT;',
    "ALTER TABLE foo ADD COLUMN bar TEXT NOT NULL DEFAULT 'x';",
    'DROP VIEW v_foo;',
  ])('sanity check: allows `%s`', sql => {
    expect(FORBIDDEN_PATTERNS.some(({ regex }) => regex.test(sql))).toBe(false);
  });
});
