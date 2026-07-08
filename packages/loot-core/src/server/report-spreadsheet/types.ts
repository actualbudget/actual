import type { DashboardWidgetEntity } from '#types/models';
import type { JSONValue } from '#types/report-spreadsheet';

export type DataMap = Map<string, unknown>;

export type ReportPlan = {
  compute?: () => Promise<JSONValue> | JSONValue;
  queryCells: string[];
  rootName: string;
  sheetName: string;
  widgetId: DashboardWidgetEntity['id'];
};
