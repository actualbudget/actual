import { createApp } from '#server/app';
import * as db from '#server/db';
import { mutator } from '#server/mutators';
import { undoable } from '#server/undo';
import type { AccountGroupEntity } from '#types/models';

export type AccountGroupsHandlers = {
  'account-groups-get': typeof getAccountGroups;
  'account-group-create': typeof createAccountGroup;
  'account-group-update': typeof updateAccountGroup;
  'account-group-delete': typeof deleteAccountGroup;
  'account-group-move': typeof moveAccountGroup;
};

export const app = createApp<AccountGroupsHandlers>();
app.method('account-groups-get', getAccountGroups);
app.method('account-group-create', mutator(undoable(createAccountGroup)));
app.method('account-group-update', mutator(undoable(updateAccountGroup)));
app.method('account-group-delete', mutator(undoable(deleteAccountGroup)));
app.method('account-group-move', mutator(undoable(moveAccountGroup)));

async function getAccountGroups(): Promise<AccountGroupEntity[]> {
  const groups = await db.getAccountGroups();
  return groups.map(group => ({
    id: group.id,
    name: group.name,
    sort_order: group.sort_order,
  }));
}

async function createAccountGroup({
  name,
}: Pick<AccountGroupEntity, 'name'>): Promise<AccountGroupEntity['id']> {
  return db.insertAccountGroup({ name });
}

async function updateAccountGroup(
  group: Pick<AccountGroupEntity, 'id' | 'name'>,
): Promise<void> {
  await db.updateAccountGroup(group);
}

async function deleteAccountGroup({
  id,
}: Pick<AccountGroupEntity, 'id'>): Promise<AccountGroupEntity['id']> {
  await db.deleteAccountGroup({ id });
  return id;
}

async function moveAccountGroup({
  id,
  targetId,
}: {
  id: AccountGroupEntity['id'];
  targetId: AccountGroupEntity['id'] | null;
}): Promise<void> {
  await db.moveAccountGroup(id, targetId);
}
