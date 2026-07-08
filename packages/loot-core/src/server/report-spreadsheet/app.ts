import { createApp } from '#server/app';

import { getCell, prepareDashboard, recomputeWidget } from './service';

export type ReportSpreadsheetHandlers = {
  'report-spreadsheet/get-cell': typeof getCell;
  'report-spreadsheet/prepare-dashboard': typeof prepareDashboard;
  'report-spreadsheet/recompute-widget': typeof recomputeWidget;
};

export const app = createApp<ReportSpreadsheetHandlers>();

app.method('report-spreadsheet/get-cell', getCell);
app.method('report-spreadsheet/prepare-dashboard', prepareDashboard);
app.method('report-spreadsheet/recompute-widget', recomputeWidget);
