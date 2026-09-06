/**
 * Minimal RFC 4180 CSV parser: handles quoted fields, escaped quotes,
 * embedded newlines, CRLF line endings and a UTF-8 BOM.
 */
export function parseCsv(text: string, delimiter = ','): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    rows.push(row);
    row = [];
  };

  for (; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      pushField();
    } else if (ch === '\n') {
      pushField();
      pushRow();
    } else if (ch === '\r') {
      // Swallow; the following \n (if any) terminates the row.
      if (text[i + 1] !== '\n') {
        pushField();
        pushRow();
      }
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    pushField();
    pushRow();
  }
  // Drop fully empty trailing rows.
  return rows.filter(r => !(r.length === 1 && r[0] === ''));
}

export type CsvRecord = Record<string, string>;

/** Parse CSV text with a header row into records keyed by header name. */
export function parseCsvRecords(
  text: string,
  delimiter = ',',
): { headers: string[]; records: CsvRecord[] } {
  const rows = parseCsv(text, delimiter);
  if (rows.length === 0) {
    return { headers: [], records: [] };
  }
  const headers = rows[0].map(h => h.trim());
  const records = rows.slice(1).map(cells => {
    const record: CsvRecord = {};
    headers.forEach((header, idx) => {
      record[header] = cells[idx] ?? '';
    });
    return record;
  });
  return { headers, records };
}

/**
 * Parse a column map like "date=Date,amount=Amount,payee=Description" into
 * { date: 'Date', amount: 'Amount', payee: 'Description' }.
 */
export function parseColumnMap(input: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const part of input.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      throw new Error(
        `Invalid --map entry "${trimmed}". Expected field=Column Header.`,
      );
    }
    const field = trimmed.slice(0, eq).trim();
    const column = trimmed.slice(eq + 1).trim();
    if (!field || !column) {
      throw new Error(`Invalid --map entry "${trimmed}".`);
    }
    map[field] = column;
  }
  return map;
}

/** Case-insensitive header lookup that tolerates surrounding whitespace. */
export function findHeader(
  headers: string[],
  candidates: string[],
): string | undefined {
  const lowered = headers.map(h => h.trim().toLowerCase());
  for (const candidate of candidates) {
    const idx = lowered.indexOf(candidate.toLowerCase());
    if (idx !== -1) return headers[idx];
  }
  return undefined;
}
