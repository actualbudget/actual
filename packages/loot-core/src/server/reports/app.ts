import { v4 as uuidv4 } from 'uuid';

import {
  type CustomReportData,
  type CustomReportEntity,
} from '../../types/models';
import { parseConditionsOrActions } from '../accounts/transaction-rules';
import { createApp } from '../app';
import * as db from '../db';
import { requiredFields } from '../models';
import { mutator } from '../mutators';
import { undoable } from '../undo';

import { ReportsHandlers } from './types/handlers';

const reportModel = {
  validate(report: CustomReportEntity, { update }: { update?: boolean } = {}) {
    requiredFields('reports', report, ['conditions'], update);

    if (!update || 'conditionsOp' in report) {
      if (!['and', 'or'].includes(report.conditionsOp)) {
        throw new Error('Invalid filter conditionsOp: ' + report.conditionsOp);
      }
    }

    return report;
  },

  toJS(row: CustomReportData) {
    return {
      ...row,
      conditionsOp: row.conditions_op,
      filters: parseConditionsOrActions(row.conditions),
    };
  },

  fromJS(report: CustomReportEntity) {
    const { filters, conditionsOp, ...row }: CustomReportData = report;
    if (conditionsOp) {
      row.conditions_op = conditionsOp;
      row.conditions = filters;
    }
    return row;
  },
};

async function reportNameExists(
  name: string,
  reportId: string,
  newItem: boolean,
) {
  const idForName: { id: string } = await db.first(
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

async function createReport(report: CustomReportEntity) {
  const reportId = uuidv4();
  const item: CustomReportData = {
    ...report,
    id: reportId,
  };

  if (!item.name) {
    throw new Error('Report name is required');
  }
  
  if (await reportNameExists(item.name, item.id, true)) {
    throw new Error('There is already a report named ' + item.name);
  }

  // Create the report here based on the info
  await db.insertWithSchema('reports', reportModel.fromJS(item));

  return reportId;
}

async function updateReport(report: CustomReportEntity) {
  const item: CustomReportData = {
    ...report,
  };
  if (item.name !== undefined) {
    if (await reportNameExists(item.name, item.id, false)) {
      throw new Error('There is already a report named ' + item.name);
    }
  } else {
    throw new Error('Report name is required');
  }

  await db.insertWithSchema('reports', reportModel.fromJS(item));
}

async function deleteReport(id: string) {
  await db.delete_('reports', id);
}

// Expose functions to the client
export const app = createApp<ReportsHandlers>();

app.method('report/create', mutator(createReport));
app.method('report/update', mutator(updateReport));
app.method('report/delete', mutator(undoable(deleteReport)));
