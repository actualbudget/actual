import { v4 as uuidv4 } from 'uuid';

import { parseConditionsOrActions } from '../accounts/transaction-rules';
import { createApp } from '../app';
import * as db from '../db';
import { requiredFields } from '../models';
import { mutator } from '../mutators';
import { undoable } from '../undo';

import { ReportsHandlers } from './types/handlers';

const reportModel = {
  validate(report, { update }: { update?: boolean } = {}) {
    requiredFields('reports', report, ['conditions'], update);

    if (!update || 'conditionsOp' in report) {
      if (!['and', 'or'].includes(report.conditionsOp)) {
        throw new Error('Invalid filter conditionsOp: ' + report.conditionsOp);
      }
    }

    return report;
  },

  toJS(row) {
    let { conditions, conditions_op, ...fields } = row;
    return {
      ...fields,
      conditionsOp: conditions_op,
      conditions: parseConditionsOrActions(conditions),
    };
  },

  fromJS(report) {
    let { conditionsOp, ...row } = report;
    if (conditionsOp) {
      row.conditions_op = conditionsOp;
    }
    return row;
  },
};

async function reportNameExists(name, reportId, newItem) {
  let idForName = await db.first(
    'SELECT id from reports WHERE tombstone = 0 AND name = ?',
    [name],
  );

  if (idForName === null) {
    return false;
  }
  if (!newItem) {
    return idForName.id !== reportId;
  }
  return true;
}

//TODO: Possible to simplify this?
//use filters and maps
function conditionExists(item, filters, newItem) {
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

async function createReport(report) {
  let reportId = uuidv4();
  let item = {
    ...report.state,
    id: reportId,
  };

  if (item.name) {
    if (await reportNameExists(item.name, item.id, true)) {
      throw new Error('There is already a report named ' + item.name);
    }
  } else {
    throw new Error('Report name is required');
  }

  // Create the report here based on the info
  await db.insertWithSchema('reports', reportModel.fromJS(item));

  return reportId;
}

async function updateReport(report) {
  let item = {
    id: report.state.id,
    conditions: report.state.conditions,
    conditionsOp: report.state.conditionsOp,
    name: report.state.name,
  };
  if (item.name) {
    if (await reportNameExists(item.name, item.id, false)) {
      throw new Error('There is already a report named ' + item.name);
    }
  } else {
    throw new Error('Report name is required');
  }

  await db.insertWithSchema('reports', reportModel.fromJS(item));
}

async function deleteReport(id) {
  await db.delete_('reports', id);
}

let app = createApp<ReportsHandlers>();

app.method('report-create', mutator(createReport));
app.method('report-update', mutator(updateReport));
app.method('report-delete', mutator(undoable(deleteReport)));

export default app;
