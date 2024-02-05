import { v4 as uuidv4 } from 'uuid';

import {
  type CustomReportData,
  type CustomReportEntity,
} from '../../types/models';
import { createApp } from '../app';
import * as db from '../db';
import { requiredFields } from '../models';
import { mutator } from '../mutators';
import { undoable } from '../undo';

import { ReportsHandlers } from './types/handlers';

const reportModel = {
  validate(report: CustomReportEntity, { update }: { update?: boolean } = {}) {
    requiredFields('reports', report, ['conditionsOp'], update);

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
    };
  },

  fromJS(report: CustomReportEntity) {
    const { conditionsOp, ...row }: CustomReportData = report;
    if (conditionsOp) {
      row.conditions_op = conditionsOp;
    }
    return row;
  },
};

async function reportNameExists(
  name: string | undefined,
  reportId: string | undefined,
  newItem: boolean,
) {
  if (!name) {
    throw new Error('Report name is required');
  }

  if (!reportId) {
    throw new Error('Report recall error');
  }

  const idForName: { id: string } = await db.first(
    'SELECT id from reports WHERE tombstone = 0 AND name = ?',
    [name],
  );

  if (!newItem && idForName.id !== reportId) {
    throw new Error('There is already a report named ' + name);
  }
}

async function createReport(report: CustomReportEntity) {
  const reportId = uuidv4();
  const item: CustomReportData = {
    ...report,
    id: reportId,
  };

  reportNameExists(item.name, item.id, true);

  // Create the report here based on the info
  await db.insertWithSchema('reports', reportModel.fromJS(item));

  return reportId;
}

async function updateReport(item: CustomReportEntity) {
  reportNameExists(item.name, item.id, false);

  await db.insertWithSchema('reports', reportModel.fromJS(item));
}

async function deleteReport(id: string) {
  await db.delete_('reports', id);
}

// Expose functions to the client
export const app = createApp<ReportsHandlers>();

app.method('report/create', mutator(undoable(createReport)));
app.method('report/update', mutator(undoable(updateReport)));
app.method('report/delete', mutator(undoable(deleteReport)));
