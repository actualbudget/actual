import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openDatabase } from './db';
import type { WrappedDatabase } from './db';

describe('WrappedDatabase', () => {
  let db: WrappedDatabase;

  beforeEach(() => {
    db = openDatabase(':memory:');
    db.exec('CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT)');
  });

  afterEach(() => {
    db.close();
  });

  it('reports the changes and insert id of a mutation', () => {
    const result = db.mutate('INSERT INTO items (name) VALUES (?)', ['a']);

    expect(result.changes).toBe(1);
    expect(result.insertId).toBe(1);
  });

  it('returns every matching row from all', () => {
    db.mutate('INSERT INTO items (name) VALUES (?), (?)', ['a', 'b']);

    expect(db.all('SELECT name FROM items ORDER BY name')).toEqual([
      { name: 'a' },
      { name: 'b' },
    ]);
  });

  it('returns the first row, or null when nothing matches', () => {
    db.mutate('INSERT INTO items (name) VALUES (?)', ['a']);

    expect(db.first('SELECT name FROM items WHERE name = ?', ['a'])).toEqual({
      name: 'a',
    });
    expect(db.first('SELECT name FROM items WHERE name = ?', ['b'])).toBeNull();
  });

  it('returns the callback result from a transaction', () => {
    expect(db.transaction(() => 'done')).toBe('done');
  });

  it('rolls back a transaction when the callback throws', () => {
    expect(() =>
      db.transaction(() => {
        db.mutate('INSERT INTO items (name) VALUES (?)', ['a']);
        throw new Error('boom');
      }),
    ).toThrow('boom');

    expect(db.all('SELECT * FROM items')).toEqual([]);
  });
});
