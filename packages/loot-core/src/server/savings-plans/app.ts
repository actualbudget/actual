import type { SavingsPlanEntity } from '../../types/models';
import { createApp } from '../app';
import * as db from '../db';
import { mutator } from '../mutators';
import { undoable } from '../undo';

export type SavingsPlansHandlers = {
  'savings-plans-get': typeof getSavingsPlans;
  'savings-plans-create': typeof createSavingsPlan;
  'savings-plans-update': typeof updateSavingsPlan;
  'savings-plans-delete': typeof deleteSavingsPlan;
};

export const app = createApp<SavingsPlansHandlers>();
app.method('savings-plans-get', getSavingsPlans);
app.method('savings-plans-create', mutator(undoable(createSavingsPlan)));
app.method('savings-plans-update', mutator(undoable(updateSavingsPlan)));
app.method('savings-plans-delete', mutator(undoable(deleteSavingsPlan)));

async function getSavingsPlans(): Promise<SavingsPlanEntity[]> {
  return await db.getSavingsPlans();
}

async function createSavingsPlan(
  plan: Omit<SavingsPlanEntity, 'id'>,
): Promise<SavingsPlanEntity> {
  const id = await db.insertSavingsPlan({
    name: plan.name.trim(),
    target_amount: plan.target_amount,
    saved_amount: plan.saved_amount,
    months: plan.months,
    start_month: plan.start_month,
    status: plan.status ?? 'active',
  });

  return { id, ...plan };
}

async function updateSavingsPlan(
  plan: Partial<SavingsPlanEntity> & Pick<SavingsPlanEntity, 'id'>,
): Promise<Partial<SavingsPlanEntity>> {
  await db.updateSavingsPlan(plan);
  return plan;
}

async function deleteSavingsPlan(
  arg: Pick<SavingsPlanEntity, 'id'>,
): Promise<SavingsPlanEntity['id']> {
  await db.deleteSavingsPlan(arg.id);
  return arg.id;
}
