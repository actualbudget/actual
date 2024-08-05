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
    requiredFields('Report', report, ['conditionsOp'], update);

    if (!update || 'conditionsOp' in report) {
      if (!['and', 'or'].includes(report.conditionsOp)) {
        throw new Error('Invalid filter conditionsOp: ' + report.conditionsOp);
      }
    }

    return report;
  },

  toJS(row: CustomReportData) {
    return {
      id: row.id,
      name: row.name,
      startDate: row.start_date,
      endDate: row.end_date,
      isDateStatic: row.date_static === 1,
      dateRange: row.date_range,
      mode: row.mode,
      groupBy: row.group_by,
      interval: row.interval,
      balanceType: row.balance_type,
      showEmpty: row.show_empty === 1,
      showOffBudget: row.show_offbudget === 1,
      showHiddenCategories: row.show_hidden === 1,
      showUncategorized: row.show_uncategorized === 1,
      includeCurrentInterval: row.include_current === 1,
      graphType: row.graph_type,
      conditions: row.conditions,
      conditionsOp: row.conditions_op,
    };
  },

  fromJS(report: CustomReportEntity) {
    return {
      id: report.id,
      name: report.name,
      start_date: report.startDate,
      end_date: report.endDate,
      date_static: report.isDateStatic ? 1 : 0,
      date_range: report.dateRange,
      mode: report.mode,
      group_by: report.groupBy,
      interval: report.interval,
      balance_type: report.balanceType,
      show_empty: report.showEmpty ? 1 : 0,
      show_offbudget: report.showOffBudget ? 1 : 0,
      show_hidden: report.showHiddenCategories ? 1 : 0,
      show_uncategorized: report.showUncategorized ? 1 : 0,
      include_current: report.includeCurrentInterval ? 1 : 0,
      graph_type: report.graphType,
      conditions: report.conditions,
      conditions_op: report.conditionsOp,
    };
  },
};

async function reportNameExists(
  name: string,
  reportId: string,
  newItem: boolean,
) {
  const idForName: { id: string } = await db.first(
    'SELECT id from custom_reports WHERE tombstone = 0 AND name = ?',
    [name],
  );

  //no existing name found
  if (idForName === null) {
    return false;
  }

  //for update/rename
  if (!newItem) {
    /*
    -if the found item is the same as the existing item 
    then no name change was made.
    -if they are not the same then there is another
    item with that name already.
    */
    return idForName.id !== reportId;
  }

  //default return: item was found but does not match current name
  return true;
}

async function createReport(report: CustomReportEntity) {
  const reportId = uuidv4();
  const item: CustomReportEntity = {
    ...report,
    id: reportId,
  };
  if (!item.name) {
    throw new Error('Report name is required');
  }

  const nameExists = await reportNameExists(item.name, item.id ?? '', true);
  if (nameExists) {
    throw new Error('There is already a filter named ' + item.name);
  }

  // Create the report here based on the info
  await db.insertWithSchema('custom_reports', reportModel.fromJS(item));

  return reportId;
}

async function updateReport(item: CustomReportEntity) {
  if (!item.name) {
    throw new Error('Report name is required');
  }

  if (!item.id) {
    throw new Error('Report recall error');
  }

  const nameExists = await reportNameExists(item.name, item.id, false);
  if (nameExists) {
    throw new Error('There is already a filter named ' + item.name);
  }

  await db.updateWithSchema('custom_reports', reportModel.fromJS(item));
}

async function deleteReport(id: string) {
  await db.delete_('custom_reports', id);
}

// Expose functions to the client
export const app = createApp<ReportsHandlers>();

app.method('report/create', mutator(undoable(createReport)));
app.method('report/update', mutator(undoable(updateReport)));
app.method('report/delete', mutator(undoable(deleteReport)));
