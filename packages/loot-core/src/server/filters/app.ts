import * as uuid from '../../platform/uuid';
import { parseConditionsOrActions } from '../accounts/transaction-rules';
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
    let { conditionsOp, ...row } = filter;
    if (conditionsOp) {
      row.conditions_op = conditionsOp;
    }
    return row;
  },
};

export async function filterNameExists(name, filterId, newItem) {
  let idForName = await db.first(
    'SELECT id from transaction_filters WHERE tombstone = 0 AND name = ?',
    [name],
  );

  if (idForName === null) {
    return false;
  }
  if (!newItem) {
    return idForName.id !== filterId;
  }
  return true;
}

//TODO: Possible to simplify this?
//use filters and maps
/* export function ConditionExists(item, filters, newItem) {
  let { conditions, conditionsOp } = item;
  let condCheck = [];
  let fCondCheck = false;
  let fCondFound;

  filters.map(filter => {
    fCondCheck = false;
    if (
      !condCheck[conditions.length - 1] &&
      !filter.tombstone &&
      filter.conditions.length === conditions.length &&
      //Add: if conditions.length === 1 then ignore conditionsOp
      filter.conditionsOp === conditionsOp
    ) {
      filter.conditions.map(fcond => {
        if (!fCondCheck) {
          conditions.map((cond, i) => {
            condCheck[i] = false;
            if (
              !condCheck[i - 1] &&
              cond.field === fcond.field &&
              cond.op === fcond.op &&
              cond.value === fcond.value
            ) {
              condCheck[i] = true;
            }
            fCondCheck = condCheck[i];
          });
        }
      });
      fCondFound = condCheck[conditions.length - 1] && filter;
    }
  });

  condCheck = [];

  if (!newItem) {
    return fCondFound.id !== item.id && fCondFound.name;
  }
  return fCondFound.name;
} */

export async function createFilter(filter) {
  let filterId = uuid.v4Sync();
  let item = { ...filter.state, id: filterId };

  if (item.name) {
    if (await filterNameExists(item.name, item.id, true)) {
      throw new Error('Cannot create filters with the same name');
    }
  } else {
    throw new Error('Filters must be named');
  }

  /*   if (item.conditions) {
    let condExists = ConditionExists(item, filter.filters, true);
    if (condExists) {
      throw new Error(
        'Duplicate filter warning: conditions already exist. Filter name: ' +
          condExists,
      );
    }
  } */

  // Create the filter here based on the info
  await db.insertWithSchema('transaction_filters', filterModel.fromJS(item));

  return filterId;
}

export async function updateFilter(filter) {
  let item = filter.state;
  if (item.name) {
    if (await filterNameExists(item.name, item.id, false)) {
      throw new Error('There is already a filter with this name');
    }
  } else {
    throw new Error('Filters must be named');
  }

  /*   if (item.conditions) {
    let condExists = ConditionExists(item, filter.filters, false);
    if (condExists) {
      throw new Error(
        'Duplicate filter warning: conditions already exist. Filter name: ' +
          condExists,
      );
    }
  } */

  await db.updateWithSchema('transaction_filters', filterModel.fromJS(item));
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
