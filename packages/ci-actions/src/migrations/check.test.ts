import { describe, expect, it } from 'vitest';

import {
  findAddedMigrations,
  findMisdatedMigrations,
  findMutatedMigrations,
  findRiskyStatements,
  parseMigrationTree,
} from './check';

const treeOutput = [
  '100644 blob aaa111\tpackages/loot-core/migrations/1000_first.sql',
  '100644 blob bbb222\tpackages/loot-core/migrations/2000_second.js',
  '100644 blob ccc333\tpackages/loot-core/migrations/.hidden',
].join('\n');

describe('parseMigrationTree', () => {
  it('parses names, ids, and hashes, skipping hidden files', () => {
    expect(parseMigrationTree(treeOutput)).toEqual([
      { name: '1000_first.sql', id: 1000, hash: 'aaa111' },
      { name: '2000_second.js', id: 2000, hash: 'bbb222' },
    ]);
  });

  it('returns an empty list for empty output', () => {
    expect(parseMigrationTree('')).toEqual([]);
  });
});

describe('findAddedMigrations', () => {
  it('returns migrations present on head but not on base', () => {
    const base = parseMigrationTree(treeOutput);
    const head = [
      ...base,
      { name: '3000_third.sql', id: 3000, hash: 'ddd444' },
    ];
    expect(findAddedMigrations(base, head)).toEqual([
      { name: '3000_third.sql', id: 3000, hash: 'ddd444' },
    ]);
  });
});

describe('findMutatedMigrations', () => {
  it('detects modified and deleted migrations', () => {
    const base = parseMigrationTree(treeOutput);
    const head = [{ name: '1000_first.sql', id: 1000, hash: 'changed' }];
    expect(findMutatedMigrations(base, head)).toEqual({
      modified: ['1000_first.sql'],
      deleted: ['2000_second.js'],
    });
  });

  it('reports nothing when head matches base', () => {
    const base = parseMigrationTree(treeOutput);
    expect(findMutatedMigrations(base, base)).toEqual({
      modified: [],
      deleted: [],
    });
  });
});

describe('findMisdatedMigrations', () => {
  it('flags migrations dated at or before the latest existing one', () => {
    const added = [
      { name: '1500_late.sql', id: 1500, hash: 'a' },
      { name: '2000_same.sql', id: 2000, hash: 'b' },
      { name: '2500_ok.sql', id: 2500, hash: 'c' },
    ];
    expect(findMisdatedMigrations(added, 2000).map(m => m.name)).toEqual([
      '1500_late.sql',
      '2000_same.sql',
    ]);
  });
});

describe('findRiskyStatements', () => {
  it('flags DROP TABLE, DROP COLUMN, and RENAME statements', () => {
    expect(findRiskyStatements('ALTER TABLE x DROP COLUMN y;')).toEqual([
      'drops a column',
    ]);
    expect(findRiskyStatements('DROP TABLE x;')).toEqual(['drops a table']);
    expect(findRiskyStatements('ALTER TABLE x RENAME TO y;')).toEqual([
      'renames a table or column',
    ]);
    expect(findRiskyStatements('ALTER TABLE x RENAME COLUMN a TO b;')).toEqual([
      'renames a table or column',
    ]);
  });

  it('ignores additive statements and comments', () => {
    expect(findRiskyStatements('ALTER TABLE x ADD COLUMN y TEXT;')).toEqual([]);
    expect(
      findRiskyStatements('-- do not DROP TABLE here\nCREATE TABLE y (id);'),
    ).toEqual([]);
    expect(
      findRiskyStatements('/* DROP COLUMN in a block comment */ SELECT 1;'),
    ).toEqual([]);
  });
});
