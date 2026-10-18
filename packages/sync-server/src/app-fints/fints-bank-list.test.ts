import {
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  createBankIndex,
  decodeBankList,
  isBankListAvailable,
  lookupBank,
  MAX_SEARCH_RESULTS,
  normalise,
  parseBankList,
  parseCsv,
  RECHECK_INTERVAL_MS,
  resetBankListForTests,
  searchBankIndex,
} from './fints-bank-list';

function row(blz: string, name: string, url: string, city = '') {
  const columns = Array.from({ length: 27 }, () => '');
  columns[0] = '1';
  columns[1] = blz;
  columns[3] = name;
  columns[4] = city;
  columns[24] = url;
  return columns.join(';');
}

describe('parseBankList', () => {
  it('reads bank code, name, city and PIN/TAN URL', () => {
    const content = [
      'Nr.;BLZ;BIC;Institut;Ort;RZ;Organisation;HBCI-Zugang DNS;"HBCI- Zugang',
      ' IP-Adresse";HBCI-Version;DDV;...',
      row(
        '10010010',
        'Postbank',
        'https://hbci.postbank.de/banking/hbci.do',
        'Berlin',
      ),
    ].join('\r\n');

    expect(parseBankList(content).get('10010010')).toEqual({
      blz: '10010010',
      name: 'Postbank',
      city: 'Berlin',
      url: 'https://hbci.postbank.de/banking/hbci.do',
    });
  });

  it('skips banks without an https PIN/TAN endpoint', () => {
    const banks = parseBankList(
      [
        row('20000000', 'No PIN/TAN', ''),
        row('30000000', 'Plain HTTP', 'http://example.com/fints'),
      ].join('\n'),
    );

    expect(banks.size).toBe(0);
  });

  it('keeps the first entry with an endpoint for a repeated bank code', () => {
    const banks = parseBankList(
      [
        row('40000000', 'Without', ''),
        row('40000000', 'First', 'https://first.example/fints'),
        row('40000000', 'Second', 'https://second.example/fints'),
      ].join('\n'),
    );

    expect(banks.get('40000000')?.name).toBe('First');
  });
});

