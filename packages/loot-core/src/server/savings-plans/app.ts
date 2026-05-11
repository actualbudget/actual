import { createApp } from '#server/app';
import * as db from '#server/db';
import { mutator } from '#server/mutators';
import { undoable } from '#server/undo';
import type { SavingsPlanEntity } from '#types/models';

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
  const savingsPlan = {
    ...plan,
    name: plan.name.trim(),
    status: plan.status ?? 'active',
  };

  const id = await db.insertSavingsPlan({
    name: savingsPlan.name,
    target_amount: savingsPlan.target_amount,
    saved_amount: savingsPlan.saved_amount,
    months: savingsPlan.months,
    start_month: savingsPlan.start_month,
    status: savingsPlan.status,
  });

  return { id, ...savingsPlan };
}

async function updateSavingsPlan(
  plan: Partial<SavingsPlanEntity> & Pick<SavingsPlanEntity, 'id'>,
): Promise<Partial<SavingsPlanEntity>> {
  const savingsPlan = {
    ...plan,
    ...(plan.name != null ? { name: plan.name.trim() } : {}),
  };

  await db.updateSavingsPlan(savingsPlan);
  return savingsPlan;
}

async function deleteSavingsPlan(
  arg: Pick<SavingsPlanEntity, 'id'>,
): Promise<SavingsPlanEntity['id']> {
  await db.deleteSavingsPlan(arg.id);
  return arg.id;
}
