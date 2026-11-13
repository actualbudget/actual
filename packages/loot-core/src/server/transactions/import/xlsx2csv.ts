import { stringify } from 'csv-stringify/sync';
import { strFromU8 } from 'fflate';
import { parseStringPromise, processors } from 'xml2js';

import { safeUnzip } from '#server/util/zip';

// Built-in Excel number formats that show a date, including the East Asian
// locale ones.
const BUILTIN_DATE_FORMATS = new Set([
  14, 15, 16, 17, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 50, 51, 52, 53,
  54, 55, 56, 57, 58,
]);

// xml2js output with explicitCharkey: attributes in `$`, text in `_`, child
// elements as arrays under their tag name.
type XmlNode = { [key: string]: unknown };

function children(node: XmlNode | undefined, tag: string): XmlNode[] {
  return (node?.[tag] as XmlNode[] | undefined) ?? [];
}

function child(node: XmlNode | undefined, tag: string): XmlNode | undefined {
  return children(node, tag)[0];
}

function attr(node: XmlNode | undefined, name: string): string | undefined {
  return (node?.$ as Record<string, string> | undefined)?.[name];
}

// Text of a node, or of all its <t> parts and <r><t> rich text runs.
function text(node: XmlNode | undefined): string {
  if (!node) return '';
  if (typeof node._ === 'string') return node._;
  return [...children(node, 't'), ...children(node, 'r')].map(text).join('');
}

function isDateFormat(code: string): boolean {
  // Drop quoted text, [colors]/[locales], and escaped, _ spacing and * fill
  // characters first.
  const stripped = code.replace(/"[^"]*"|\[[^\]]*\]|[\\_*]./g, '');
  return /[dy]/i.test(stripped);
}

function columnIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/i)?.[0].toUpperCase() ?? '';
  let index = 0;
  for (const letter of letters) {
    index = index * 26 + letter.charCodeAt(0) - 64;
  }
  return index - 1;
}

function serialToDate(serial: number, date1904: boolean): string {
  const epoch = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  return new Date(epoch + Math.floor(serial) * 86400000)
    .toISOString()
    .slice(0, 10);
}

// Resolve a relationship target against the xl/ folder.
function resolvePath(target: string): string {
  const parts: string[] = target.startsWith('/') ? [] : ['xl'];
  for (const part of target.split('/')) {
    if (part === '..') parts.pop();
    else if (part && part !== '.') parts.push(part);
  }
  return parts.join('/');
}

/**
 * Convert the active worksheet of an .xlsx file to CSV text, like "Save as
 * CSV" in a spreadsheet app, so the CSV importer can read it.
 */
export async function xlsx2csv(bytes: Uint8Array): Promise<string> {
  const files = safeUnzip(bytes);
  // The root element of a file in the archive, if it is there.
  const read = async (
    path: string,
    root: string,
  ): Promise<XmlNode | undefined> => {
    if (!files[path]) return undefined;
    const xml = await parseStringPromise<XmlNode>(strFromU8(files[path]), {
      explicitCharkey: true,
      emptyTag: () => ({}),
      tagNameProcessors: [processors.stripPrefix],
      attrNameProcessors: [processors.stripPrefix],
    });
    return xml[root] as XmlNode | undefined;
  };

  const workbook = await read('xl/workbook.xml', 'workbook');
  if (!workbook) {
    throw new Error('Not an Excel workbook');
  }
  const date1904 = ['1', 'true'].includes(
    attr(child(workbook, 'workbookPr'), 'date1904') ?? '',
  );

  const sheets = children(child(workbook, 'sheets'), 'sheet');
  const activeTab = Number(
    attr(child(child(workbook, 'bookViews'), 'workbookView'), 'activeTab') ?? 0,
  );
  const sheetId = attr(sheets[activeTab] ?? sheets[0], 'id');
  const rels = await read('xl/_rels/workbook.xml.rels', 'Relationships');
  const target = attr(
    children(rels, 'Relationship').find(rel => attr(rel, 'Id') === sheetId),
    'Target',
  );
  const sheetData = child(
    target ? await read(resolvePath(target), 'worksheet') : undefined,
    'sheetData',
  );
  if (!sheetData) {
    throw new Error('The sheet has no cells to import');
  }

  const strings = children(await read('xl/sharedStrings.xml', 'sst'), 'si').map(
    text,
  );

  // Which cell styles show a date.
  const styles = await read('xl/styles.xml', 'styleSheet');
  const customFormats = new Map(
    children(child(styles, 'numFmts'), 'numFmt').map(format => [
      Number(attr(format, 'numFmtId')),
      attr(format, 'formatCode') ?? '',
    ]),
  );
  const dateStyles = children(child(styles, 'cellXfs'), 'xf').map(xf => {
    const id = Number(attr(xf, 'numFmtId') ?? 0);
    const code = customFormats.get(id);
    return code != null ? isDateFormat(code) : BUILTIN_DATE_FORMATS.has(id);
  });

  const rows: string[][] = [];
  for (const row of children(sheetData, 'row')) {
    const rowRef = attr(row, 'r');
    const values: string[] = [];
    for (const cell of children(row, 'c')) {
      const cellRef = attr(cell, 'r');
      const v = text(child(cell, 'v'));
      let value = v;
      switch (attr(cell, 't')) {
        case 's':
          value = v === '' ? '' : (strings[Number(v)] ?? '');
          break;
        case 'inlineStr':
          value = text(child(cell, 'is'));
          break;
        case 'b':
          value = v === '1' ? 'TRUE' : v === '0' ? 'FALSE' : '';
          break;
        case 'd':
          value = v.slice(0, 10);
          break;
        case 'str':
        case 'e':
          break;
        default:
          if (v !== '' && dateStyles[Number(attr(cell, 's') ?? 0)]) {
            value = serialToDate(Number(v), date1904);
          } else if (v !== '') {
            // Drop float noise, like 0.30000000000000004, as Excel shows it.
            value = String(Number(Number(v).toPrecision(15)));
          }
      }
      values[cellRef ? columnIndex(cellRef) : values.length] = value;
    }
    rows[rowRef ? Number(rowRef) - 1 : rows.length] = Array.from(
      values,
      value => value ?? '',
    );
  }

  return stringify(Array.from(rows, row => row ?? []));
}
