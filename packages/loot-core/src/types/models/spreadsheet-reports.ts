export interface SpreadsheetRowData {
  id: string;
  label: string;
  formula: string;
  value: string;
  hidden?: boolean;
}

export type SpreadsheetReportEntity = {
  id: string;
  name: string;
  rows: SpreadsheetRowData[];
  showFormulaColumn: boolean;
  tombstone?: boolean;
};

export type SpreadsheetReportData = {
  id: string;
  name: string;
  rows: string; // JSON string in DB
  show_formula_column: number; // 0 or 1 in DB
  tombstone: number; // 0 or 1 in DB
};
