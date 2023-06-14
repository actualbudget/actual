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

    if (!update || 'conditionsOp' in filter) {
      if (!['and', 'or'].includes(filter.conditionsOp)) {
        throw new Error('Invalid filter conditionsOp: ' + filter.conditionsOp);
      }
    }

    return filter;
  },

  toJS(row) {
    let { conditions, conditions_op, ...fields } = row;
    return {
      ...fields,
      conditionsOp: conditions_op,
      conditions: parseConditionsOrActions(conditions),
    };
  },

  fromJS(filter) {
    let { conditions, conditionsOp, ...row } = filter;
    if (conditionsOp) {
      row.conditions_op = conditionsOp;
    }
    if (Array.isArray(conditions)) {
      row.conditions = serializeConditionsOrActions(conditions);
    }
    return row;
  },
};

export async function filterNameExists(name, filterId) {
  let idForName = await db.first(
    'SELECT id from transaction_filters WHERE tombstone = 0 AND name = ?',
    [name],
  );

  if (idForName === null) {
    return false;
  }
  if (filterId) {
    return idForName.id !== filterId;
  }
  return true;
}

//TODO: Possible to simplify this?
export function ConditionExists(filter) {
  let {conditions, conditionsOp, filters} = filter;
  let condCheck = [];
  let fCondCheck = false;
  let fCondName = '';

  filters.map(filter => {
    fCondCheck = false;
    if (
      !condCheck[conditions.length - 1] &&
      filter.tombstone == '0' &&
      filter.conditions.length == conditions.length &&
      filter.conditionsOp == conditionsOp
    ) {
      filter.conditions.map(fcond => {
        if (!fCondCheck) {
          conditions.map((cond, i) => {
            condCheck[i] = false;
            if (
              !condCheck[i - 1] &&
              cond.field == fcond.field &&
              cond.op == fcond.op &&
              cond.value == fcond.value
            ) {
              condCheck[i] = true;
            }
            fCondCheck = condCheck[i];
          });
        }
      });
      fCondName = condCheck[conditions.length - 1] && filter.name;
    }
  });

  return fCondName;
}

export async function createFilter(filter) {
  let filterId = uuid.v4Sync();

  if (filter.name) {
    if (await filterNameExists(filter.name, filterId)) {
      throw new Error('Cannot create filters with the same name');
    }
  } else {
    //filter.name = null;
    throw new Error('Filters must be named');
  }

  if (filter.conditions) {
    let condExists = ConditionExists(filter);
    if (condExists) {
      throw new Error(
        'Duplicate filter warning: conditions already exist. Filter name: ' +
          condExists,
      );
    }
  }

  // Create the filter here based on the info
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
    if (await filterNameExists(filter.name, filter.id)) {
      throw new Error('There is already a filter with this name');
    }
  } else {
    filter.name = undefined;
  }

  await db.updateWithSchema('transaction_filters', filterModel.toJS(filter));
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
