import * as uuid from '../../platform/uuid';
import { FilterEntity } from '../../types/models/filter';
import {
  parseConditionsOrActions,
  serializeConditionsOrActions,
} from '../accounts/transaction-rules';
import { createApp } from '../app';
import * as db from '../db';
import { requiredFields } from '../models';
import { mutator } from '../mutators';
import { undoable } from '../undo';

let app = createApp();

export const filterModel = {
  validate(filter, { update }: { update?: boolean } = {}) {
    requiredFields('filters', filter, ['conditions'], update);

    return filter;
  },

  toJS(row) {
    let { conditions, conditions_op, actions, ...fields } = row;
    return {
      ...fields,
      conditions: parseConditionsOrActions(conditions),
    };
  },

  fromJS(rule) {
    let { conditions, ...row } = rule;
    if (Array.isArray(conditions)) {
      row.conditions = serializeConditionsOrActions(conditions);
    }
    return row;
  },
};

export async function checkIfFilterExists(name, filterId) {
  let idForName = await db.first('SELECT id from filters WHERE name = ?', [
    name,
  ]);

  if (idForName == null) {
    return false;
  }
  if (filterId) {
    return idForName.id !== filterId;
  }
  return true;
}

export async function createFilter(
  filter: Omit<FilterEntity, 'tombstone'> = { conditions: [] },
) {
  let filterId = filter.id || uuid.v4Sync();

  if (filter.name) {
    if (await checkIfFilterExists(filter.name, filterId)) {
      throw new Error('Cannot create filters with the same name');
    }
  } else {
    filter.name = undefined;
  }

  // Create the rule here based on the info
  await db.insertWithSchema('filters', {
    ...filter,
    id: filterId,
  });

  return filterId;
}

export async function updateFilter({
  filter,
}: {
  filter: Omit<Partial<FilterEntity>, 'id' | 'tombstone'>;
}) {
  if (filter.name) {
    if (await checkIfFilterExists(filter.name, filter.id)) {
      throw new Error('There is already a filter with this name');
    }
  } else {
    filter.name = undefined;
  }

  // We need the rule if there are conditions
  let oldFilter;

  // This must be outside the `batchMessages` call because we change
  // and then read data
  if (conditions) {
    // We need to get the full rule to merge in the updated
    // conditions
    rule = await getRuleForSchedule(schedule.id);

    if (rule == null) {
      // In the edge case that a rule gets corrupted (either by a bug in
      // the system or user messing with their data), don't crash. We
      // generate a new rule because schedules have to have a rule
      // attached to them.
      rule = await fixRuleForSchedule(schedule.id);
    }
  }

  await batchMessages(async () => {
    if (conditions) {
      let oldConditions = rule.serialize().conditions;
      let newConditions = updateConditions(oldConditions, conditions);

      await updateRule({ id: rule.id, conditions: newConditions });

      // Annoyingly, sometimes it has `type` and sometimes it doesn't
      let stripType = ({ type, ...fields }) => fields;

      // Update `next_date` if the user forced it, or if the account
      // or date changed. We check account because we don't update
      // schedules automatically for closed account, and the user
      // might switch accounts from a closed one
      if (
        resetNextDate ||
        !deepEqual(
          oldConditions.find(c => c.field === 'account'),
          oldConditions.find(c => c.field === 'account'),
        ) ||
        !deepEqual(
          stripType(oldConditions.find(c => c.field === 'date') || {}),
          stripType(newConditions.find(c => c.field === 'date') || {}),
        )
      ) {
        await setNextDate({
          id: schedule.id,
          conditions: newConditions,
          reset: true,
        });
      }
    } else if (resetNextDate) {
      await setNextDate({ id: schedule.id, reset: true });
    }

    await db.updateWithSchema('schedules', schedule);
  });
}

export async function deleteSchedule({ id }) {
  let { data: ruleId } = await aqlQuery(
    q('schedules').filter({ id }).calculate('rule'),
  );

  await batchMessages(async () => {
    await db.delete_('rules', ruleId);
    await db.delete_('schedules', id);
  });
}

export async function skipNextDate({ id }) {
  return setNextDate({
    id,
    start: nextDate => {
      return d.addDays(parseDate(nextDate), 1);
    },
  });
}

app.method('filter/create', mutator(undoable(createFilter)));
app.method('filter/update', mutator(undoable(updateFilter)));
app.method('filter/delete', mutator(undoable(deleteFilter)));

export default app;
