import { read, SSF, utils } from 'xlsx';
import type { CellObject, WorkBook, WorkSheet } from 'xlsx';

export type XlsxImportOptions = {
  worksheet?: string;
  /** One-based worksheet row; undefined uses detection when enabled. */
  headerRow?: number;
  detectHeader?: boolean;
  requiredColumns?: number[];
};

export type XlsxImportMetadata = {
  worksheets: string[];
  worksheet: string;
  headerRow: number;
  columns: string[];
  excludedRows: number;
};

/** Parse locally into the same raw fields used by Actual's CSV mapping UI. */
export function parseXlsx(
  bytes: Uint8Array,
  options: XlsxImportOptions & { hasHeaderRow?: boolean } = {},
) {
  if (bytes.byteLength > 25 * 1024 * 1024) {
    throw new Error('XLSX files must be 25 MB or smaller.');
  }
  // Reject legacy spreadsheets and non-ZIP inputs despite a renamed extension.
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error('Choose an unencrypted XLSX workbook.');
  }
  const workbook = read(normalizeStoredZip(bytes), {
    type: 'array',
    cellNF: true,
    nodim: true,
  });
  const worksheet = options.worksheet ?? workbook.SheetNames[0];
  const metadata: XlsxImportMetadata = {
    worksheets: workbook.SheetNames,
    worksheet: worksheet ?? '',
    headerRow: options.headerRow ?? 1,
    columns: [],
    excludedRows: 0,
  };
  try {
    return { errors: [], ...parseWorksheet(workbook, metadata, options) };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid worksheet';
    return {
      errors: [{ message, internal: message }],
      transactions: [],
      xlsx: metadata,
    };
  }
}

