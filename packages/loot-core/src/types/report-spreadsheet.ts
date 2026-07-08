export type JSONValue =
  | null
  | string
  | number
  | boolean
  | JSONValue[]
  | { [key: string]: JSONValue };

export type ReportSpreadsheetCell = {
  widgetId: string;
  name: string;
  value: JSONValue;
};

export type ReportSpreadsheetValues = Record<string, ReportSpreadsheetCell>;
