import { Diff } from '../../shared/util';
import { PayeeEntity, RuleEntity } from '../../types/models';
import { createApp } from '../app';
import * as db from '../db';
import { payeeModel } from '../models';
import { mutator } from '../mutators';
import { batchMessages } from '../sync';
import * as rules from '../transactions/transaction-rules';
import { undoable } from '../undo';

export type PayeesHandlers = {
  'payee-create': typeof createPayee;
  'common-payees-get': typeof getCommonPayees;
  'payees-get': typeof getPayees;
  'payees-get-orphaned': typeof getOrphanedPayees;
  'payees-get-rule-counts': typeof getPayeeRuleCounts;
  'payees-merge': typeof mergePayees;
  'payees-batch-change': typeof batchChangePayees;
  'payees-check-orphaned': typeof checkOrphanedPayees;
  'payees-get-rules': typeof getPayeeRules;
};

export const app = createApp<PayeesHandlers>();
app.method('payee-create', mutator(undoable(createPayee)));
app.method('common-payees-get', getCommonPayees);
app.method('payees-get', getPayees);
app.method('payees-get-orphaned', getOrphanedPayees);
app.method('payees-get-rule-counts', getPayeeRuleCounts);
app.method(
  'payees-merge',
  mutator(
    undoable(mergePayees, args => ({
      mergeIds: args.mergeIds,
      targetId: args.targetId,
    })),
  ),
);
app.method('payees-batch-change', mutator(undoable(batchChangePayees)));
app.method('payees-check-orphaned', checkOrphanedPayees);
app.method('payees-get-rules', getPayeeRules);

async function createPayee({ name }: { name: PayeeEntity['name'] }) {
  return db.insertPayee({ name });
}

async function getCommonPayees(): Promise<PayeeEntity[]> {
  // TODO: Update to an AQL query. Server must return AQL entities not the raw DB data.
  return (await db.getCommonPayees()).map(payeeModel.fromDb);
}

async function getPayees(): Promise<PayeeEntity[]> {
  // TODO: Update to an AQL query. Server must return AQL entities not the raw DB data.
  return (await db.getPayees()).map(payeeModel.fromDb);
}

async function getOrphanedPayees(): Promise<Array<Pick<PayeeEntity, 'id'>>> {
  return await db.syncGetOrphanedPayees();
}

async function getPayeeRuleCounts() {
  const payeeCounts: Record<PayeeEntity['id'], number> = {};

  rules.iterateIds(rules.getRules(), 'payee', (rule, id) => {
    if (payeeCounts[id] == null) {
      payeeCounts[id] = 0;
    }
    payeeCounts[id]++;
  });

  return payeeCounts;
}

async function mergePayees({
  targetId,
  mergeIds,
}: {
  targetId: PayeeEntity['id'];
  mergeIds: Array<PayeeEntity['id']>;
}) {
  await db.mergePayees(targetId, mergeIds);
}

async function batchChangePayees({
  added,
  deleted,
  updated,
}: Partial<Diff<PayeeEntity>>): Promise<void> {
  await batchMessages(async () => {
    if (deleted) {
      await Promise.all(
        deleted.map(p => ({ id: p.id })).map(p => db.deletePayee(p)),
      );
    }

    if (added) {
      await Promise.all(
        added.map(p => payeeModel.toDb(p)).map(p => db.insertPayee(p)),
      );
    }

    if (updated) {
      await Promise.all(
        updated
          .map(p => payeeModel.toDb(p as PayeeEntity, { update: true }))
          .map(p => db.updatePayee(p)),
      );
    }
  });
}

async function checkOrphanedPayees({
  ids,
}: {
  ids: Array<PayeeEntity['id']>;
}): Promise<Array<PayeeEntity['id']>> {
  const orphaned = new Set(await db.getOrphanedPayees());
  return ids.filter(id => orphaned.has(id));
}

async function getPayeeRules({
  id,
}: {
  id: PayeeEntity['id'];
}): Promise<RuleEntity[]> {
  return rules.getRulesForPayee(id).map(rule => rule.serialize());
}
