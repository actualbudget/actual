import * as uuid from '../../platform/uuid';
import {
  parseConditionsOrActions,
  serializeConditionsOrActions,
} from '../accounts/transaction-rules';
import { createApp } from '../app';
import * as db from '../db';
import { requiredFields } from '../models';
import { mutator } from '../mutators';
import { batchMessages } from '../sync';
import { undoable } from '../undo';

let app = createApp();

export const filterModel = {
  validate(filter, { update }: { update?: boolean } = {}) {
    requiredFields('transaction_filters', filter, ['conditions'], update);

    return filter;
  },

  toJS(row) {
    let { conditions, conditions_op, ...fields } = row;
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
  let idForName = await db.first(
    'SELECT id from transaction_filters WHERE tombstone = 0 AND name = ?',
    [name],
  );

  if (idForName == null) {
    return false;
  }
  if (filterId) {
    return idForName.id !== filterId;
  }
  return true;
}

export async function createFilter(filter) {
  let filterId = uuid.v4Sync();

  if (filter.name) {
    if (await checkIfFilterExists(filter.name, filterId)) {
      throw new Error('Cannot create filters with the same name');
    }
  } else {
    //filter.name = null;
    throw new Error('Filters must be named');
  }

  // Create the rule here based on the info
  await db.insertWithSchema('transaction_filters', {
    name: filter.name,
    conditions: filter.conditions,
    conditions_op: filter.conditionsOp,
    id: filterId,
  });

  return filterId;
}

export async function updateFilter({ filter }: { filter }) {
  if (filter.name) {
    if (await checkIfFilterExists(filter.name, filter.id)) {
      throw new Error('There is already a filter with this name');
    }
  } else {
    filter.name = undefined;
  }

  await db.updateWithSchema('transaction_filters', filter);
}

export async function deleteFilter({ id }) {
  await batchMessages(async () => {
    await db.delete_('transaction_filters', id);
  });
}

app.method('filter/create', mutator(undoable(createFilter)));
app.method('filter/update', mutator(undoable(updateFilter)));
app.method('filter/delete', mutator(undoable(deleteFilter)));

export default app;
