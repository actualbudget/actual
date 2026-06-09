// Characters that trigger formula execution in spreadsheet apps (Excel, Google Sheets, LibreOffice).
// Prefix with a single quote to force string interpretation.
const FORMULA_PREFIXES = ['=', '+', '@', '\t', '\r'];

export function escapeCsvField(value: string): string {
  let sanitized = value;
  if (FORMULA_PREFIXES.some(prefix => sanitized.startsWith(prefix))) {
    sanitized = `'${sanitized}`;
  }
  if (
    sanitized.includes(',') ||
    sanitized.includes('"') ||
    sanitized.includes('\n')
  ) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

export function buildCsv(headers: string[], rows: string[][]): string {
  const lines = [
    headers.map(escapeCsvField).join(','),
    ...rows.map(row => row.map(escapeCsvField).join(',')),
  ];
  return lines.join('\n');
}