describe('bundled and configured bank list', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fints-list-'));
  // A bank of the bundled list (DKB), which the test lists below lack.
  const BUNDLED_BLZ = '12030000';

  beforeEach(() => {
    resetBankListForTests();
    vi.spyOn(console, 'log').mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the bundled list when nothing is configured', async () => {
    expect(await isBankListAvailable('')).toBe(true);
    expect((await lookupBank('', BUNDLED_BLZ))?.url).toMatch(/^https:\/\//);
  });

  it('uses a configured list instead of the bundled one', async () => {
    const path = join(dir, 'fints_institute.csv');
    writeFileSync(
      path,
      row('10010010', 'Postbank', 'https://p.example'),
      'latin1',
    );
    expect((await lookupBank(path, '10010010'))?.name).toBe('Postbank');
    expect(await lookupBank(path, BUNDLED_BLZ)).toBeNull();
  });

  it('falls back to the bundled list for a path that is a directory', async () => {
    // What a container mounts when the file is missing on the host.
    const path = join(dir, 'mounted-as-directory.csv');
    mkdirSync(path);
    const warn = vi.spyOn(console, 'warn').mockReturnValue(undefined);
    expect(await lookupBank(path, BUNDLED_BLZ)).not.toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it('falls back to the bundled list for a missing file', async () => {
    vi.spyOn(console, 'warn').mockReturnValue(undefined);
    expect(
      await lookupBank(join(dir, 'missing.csv'), BUNDLED_BLZ),
    ).not.toBeNull();
  });
});

describe('normalise', () => {
  it('treats the ways of writing umlauts alike', () => {
    expect(normalise('München')).toBe('munchen');
    expect(normalise('Muenchen')).toBe('munchen');
    expect(normalise('Munchen')).toBe('munchen');
    expect(normalise('Straße')).toBe('strasse');
  });

  it('ignores case and punctuation', () => {
    expect(normalise('Sparkasse  Fürth-Erlangen, AG')).toBe(
      'sparkasse furth erlangen ag',
    );
  });
});

describe('searchBankIndex', () => {
  const index = createBankIndex(
    [
      row('70150000', 'Stadtsparkasse München', 'https://s.example', 'München'),
      row(
        '12030000',
        'Deutsche Kreditbank Berlin (DKB) AG',
        'https://dkb.example',
        'Berlin',
      ),
      row(
        '70020270',
        'UniCredit Bank - HypoVereinsbank',
        'https://hvb.example',
        'München',
      ),
      row('76250000', 'Sparkasse Fürth', 'https://f.example', 'Fürth'),
      row('76050101', 'Sparkasse Nürnberg', 'https://n.example', 'Nürnberg'),
      row(
        '70169000',
        'Raiffeisenbank München-Nord',
        'https://r.example',
        'München',
      ),
      row('99999999', 'Ohne FinTS', '', 'München'),
    ].join('\n'),
  );

  const names = (query: string) =>
    searchBankIndex(index, query).map(bank => bank.name);

  it('finds banks by the start of the bank code', () => {
    expect(searchBankIndex(index, '7015').map(bank => bank.blz)).toEqual([
      '70150000',
    ]);
    expect(searchBankIndex(index, '700 202').map(bank => bank.blz)).toEqual([
      '70020270',
    ]);
  });

  it('finds banks by name regardless of how umlauts are typed', () => {
    for (const query of ['nürnberg', 'nuernberg', 'nurnberg']) {
      expect(names(query)).toEqual(['Sparkasse Nürnberg']);
    }
  });

  it('matches every word against name and city', () => {
    expect(names('sparkasse münchen')).toEqual(['Stadtsparkasse München']);
    expect(names('hypo münchen')).toEqual(['UniCredit Bank - HypoVereinsbank']);
  });

  it('lists names starting with the query first', () => {
    expect(names('sparkasse')).toEqual([
      'Sparkasse Fürth',
      'Sparkasse Nürnberg',
      'Stadtsparkasse München',
    ]);
  });

  it('never suggests banks without a FinTS address', () => {
    expect(names('ohne')).toEqual([]);
  });

  it('returns at most the result limit', () => {
    const many = createBankIndex(
      Array.from({ length: 30 }, (_, i) =>
        row(String(10000000 + i), `Testbank ${i}`, 'https://t.example'),
      ).join('\n'),
    );
    expect(searchBankIndex(many, 'testbank')).toHaveLength(MAX_SEARCH_RESULTS);
  });

  it('returns nothing for a query without letters or digits', () => {
    expect(names(' - ')).toEqual([]);
  });
});

describe('parseCsv', () => {
  it('keeps quoted semicolons, line breaks and quotes in one field', () => {
    expect(parseCsv('a;"b;c";"d\r\ne";"say ""hi"""\r\n1;2;3;4')).toEqual([
      ['a', 'b;c', 'd\r\ne', 'say "hi"'],
      ['1', '2', '3', '4'],
    ]);
  });
});

describe('header detection', () => {
  it('finds the columns by name when the layout changes', () => {
    // An added column in front and a different order than today's list.
    const content = [
      'Neu;Nr.;Institut;BLZ;"PIN/TAN-Zugang',
      'URL";Ort',
      'x;1;Testbank;12345678;https://t.example/fints;Teststadt',
    ].join('\n');

    expect(parseBankList(content).get('12345678')).toEqual({
      blz: '12345678',
      name: 'Testbank',
      city: 'Teststadt',
      url: 'https://t.example/fints',
    });
  });
});

describe('decodeBankList', () => {
  it('reads the published ISO-8859-1 list', () => {
    expect(decodeBankList(Buffer.from('München', 'latin1'))).toBe('München');
  });

  it('reads UTF-8, with or without byte order mark', () => {
    expect(decodeBankList(Buffer.from('München', 'utf8'))).toBe('München');
    expect(decodeBankList(Buffer.from('﻿München', 'utf8'))).toBe('München');
  });
});

describe('updating the bank list', () => {
  let now = 1_000_000;
  let dir: string;
  let path: string;

  function writeList(banks: Array<[string, string]>) {
    // Replaced like git or a download would: written elsewhere, then moved.
    const next = join(dir, 'next.csv');
    writeFileSync(
      next,
      banks
        .map(([blz, name]) => row(blz, name, 'https://x.example'))
        .join('\n'),
      'latin1',
    );
    renameSync(next, path);
  }

  beforeEach(() => {
    resetBankListForTests();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    vi.spyOn(console, 'log').mockReturnValue(undefined);
    dir = mkdtempSync(join(tmpdir(), 'fints-update-'));
    path = join(dir, 'fints_institute.csv');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('picks up a replaced list without a restart', async () => {
    writeList([['10000001', 'Alte Bank']]);
    expect((await lookupBank(path, '10000001'))?.name).toBe('Alte Bank');

    writeList([
      ['10000001', 'Alte Bank'],
      ['10000002', 'Neue Bank'],
    ]);
    // Within the check interval the loaded list is still used.
    expect(await lookupBank(path, '10000002')).toBeNull();

    now += RECHECK_INTERVAL_MS;
    expect((await lookupBank(path, '10000002'))?.name).toBe('Neue Bank');
  });

  it('keeps the previous list while the file is missing or broken', async () => {
    vi.spyOn(console, 'warn').mockReturnValue(undefined);
    writeList([['10000001', 'Alte Bank']]);
    await lookupBank(path, '10000001');

    rmSync(path);
    now += RECHECK_INTERVAL_MS;
    expect((await lookupBank(path, '10000001'))?.name).toBe('Alte Bank');

    writeFileSync(path, 'half written;', 'latin1');
    now += RECHECK_INTERVAL_MS;
    expect((await lookupBank(path, '10000001'))?.name).toBe('Alte Bank');
    expect(await isBankListAvailable(path)).toBe(true);
  });
});
