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
    const { conditions, conditions_op, ...fields } = row;
    return {
      ...fields,
      conditionsOp: conditions_op,
      conditions: parseConditionsOrActions(conditions),
    };
  },

  fromJS(report) {
    const { conditionsOp, ...row } = report;
    if (conditionsOp) {
      row.conditions_op = conditionsOp;
    }
    return row;
  },
};

async function reportNameExists(name, reportId, newItem) {
  const idForName = await db.first(
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

async function createReport(report) {
  const reportId = uuidv4();
  const item = {
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
  const item = {
    ...report.state,
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

// Expose functions to the client
export const app = createApp<ReportsHandlers>();

app.method('report-create', mutator(createReport));
app.method('report-update', mutator(updateReport));
app.method('report-delete', mutator(undoable(deleteReport)));
