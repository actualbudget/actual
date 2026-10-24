import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import * as nativeFs from '#platform/server/fs';
import { parseRateCsv } from '#server/exchange-rates/import-csv';

// This test compares the approved binary-read contract across both Node adapters.
// oxlint-disable-next-line no-restricted-imports
import * as apiFs from './index.api';

it.each([
  { platform: 'electron', read: nativeFs.readFile },
  { platform: 'api', read: apiFs.readFile },
])(
  'reads real UTF-8 CSV bytes through the $platform adapter',
  async ({ read }) => {
    const directory = mkdtempSync(join(tmpdir(), 'actual-fx-csv-'));
    onTestFinished(() => {
      rmSync(directory, { recursive: true, force: true });
    });
    const path = join(directory, 'rates.csv');
    const bytes = new TextEncoder().encode(
      '\uFEFFquote_currency,rate,kind,date\r\nEUR,0.9200,standing,2026-02-28\r\n',
    );
    writeFileSync(path, bytes);
    const actual = await read(path, 'binary');
    expect(Array.from(actual)).toEqual(Array.from(bytes));
    expect(parseRateCsv(actual, 'USD')).toMatchObject({
      status: 'ok',
      rows: [{ class: 'new', quote: 'EUR', rate: '0.92' }],
    });
  },
);