function parseWorksheet(
  workbook: WorkBook,
  metadata: XlsxImportMetadata,
  options: XlsxImportOptions & { hasHeaderRow?: boolean },
) {
  const { worksheet } = metadata;
  const sheet = worksheet && workbook.Sheets[worksheet];
  if (!sheet || !worksheet) throw new Error('Choose a valid worksheet.');
  if (!sheet['!ref'] || !Object.keys(sheet).some(key => !key.startsWith('!'))) {
    return {
      transactions: [],
      xlsx: {
        worksheets: workbook.SheetNames,
        worksheet,
        headerRow: 1,
        columns: [],
        excludedRows: 0,
      },
    };
  }
  const range = utils.decode_range(sheet['!ref']);
  const hasHeader = options.hasHeaderRow !== false;
  const header =
    options.headerRow !== undefined
      ? options.headerRow - 1
      : ((hasHeader && options.detectHeader !== false
          ? detectHeaderRow(sheet)
          : null) ?? range.s.r);
  if (!Number.isInteger(header) || header < range.s.r || header > range.e.r) {
    throw new Error('Header row is outside the worksheet.');
  }
  const width = range.e.c - range.s.c + 1;
  if (width > 256 || range.e.r - header + 1 > 10000 + (hasHeader ? 1 : 0)) {
    throw new Error(
      'Select a worksheet with at most 256 columns and 10,000 data rows.',
    );
  }
  const required = options.requiredColumns ?? [];
  if (
    required.some(
      column => !Number.isInteger(column) || column < 0 || column >= width,
    )
  ) {
    throw new Error('Choose valid required columns.');
  }
  const valueAt = (row: number, column: number) => {
    const cell: CellObject | undefined =
      sheet[utils.encode_cell({ r: row, c: range.s.c + column })];
    if (!cell || cell.v == null) return '';
    if (cell.t === 'e') {
      throw new Error(
        `Worksheet cell ${utils.encode_cell({ r: row, c: range.s.c + column })} contains an error.`,
      );
    }
    if (cell.t === 'n' && typeof cell.v === 'number') {
      if (cell.z && SSF.is_date(cell.z)) {
        const date = SSF.parse_date_code(cell.v, {
          date1904: workbook.Workbook?.WBProps?.date1904,
        });
        if (!date) throw new Error('Invalid Excel date.');
        return `${String(date.y).padStart(4, '0')}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      }
      // Preserve the number, avoiding currency symbols and display rounding.
      return String(cell.v);
    }
    return String(cell.v).trim();
  };
  const used = new Set<string>();
  const columns = Array.from({ length: width }, (_, column) => {
    const label = hasHeader
      ? valueAt(header, column) || `Column ${column + 1}`
      : String(column);
    let unique = label;
    let suffix = 2;
    while (used.has(unique)) unique = `${label} (${suffix++})`;
    used.add(unique);
    return unique;
  });
  const transactions: Record<string, string>[] = [];
  let excludedRows = 0;
  for (let row = header + (hasHeader ? 1 : 0); row <= range.e.r; row++) {
    const values = columns.map((_, column) => valueAt(row, column));
    if (values.every(value => value === '')) continue;
    if (required.some(column => values[column] === '')) {
      excludedRows++;
      continue;
    }
    transactions.push(
      Object.fromEntries(columns.map((name, column) => [name, values[column]])),
    );
  }
  return {
    transactions,
    xlsx: {
      worksheets: workbook.SheetNames,
      worksheet,
      headerRow: header + 1,
      columns,
      excludedRows,
    } satisfies XlsxImportMetadata,
  };
}

function normalizeStoredZip(data: Uint8Array) {
  const bytes = new Uint8Array(data);
  const view = new DataView(bytes.buffer);
  const endSignature = 0x06054b50;
  const directorySignature = 0x02014b50;
  const localSignature = 0x04034b50;
  const dataDescriptorFlag = 0x08;
  const encryptedFlag = 0x01;
  const storedMethod = 0;
  const endRecordSize = 22;
  const directoryHeaderSize = 46;
  const localHeaderSize = 30;
  const maxCommentLength = 65535;

  // The end record can be followed by a ZIP comment of up to 65,535 bytes.
  let end = bytes.length - endRecordSize;
  const minimum = Math.max(0, end - maxCommentLength);
  for (; end >= minimum; end--) {
    if (
      view.getUint32(end, true) === endSignature &&
      end + endRecordSize + view.getUint16(end + 20, true) === bytes.length
    ) {
      break;
    }
  }
  if (end < minimum) throw new Error('Invalid XLSX archive');

  const entryCount = view.getUint16(end + 10, true);
  let directoryOffset = view.getUint32(end + 16, true);
  for (let i = 0; i < entryCount; i++) {
    if (
      directoryOffset + directoryHeaderSize > end ||
      view.getUint32(directoryOffset, true) !== directorySignature
    ) {
      throw new Error('Invalid ZIP directory');
    }

    const flags = view.getUint16(directoryOffset + 8, true);
    const method = view.getUint16(directoryOffset + 10, true);
    const localOffset = view.getUint32(directoryOffset + 42, true);
    const needsSizes =
      method === storedMethod &&
      flags & dataDescriptorFlag &&
      !(flags & encryptedFlag);
    if (needsSizes) {
      if (
        localOffset + localHeaderSize > directoryOffset ||
        view.getUint32(localOffset, true) !== localSignature
      ) {
        throw new Error('Invalid ZIP entry');
      }

      // Clear the descriptor flag and copy the CRC and both sizes.
      view.setUint16(
        localOffset + 6,
        view.getUint16(localOffset + 6, true) & ~dataDescriptorFlag,
        true,
      );
      view.setUint32(
        localOffset + 14,
        view.getUint32(directoryOffset + 16, true),
        true,
      );
      view.setUint32(
        localOffset + 18,
        view.getUint32(directoryOffset + 20, true),
        true,
      );
      view.setUint32(
        localOffset + 22,
        view.getUint32(directoryOffset + 24, true),
        true,
      );
    }

    const nameLength = view.getUint16(directoryOffset + 28, true);
    const extraLength = view.getUint16(directoryOffset + 30, true);
    const commentLength = view.getUint16(directoryOffset + 32, true);
    directoryOffset +=
      directoryHeaderSize + nameLength + extraLength + commentLength;
  }
  return bytes;
}

function detectHeaderRow(sheet: WorkSheet) {
  if (!sheet?.['!ref']) return null;
  const range = utils.decode_range(sheet['!ref']);
  const lastColumn = Math.min(range.e.c, range.s.c + 255);
  const cellAt = (r: number, c: number) => sheet[utils.encode_cell({ r, c })];
  const nonempty = (cell: CellObject | undefined) =>
    cell?.v !== undefined && cell.v !== null && String(cell.v).trim() !== '';
  const label = (cell: CellObject | undefined) =>
    cell?.t === 's' &&
    /\p{L}/u.test(String(cell.v)) &&
    !/^\d{4}[-/]\d{2}[-/]\d{2}/.test(String(cell.v));
  const common =
    /^(date|name|description|amount|balance|id|email|status|quantity|price|total|datum|namn|beskrivning|belopp|saldo|bokföringsdatum|transaktionsdatum|valutadatum|text|referens)$/i;
  let best: number | null = null,
    bestScore = 0;
  for (let r = range.s.r; r <= Math.min(range.e.r, range.s.r + 99); r++) {
    const columns = [];
    for (let c = range.s.c; c <= lastColumn; c++) {
      if (nonempty(cellAt(r, c))) columns.push(c);
    }
    if (columns.length < 2) continue;
    const labels = columns.filter(c => label(cellAt(r, c)));
    if (labels.length / columns.length < 0.8) continue;
    const values = labels.map(c => String(cellAt(r, c).v).trim().toLowerCase());
    if (new Set(values).size !== values.length) continue;
    const known = values.filter(value => common.test(value)).length;
    let aligned = 0,
      transitions = 0;
    for (let next = r + 1; next <= Math.min(range.e.r, r + 5); next++) {
      const occupied = columns.filter(c => nonempty(cellAt(next, c)));
      if (occupied.length / columns.length < 0.75) continue;
      aligned++;
      transitions += labels.filter(
        c => nonempty(cellAt(next, c)) && !label(cellAt(next, c)),
      ).length;
    }
    if (!aligned || (!transitions && known < 2)) continue;
    const score =
      columns.length * 3 +
      Math.min(aligned, 3) +
      (transitions / aligned) * 2 +
      Math.min(known, 3);
    if (score > bestScore) {
      best = r;
      bestScore = score;
    }
  }
  return best;
}
