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

const FORBIDDEN_PATTERNS = [
  { name: 'DROP TABLE', regex: /\bDROP\s+TABLE\b/i },
  { name: 'DROP COLUMN', regex: /\bDROP\s+COLUMN\b/i },
  { name: 'RENAME (table or column)', regex: /\bRENAME\s+(TO|COLUMN)\b/i },
];

function stripComments(source: string, kind: 'sql' | 'js'): string {
  const withoutBlocks = source.replace(/\/\*[\s\S]*?\*\//g, '');
  if (kind === 'sql') {
    // Strip `--` comments to end of line, including inline ones — an
    // inline comment could otherwise hide a destructive statement split
    // across lines, or false-flag SQL with a comment mentioning one
    return withoutBlocks.replace(/--[^\n]*/g, '');
  }
  // In JS `--` is an operator and inline `//` appears in URLs, so only
  // drop whole-line comments
  return withoutBlocks
    .split('\n')
    .filter(line => !line.trim().startsWith('//'))
    .join('\n');
}

function findViolations(source: string, kind: 'sql' | 'js'): string[] {
  const code = stripComments(source, kind);
  const violations = FORBIDDEN_PATTERNS.filter(({ regex }) =>
    regex.test(code),
  ).map(({ name }) => name);

  // Columns added to existing tables must be nullable or have a
  // default, so rows written by older clients (which don't know the
  // column) stay valid
  const addColumnClauses = code.match(/\bADD\s+COLUMN\b[^,;)]*/gi) || [];
  for (const clause of addColumnClauses) {
    if (/\bNOT\s+NULL\b/i.test(clause) && !/\bDEFAULT\b/i.test(clause)) {
      violations.push(
        `ADD COLUMN with NOT NULL but no DEFAULT: ${clause.trim()}`,
      );
    }
  }

  return violations;
}

describe('migrations are additive-only', () => {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(name => /\.(sql|js)$/.test(name))
    .filter(name => getMigrationId(name) > ADDITIVE_ONLY_CUTOFF);

  it.each(files)('%s contains no destructive schema changes', file => {
    const source = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const violations = findViolations(
      source,
      file.endsWith('.js') ? 'js' : 'sql',
    );

    expect(
      violations,
      `Migration ${file} is destructive (${violations.join('; ')}). ` +
        'Migrations must be additive-only so that older clients keep ' +
        'working: no dropping or renaming tables/columns, and new ' +
        'columns must be nullable or have a DEFAULT. If you need to ' +
        'retire a column, stop reading it but leave it in place.',
    ).toEqual([]);
  });

  it('sanity check: destructive statements are detected', () => {
    expect(
      findViolations('ALTER TABLE foo DROP COLUMN bar;', 'sql'),
    ).not.toEqual([]);
    expect(findViolations('DROP TABLE foo;', 'sql')).not.toEqual([]);
    expect(findViolations('ALTER TABLE foo RENAME TO bar;', 'sql')).not.toEqual(
      [],
    );
    expect(
      findViolations('ALTER TABLE foo RENAME COLUMN a TO b;', 'sql'),
    ).not.toEqual([]);
    expect(
      findViolations('ALTER TABLE foo ADD COLUMN bar TEXT NOT NULL;', 'sql'),
    ).not.toEqual([]);
    expect(
      findViolations(
        "ALTER TABLE foo ADD COLUMN bar TEXT NOT NULL DEFAULT 'x';",
        'sql',
      ),
    ).toEqual([]);
    expect(findViolations('DROP VIEW v_foo;', 'sql')).toEqual([]);
    expect(findViolations('-- DROP TABLE foo (comment)', 'sql')).toEqual([]);
    // Inline comments must not hide a destructive statement split
    // across lines...
    expect(
      findViolations('ALTER TABLE foo DROP -- sneaky\nCOLUMN bar;', 'sql'),
    ).not.toEqual([]);
    // ...and a trailing comment mentioning one must not false-flag
    expect(
      findViolations('CREATE TABLE x (id TEXT); -- no more DROP TABLE', 'sql'),
    ).toEqual([]);
  });
});
