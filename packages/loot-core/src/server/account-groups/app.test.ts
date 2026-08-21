import { app } from '#server/account-groups/app';
import { app as accountsApp } from '#server/accounts/app';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
});

describe('account groups app', () => {
  describe('account-group-create / account-groups-get', () => {
    it('creates groups and returns them in creation order', async () => {
      const savingsId = await app.handlers['account-group-create']({
        name: 'Savings',
      });
      const currentId = await app.handlers['account-group-create']({
        name: 'Current Accounts',
      });

      const groups = await app.handlers['account-groups-get']();
      expect(groups.map(group => group.id)).toEqual([savingsId, currentId]);
      expect(groups.map(group => group.name)).toEqual([
        'Savings',
        'Current Accounts',
      ]);
      expect(groups[0].sort_order).toBeLessThan(groups[1].sort_order);
    });

    it('rejects duplicate names case-insensitively', async () => {
      await app.handlers['account-group-create']({ name: 'Savings' });

      await expect(
        app.handlers['account-group-create']({ name: 'savings' }),
      ).rejects.toThrow(/already exists/);
    });

    it('allows reusing the name of a deleted group', async () => {
      const id = await app.handlers['account-group-create']({
        name: 'Savings',
      });
      await app.handlers['account-group-delete']({ id });

      const newId = await app.handlers['account-group-create']({
        name: 'Savings',
      });
      expect(newId).not.toBe(id);

      const groups = await app.handlers['account-groups-get']();
      expect(groups.map(group => group.id)).toEqual([newId]);
    });
  });

  describe('account-group-update', () => {
    it('renames a group', async () => {
      const id = await app.handlers['account-group-create']({
        name: 'Savings',
      });
      await app.handlers['account-group-update']({ id, name: 'ISAs' });

      const groups = await app.handlers['account-groups-get']();
      expect(groups.map(group => group.name)).toEqual(['ISAs']);
    });

    it('rejects renaming to an existing name but allows renaming itself', async () => {
      await app.handlers['account-group-create']({ name: 'Savings' });
      const id = await app.handlers['account-group-create']({
        name: 'Cards',
      });

      await expect(
        app.handlers['account-group-update']({ id, name: 'SAVINGS' }),
      ).rejects.toThrow(/already exists/);

      await app.handlers['account-group-update']({ id, name: 'CARDS' });
      const groups = await app.handlers['account-groups-get']();
      expect(groups.map(group => group.name)).toEqual(['Savings', 'CARDS']);
    });
  });

  describe('account-group-move', () => {
    it('moves a group before a target and appends with a null target', async () => {
      const aId = await app.handlers['account-group-create']({ name: 'A' });
      const bId = await app.handlers['account-group-create']({ name: 'B' });
      const cId = await app.handlers['account-group-create']({ name: 'C' });

      await app.handlers['account-group-move']({ id: cId, targetId: aId });
      let groups = await app.handlers['account-groups-get']();
      expect(groups.map(group => group.id)).toEqual([cId, aId, bId]);

      await app.handlers['account-group-move']({ id: cId, targetId: null });
      groups = await app.handlers['account-groups-get']();
      expect(groups.map(group => group.id)).toEqual([aId, bId, cId]);
    });
  });

  describe('account-group-delete', () => {
    it('tombstones the group and clears member account refs only', async () => {
      const cardsId = await app.handlers['account-group-create']({
        name: 'Cards',
      });
      const otherId = await app.handlers['account-group-create']({
        name: 'Other',
      });

      await db.insertAccount({ id: 'acct1', name: 'Amex' });
      await db.insertAccount({ id: 'acct2', name: 'Checking' });
      await accountsApp.handlers['account-update']({
        id: 'acct1',
        name: 'Amex',
        account_group_id: cardsId,
      });
      await accountsApp.handlers['account-update']({
        id: 'acct2',
        name: 'Checking',
        account_group_id: otherId,
      });

      await app.handlers['account-group-delete']({ id: cardsId });

      const groups = await app.handlers['account-groups-get']();
      expect(groups.map(group => group.id)).toEqual([otherId]);

      const accounts = await accountsApp.handlers['accounts-get']();
      expect(
        accounts.find(account => account.id === 'acct1')?.account_group_id,
      ).toBeNull();
      expect(
        accounts.find(account => account.id === 'acct2')?.account_group_id,
      ).toBe(otherId);
    });
  });

  describe('account-update', () => {
    it('persists, keeps and clears the account group', async () => {
      const groupId = await app.handlers['account-group-create']({
        name: 'Savings',
      });
      await db.insertAccount({ id: 'acct1', name: 'Marcus' });

      await accountsApp.handlers['account-update']({
        id: 'acct1',
        name: 'Marcus',
        account_group_id: groupId,
      });
      let accounts = await accountsApp.handlers['accounts-get']();
      expect(accounts[0].account_group_id).toBe(groupId);

      await accountsApp.handlers['account-update']({
        id: 'acct1',
        name: 'Marcus Savings',
      });
      accounts = await accountsApp.handlers['accounts-get']();
      expect(accounts[0].name).toBe('Marcus Savings');
      expect(accounts[0].account_group_id).toBe(groupId);

      await accountsApp.handlers['account-update']({
        id: 'acct1',
        name: 'Marcus Savings',
        account_group_id: null,
      });
      accounts = await accountsApp.handlers['accounts-get']();
      expect(accounts[0].account_group_id).toBeNull();
    });
  });
});
