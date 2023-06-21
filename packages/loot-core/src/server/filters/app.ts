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
export function ConditionExists(item, filters, newItem) {
  let { conditions, conditionsOp } = item;
  let condCheck = [];
  let fCondCheck = false;
  let fCondFound;

  filters.map(filter => {
    if (
      !fCondCheck &&
      //If conditions.length equals 1 then ignore conditionsOp
      (conditions.length === 1 ? true : filter.conditionsOp === conditionsOp) &&
      !filter.tombstone &&
      filter.conditions.length === conditions.length
    ) {
      fCondCheck = false;
      conditions.map((cond, i) => {
        condCheck[i] =
          filter.conditions.filter(fcond => {
            return (
              cond.value === fcond.value &&
              cond.op === fcond.op &&
              cond.field === fcond.field
            );
          }).length > 0;
        fCondCheck = (i === 0 ? true : fCondCheck) && condCheck[i];
        return true;
      });
      fCondFound = fCondCheck && condCheck[conditions.length - 1] && filter;
    }
    return true;
  });

  condCheck = [];

  if (!newItem) {
    return fCondFound
      ? fCondFound.id !== item.id
        ? fCondFound.name
        : false
      : false;
  }
  return fCondFound ? fCondFound.name : false;
}

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

  if (item.conditions.length > 0) {
    let condExists = ConditionExists(item, filter.filters, true);
    if (condExists) {
      throw new Error(
        'Duplicate filter warning: conditions already exist. Filter name: ' +
          condExists,
      );
    }
  } else {
    throw new Error('Filters must include conditions');
  }

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

  if (item.conditions.length > 0) {
    let condExists = ConditionExists(item, filter.filters, false);
    if (condExists) {
      throw new Error(
        'Duplicate filter warning: conditions already exist. Filter name: ' +
          condExists,
      );
    }
  } else {
    throw new Error('Filters must include conditions');
  }

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
