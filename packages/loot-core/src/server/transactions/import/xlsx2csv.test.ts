import { strToU8, zipSync } from 'fflate';

import { xlsx2csv } from './xlsx2csv';

// fflate stamps each entry with the current date in DOS format, which
// rejects the fake pre-1980 clock the test setup freezes `Date.now` to.
const testGlobal = global as unknown as {
  restoreDateNow: () => void;
  restoreFakeDateNow: () => void;
};
beforeAll(() => testGlobal.restoreDateNow());
afterAll(() => testGlobal.restoreFakeDateNow());

const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';

function workbook({
  sheet,
  strings = [],
  formats = '',
  styles = '<xf numFmtId="0"/>',
  workbookPr = '',
  target = 'worksheets/sheet1.xml',
}: {
  sheet: string;
  strings?: string[];
  formats?: string;
  styles?: string;
  workbookPr?: string;
  target?: string;
}) {
  return zipSync({
    'xl/workbook.xml': strToU8(
      `<workbook ${NS} xmlns:r="r">${workbookPr}<sheets><sheet name="A" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      `<Relationships><Relationship Id="rId1" Target="${target}"/></Relationships>`,
    ),
    'xl/worksheets/sheet1.xml': strToU8(
      `<worksheet ${NS}><sheetData>${sheet}</sheetData></worksheet>`,
    ),
    'xl/sharedStrings.xml': strToU8(
      `<sst ${NS}>${strings.map(s => `<si>${s}</si>`).join('')}</sst>`,
    ),
    'xl/styles.xml': strToU8(
      `<styleSheet ${NS}><numFmts>${formats}</numFmts><cellXfs>${styles}</cellXfs></styleSheet>`,
    ),
  });
}

describe('xlsx2csv', () => {
  test('reads every cell type', async () => {
    const csv = await xlsx2csv(
      workbook({
        strings: ['<t>Payee, Inc</t>', '<r><t>Rich </t></r><r><t>text</t></r>'],
        sheet:
          '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="inlineStr"><is><t>inline</t></is></c></row>' +
          '<row r="2"><c r="A2" t="b"><v>1</v></c><c r="B2" t="str"><f>A1</f><v>formula</v></c><c r="C2" t="e"><v>#N/A</v></c></row>' +
          '<row r="3"><c r="A3"><v>0.30000000000000004</v></c><c r="B3" t="d"><v>2026-01-05T00:00:00</v></c><c r="C3" t="s"/></row>',
      }),
    );
    expect(csv).toBe(
      '"Payee, Inc",Rich text,inline\nTRUE,formula,#N/A\n0.3,2026-01-05,\n',
    );
  });

  test('keeps the place of missing cells and rows', async () => {
    const csv = await xlsx2csv(
      workbook({
        sheet:
          '<row r="1"><c r="B1"><v>1</v></c></row><row r="3"><c r="A3"><v>2</v></c><c r="C3"><v>3</v></c></row>',
      }),
    );
    expect(csv).toBe(',1\n\n2,,3\n');
  });

  test('turns date cells into yyyy-mm-dd, also in the 1904 system', async () => {
    const options = {
      formats:
        '<numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="#,##0.00\\ _D_M"/>',
      styles:
        '<xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/><xf numFmtId="165"/>',
      sheet:
        '<row r="1"><c r="A1" s="1"><v>46027</v></c><c r="B1" s="2"><v>46027.75</v></c><c r="C1" s="3"><v>1234.5</v></c></row>',
    };
    expect(await xlsx2csv(workbook(options))).toBe(
      '2026-01-05,2026-01-05,1234.5\n',
    );
    expect(
      await xlsx2csv(
        workbook({ ...options, workbookPr: '<workbookPr date1904="1"/>' }),
      ),
    ).toBe('2030-01-06,2030-01-06,1234.5\n');
  });

  test('accepts relative sheet paths', async () => {
    const csv = await xlsx2csv(
      workbook({
        target: './worksheets/sheet1.xml',
        sheet: '<row r="1"><c r="A1"><v>1</v></c></row>',
      }),
    );
    expect(csv).toBe('1\n');
  });

  test('rejects a workbook without a worksheet', async () => {
    await expect(
      xlsx2csv(workbook({ target: 'chartsheets/sheet1.xml', sheet: '' })),
    ).rejects.toThrow('The sheet has no cells to import');
    await expect(xlsx2csv(zipSync({}))).rejects.toThrow(
      'Not an Excel workbook',
    );
  });
});
