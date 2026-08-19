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
      const untagged = await insertTransaction('Coffee');

      await app.handlers['tags-rename']({ id, tag: 'ToBeReimbursed' });

      expect(await db.getTags()).toEqual([
        expect.objectContaining({ id, tag: 'ToBeReimbursed' }),
      ]);
      expect(await getNotes(matching)).toBe('Lunch #ToBeReimbursed');
      expect(await getNotes(partial)).toBe('Dinner #ReimbursableLater');
      expect(await getNotes(untagged)).toBe('Coffee');
    });

    it('trims the new name', async () => {
      const id = await db.insertTag({
        tag: 'Food',
        color: null,
        description: null,
      });
      const transaction = await insertTransaction('Lunch #Food today');

      await app.handlers['tags-rename']({ id, tag: '  Groceries  ' });

      expect(await getNotes(transaction)).toBe('Lunch #Groceries today');
    });

    it('is a no-op when the name is unchanged', async () => {
      const id = await db.insertTag({
        tag: 'Food',
        color: null,
        description: null,
      });
      const transaction = await insertTransaction('Lunch #Food');

      await app.handlers['tags-rename']({ id, tag: 'Food' });

      expect(await getNotes(transaction)).toBe('Lunch #Food');
    });

    it('rejects names containing whitespace or "#"', async () => {
      const id = await db.insertTag({
        tag: 'Food',
        color: null,
        description: null,
      });

      await expect(
        app.handlers['tags-rename']({ id, tag: 'two words' }),
      ).rejects.toThrow('Invalid tag name');
      await expect(
        app.handlers['tags-rename']({ id, tag: '#Food' }),
      ).rejects.toThrow('Invalid tag name');
      await expect(
        app.handlers['tags-rename']({ id, tag: '' }),
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

    it('rejects an unknown tag', async () => {
      await expect(
        app.handlers['tags-rename']({ id: 'missing', tag: 'Food' }),
      ).rejects.toThrow('Tag not found');
    });
  });
});
