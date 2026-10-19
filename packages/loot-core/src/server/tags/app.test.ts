import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { app } from '#server/tags/app';

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
});

async function insertTransaction(notes: string) {
  return await db.insertTransaction({
    account: 'account-1',
    date: '2024-01-01',
    amount: -1000,
    notes,
  });
}

async function getNotes(id: string) {
  const transaction = await db.first<{ notes: string }>(
    'SELECT notes FROM transactions WHERE id = ?',
    [id],
  );
  return transaction?.notes;
}

describe('tags app', () => {
  describe('tags-rename', () => {
    beforeEach(async () => {
      await db.insertAccount({ id: 'account-1', name: 'Account 1' });
    });

    it('renames the tag and rewrites it in transaction notes', async () => {
      const id = await db.insertTag({
        tag: 'Reimbursable',
        color: null,
        description: null,
      });
      const matching = await insertTransaction('Lunch #Reimbursable');
      const partial = await insertTransaction('Dinner #ReimbursableLater');

      await app.handlers['tags-rename']({ id, tag: '  ToBeReimbursed  ' });

      expect(await db.getTags()).toEqual([
        expect.objectContaining({ id, tag: 'ToBeReimbursed' }),
      ]);
      expect(await getNotes(matching)).toBe('Lunch #ToBeReimbursed');
      expect(await getNotes(partial)).toBe('Dinner #ReimbursableLater');
    });

    it('rejects an invalid name', async () => {
      const id = await db.insertTag({
        tag: 'Food',
        color: null,
        description: null,
      });

      await expect(
        app.handlers['tags-rename']({ id, tag: 'two words' }),
      ).rejects.toThrow('Invalid tag name');
    });

    it('rejects renaming onto an existing tag', async () => {
      const id = await db.insertTag({
        tag: 'Food',
        color: null,
        description: null,
      });
      await db.insertTag({
        tag: 'Groceries',
        color: null,
        description: null,
      });

      await expect(
        app.handlers['tags-rename']({ id, tag: 'Groceries' }),
      ).rejects.toThrow('A tag with that name already exists');
    });

    it('rejects renaming onto a deleted tag', async () => {
      const id = await db.insertTag({
        tag: 'Food',
        color: null,
        description: null,
      });
      const deletedId = await db.insertTag({
        tag: 'Groceries',
        color: null,
        description: null,
      });
      await app.handlers['tags-delete']({ id: deletedId });

      await expect(
        app.handlers['tags-rename']({ id, tag: 'Groceries' }),
      ).rejects.toThrow('A tag with that name already exists');
    });

    it('rejects an unknown tag', async () => {
      await expect(
        app.handlers['tags-rename']({ id: 'missing', tag: 'Food' }),
      ).rejects.toThrow('Tag not found');
    });
  });
});

it('discovers unique tags using exact hashtag boundaries', async () => {
  const account = await db.insertAccount({ name: 'Checking' });
  const existingId = await db.insertTag({ tag: 'red' });
  for (const notes of [
    '#red#circle #red ##ignored',
    '#circle #Red #$splurge',
  ]) {
    await db.insertTransaction({
      date: '2026-01-01',
      account,
      notes,
      amount: -100,
    });
  }

  const tags = await app.handlers['tags-discover']();

  expect(tags.map(tag => tag.tag).sort()).toEqual([
    '$splurge',
    'Red',
    'circle',
    'red',
  ]);
  expect(tags.find(tag => tag.tag === 'red')?.id).toBe(existingId);
  expect(await db.getTags()).toHaveLength(4);
});
