import { v4 as uuidv4 } from 'uuid';

import {
  type SpreadsheetReportData,
  type SpreadsheetReportEntity,
} from '../../types/models/spreadsheet-reports';
import { createApp } from '../app';
import * as db from '../db';
import { ValidationError } from '../errors';
import { requiredFields } from '../models';
import { mutator } from '../mutators';
import { undoable } from '../undo';

export const spreadsheetReportModel = {
  validate(
    report: Omit<SpreadsheetReportEntity, 'tombstone'>,
    { update }: { update?: boolean } = {},
  ) {
    requiredFields('SpreadsheetReport', report, ['name'], update);
    return report;
  },

  toJS(row: SpreadsheetReportData): SpreadsheetReportEntity {
    let rows = [];
    try {
      rows = JSON.parse(row.rows || '[]');
    } catch {
      rows = [];
    }

    return {
      id: row.id,
      name: row.name,
      rows,
      showFormulaColumn: row.show_formula_column === 1,
    };
  },

  fromJS(report: SpreadsheetReportEntity): Partial<SpreadsheetReportData> {
    return {
      id: report.id,
      name: report.name,
      rows: JSON.stringify(report.rows || []),
      show_formula_column: report.showFormulaColumn ? 1 : 0,
    };
  },
};

async function spreadsheetReportNameExists(
  name: string,
  reportId: string,
  newItem: boolean,
) {
  const idForName = await db.first<Pick<SpreadsheetReportData, 'id'>>(
    'SELECT id from spreadsheet_reports WHERE tombstone = 0 AND name = ?',
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

async function createSpreadsheetReport(report: SpreadsheetReportEntity) {
  const reportId = uuidv4();
  const item: SpreadsheetReportEntity = {
    ...report,
    id: reportId,
  };

  if (!item.name) {
    throw new Error('Spreadsheet report name is required');
  }

  const nameExists = await spreadsheetReportNameExists(
    item.name,
    item.id ?? '',
    true,
  );
  if (nameExists) {
    throw new Error('There is already a spreadsheet report named ' + item.name);
  }

  await db.insertWithSchema(
    'spreadsheet_reports',
    spreadsheetReportModel.fromJS(item),
  );
  return reportId;
}

async function updateSpreadsheetReport(item: SpreadsheetReportEntity) {
  if (!item.name) {
    throw new Error('Spreadsheet report name is required');
  }

  if (!item.id) {
    throw new Error('Spreadsheet report recall error');
  }

  const nameExists = await spreadsheetReportNameExists(
    item.name,
    item.id,
    false,
  );
  if (nameExists) {
    throw new Error('There is already a spreadsheet report named ' + item.name);
  }

  await db.updateWithSchema(
    'spreadsheet_reports',
    spreadsheetReportModel.fromJS(item),
  );
}

async function deleteSpreadsheetReport(id: SpreadsheetReportEntity['id']) {
  await db.delete_('spreadsheet_reports', id);
}

export type SpreadsheetReportsHandlers = {
  'spreadsheet-report/create': typeof createSpreadsheetReport;
  'spreadsheet-report/update': typeof updateSpreadsheetReport;
  'spreadsheet-report/delete': typeof deleteSpreadsheetReport;
};

const app = createApp<SpreadsheetReportsHandlers>();

app.method(
  'spreadsheet-report/create',
  mutator(undoable(createSpreadsheetReport)),
);
app.method(
  'spreadsheet-report/update',
  mutator(undoable(updateSpreadsheetReport)),
);
app.method(
  'spreadsheet-report/delete',
  mutator(undoable(deleteSpreadsheetReport)),
);

export { app };
