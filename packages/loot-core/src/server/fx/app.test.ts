import * as nodeFs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { fetch } from '#platform/server/fetch';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { app, updateExchangeRatesDaily } from '#server/fx/app';
import { loadSqlConversionState } from '#server/fx/sqlState';
import * as prefs from '#server/prefs';

vi.mock('#platform/server/fetch', () => ({
  fetch: vi.fn(),
}));

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
});

const usdToCad = {
  from_currency: 'USD',
  to_currency: 'CAD',
  rate: 1.38,
  date: '2026-10-01',
};

describe('exchange rates app', () => {
  describe('exchange-rate-create / exchange-rates-get', () => {
    it('creates manual rates and returns them newest first', async () => {
      const olderId = await app.handlers['exchange-rate-create'](usdToCad);
      const newerId = await app.handlers['exchange-rate-create']({
        from_currency: 'CAD',
        to_currency: 'COP',
        rate: 3000,
        date: '2026-10-15',
      });

      const rates = await app.handlers['exchange-rates-get']();
      expect(rates.map(rate => rate.id)).toEqual([newerId, olderId]);
      expect(rates[1]).toMatchObject({
        ...usdToCad,
        source: 'manual',
      });
      expect(typeof rates[1].created_at).toBe('number');
    });

    it('replaces the rate for the same pair and date', async () => {
      const id = await app.handlers['exchange-rate-create'](usdToCad);
      const sameId = await app.handlers['exchange-rate-create']({
        ...usdToCad,
        rate: 1.4,
      });

      expect(sameId).toBe(id);
      const rates = await app.handlers['exchange-rates-get']();
      expect(rates).toHaveLength(1);
      expect(rates[0].rate).toBe(1.4);
    });

    it('keeps rates for different dates and directions apart', async () => {
      await app.handlers['exchange-rate-create'](usdToCad);
      await app.handlers['exchange-rate-create']({
        ...usdToCad,
        date: '2026-10-02',
      });
      await app.handlers['exchange-rate-create']({
        from_currency: 'CAD',
        to_currency: 'USD',
        rate: 0.72,
        date: '2026-10-01',
      });

      const rates = await app.handlers['exchange-rates-get']();
      expect(rates).toHaveLength(3);
    });

    it('keeps tiny rates exact', async () => {
      await app.handlers['exchange-rate-create']({
        from_currency: 'COP',
        to_currency: 'CAD',
        rate: 0.000333333,
        date: '2026-10-01',
      });

      const rates = await app.handlers['exchange-rates-get']();
      expect(rates[0].rate).toBe(0.000333333);
    });

    it.each([
      ['the same currency on both sides', { to_currency: 'USD' }, /different/],
      ['an unsupported currency', { from_currency: 'XYZ' }, /unsupported/],
      ['the "None" currency', { to_currency: '' }, /unsupported/],
      ['a zero rate', { rate: 0 }, /positive/],
      ['a negative rate', { rate: -1 }, /positive/],
      ['an invalid date', { date: '2026-02-30' }, /invalid date/],
      ['a malformed date', { date: '10/01/2026' }, /invalid date/],
    ])('rejects %s', async (_, override, error) => {
      await expect(
        app.handlers['exchange-rate-create']({ ...usdToCad, ...override }),
      ).rejects.toThrow(error);
    });
  });

  describe('exchange-rate-update', () => {
    it('updates the rate and date', async () => {
      const id = await app.handlers['exchange-rate-create'](usdToCad);
      await app.handlers['exchange-rate-update']({
        id,
        rate: 1.36,
        date: '2026-09-30',
      });

      const rates = await app.handlers['exchange-rates-get']();
      expect(rates[0]).toMatchObject({
        id,
        rate: 1.36,
        date: '2026-09-30',
        from_currency: 'USD',
        to_currency: 'CAD',
      });
    });

    it('validates the update against the stored rate', async () => {
      const id = await app.handlers['exchange-rate-create'](usdToCad);

      await expect(
        app.handlers['exchange-rate-update']({ id, to_currency: 'USD' }),
      ).rejects.toThrow(/different/);
      await expect(
        app.handlers['exchange-rate-update']({ id, rate: 0 }),
      ).rejects.toThrow(/positive/);
    });

    it('rejects unknown rates', async () => {
      await expect(
        app.handlers['exchange-rate-update']({ id: 'missing', rate: 2 }),
      ).rejects.toThrow(/does not exist/);
    });

    it('refuses to move a rate onto a date the pair already has', async () => {
      await app.handlers['exchange-rate-create'](usdToCad);
      const id = await app.handlers['exchange-rate-create']({
        ...usdToCad,
        date: '2026-10-02',
      });

      await expect(
        app.handlers['exchange-rate-update']({ id, date: '2026-10-01' }),
      ).rejects.toThrow(/already/);
      await expect(
        app.handlers['exchange-rate-update']({
          id,
          from_currency: 'CAD',
          to_currency: 'USD',
          date: '2026-10-01',
        }),
      ).resolves.toBeUndefined();
    });

    it('edits the rate of either duplicate synced from another device', async () => {
      // Two devices each saved a rate for the same date while offline
      const savedRate = {
        ...usdToCad,
        date: db.toDateRepr(usdToCad.date),
        source: 'manual',
      };
      await db.insert('exchange_rates', {
        ...savedRate,
        id: 'older',
        created_at: 1,
      });
      await db.insert('exchange_rates', {
        ...savedRate,
        id: 'newer',
        created_at: 2,
      });

      await app.handlers['exchange-rate-update']({ id: 'older', rate: 1.5 });
      // Saving the unchanged pair and date along with the rate, as a form
      // does
      await app.handlers['exchange-rate-update']({
        ...usdToCad,
        id: 'newer',
        rate: 1.6,
      });

      const rates = await app.handlers['exchange-rates-get']();
      expect(rates.find(rate => rate.id === 'older')?.rate).toBe(1.5);
      expect(rates.find(rate => rate.id === 'newer')?.rate).toBe(1.6);

      // Moving one of them onto another taken date is still refused
      await app.handlers['exchange-rate-create']({
        ...usdToCad,
        date: '2026-10-02',
      });
      await expect(
        app.handlers['exchange-rate-update']({
          id: 'older',
          date: '2026-10-02',
        }),
      ).rejects.toThrow(/already/);
    });

    it('turns an edited fetched rate into a manual one', async () => {
      const id = await app.handlers['exchange-rate-create']({
        ...usdToCad,
        source: 'frankfurter',
      });

      await app.handlers['exchange-rate-update']({ id, rate: 1.4 });

      const [rate] = await app.handlers['exchange-rates-get']();
      expect(rate).toMatchObject({ id, rate: 1.4, source: 'manual' });
    });

    it('changes the user rate of that day when a fetched duplicate is edited', async () => {
      const manualId = await app.handlers['exchange-rate-create'](usdToCad);
      const fetchedId = await app.handlers['exchange-rate-create']({
        ...usdToCad,
        rate: 1.39,
        source: 'frankfurter',
      });

      await app.handlers['exchange-rate-update']({ id: fetchedId, rate: 1.4 });

      const rates = await app.handlers['exchange-rates-get']();
      expect(rates.find(rate => rate.id === manualId)?.rate).toBe(1.4);
      expect(rates.find(rate => rate.id === fetchedId)).toMatchObject({
        rate: 1.39,
        source: 'frankfurter',
      });
    });
  });

  describe('exchange-rate-delete', () => {
    it('removes the rate', async () => {
      const id = await app.handlers['exchange-rate-create'](usdToCad);
      const keptId = await app.handlers['exchange-rate-create']({
        ...usdToCad,
        date: '2026-10-02',
      });

      await app.handlers['exchange-rate-delete']({ id });

      const rates = await app.handlers['exchange-rates-get']();
      expect(rates.map(rate => rate.id)).toEqual([keptId]);
    });

    it('allows recreating a deleted rate', async () => {
      const id = await app.handlers['exchange-rate-create'](usdToCad);
      await app.handlers['exchange-rate-delete']({ id });

      const newId = await app.handlers['exchange-rate-create'](usdToCad);
      expect(newId).not.toBe(id);
    });
  });

  describe('exchange-rates-delete', () => {
    it('removes all the given rates', async () => {
      const ids = await Promise.all(
        ['2026-10-01', '2026-10-02', '2026-10-03'].map(date =>
          app.handlers['exchange-rate-create']({ ...usdToCad, date }),
        ),
      );

      await app.handlers['exchange-rates-delete']({ ids: ids.slice(0, 2) });

      const rates = await app.handlers['exchange-rates-get']();
      expect(rates.map(rate => rate.id)).toEqual([ids[2]]);
    });
  });

  describe('exchange-rates-import', () => {
    function writeCsv(contents: string) {
      const dir = nodeFs.mkdtempSync(path.join(os.tmpdir(), 'actual-rates-'));
      const filepath = path.join(dir, 'rates.csv');
      nodeFs.writeFileSync(filepath, contents);
      return filepath;
    }

    it('imports valid rows, replaces existing rates and reports the rest', async () => {
      await app.handlers['exchange-rate-create'](usdToCad);

      const filepath = writeCsv(
        [
          'date,from,to,rate',
          '2026-10-01,USD,CAD,1.4',
          '2026-10-02,CAD,COP,3000',
          '2026-10-03,USD,USD,1',
          'not-a-date,USD,CAD,1.38',
        ].join('\n'),
      );

      const result = await app.handlers['exchange-rates-import']({ filepath });

      expect(result).toMatchObject({ added: 1, updated: 1, unchanged: 0 });
      expect(result.errors.map(error => error.line)).toEqual([4, 5]);
      expect(result.errors[0].message).toMatch(/different currencies/);

      const rates = await app.handlers['exchange-rates-get']();
      expect(rates).toHaveLength(2);
      expect(rates.find(rate => rate.date === '2026-10-01')?.rate).toBe(1.4);
    });

    it('counts rates that are already saved and keeps the last row for a date', async () => {
      await app.handlers['exchange-rate-create'](usdToCad);

      const filepath = writeCsv(
        [
          'date,from,to,rate,,,',
          '2026-10-01,USD,CAD,1.38,,,',
          '2026-10-02,USD,CAD,1.39,,,',
          '2026-10-02,USD,CAD,1.41,,,',
        ].join('\r\n'),
      );

      const result = await app.handlers['exchange-rates-import']({ filepath });

      expect(result).toEqual({
        added: 1,
        updated: 0,
        unchanged: 1,
        errors: [],
      });
      const rates = await app.handlers['exchange-rates-get']();
      expect(rates.find(rate => rate.date === '2026-10-02')?.rate).toBe(1.41);
    });

    it('updates the duplicate that lookups use', async () => {
      // Two devices each saved a rate for the same date while offline
      const savedRate = {
        ...usdToCad,
        date: db.toDateRepr(usdToCad.date),
        source: 'manual',
      };
      await db.insert('exchange_rates', {
        ...savedRate,
        id: 'older',
        created_at: 1,
      });
      await db.insert('exchange_rates', {
        ...savedRate,
        id: 'newer',
        created_at: 2,
      });

      await app.handlers['exchange-rates-import']({
        filepath: writeCsv('date,from,to,rate\n2026-10-01,USD,CAD,1.5'),
      });

      const rates = await app.handlers['exchange-rates-get']();
      expect(rates.find(rate => rate.id === 'newer')?.rate).toBe(1.5);
      expect(rates.find(rate => rate.id === 'older')?.rate).toBe(1.38);
    });

    it('skips rows with a decimal comma in a comma-separated file', async () => {
      const result = await app.handlers['exchange-rates-import']({
        filepath: writeCsv(
          [
            'date,from,to,rate',
            '2026-10-01,USD,CAD,1,38',
            '2026-10-02,CAD,COP,"3,000"',
            '2026-10-03,USD,CAD,1.39',
          ].join('\n'),
        ),
      });

      expect(result).toMatchObject({ added: 1, updated: 0, unchanged: 0 });
      expect(result.errors.map(error => error.line)).toEqual([2, 3]);
      const rates = await app.handlers['exchange-rates-get']();
      expect(rates.map(rate => rate.rate)).toEqual([1.39]);
    });

    it('reports a file that cannot be opened', async () => {
      const result = await app.handlers['exchange-rates-import']({
        filepath: path.join(os.tmpdir(), 'does-not-exist', 'rates.csv'),
      });
      expect(result).toMatchObject({ added: 0, updated: 0, unchanged: 0 });
      expect(result.errors[0].message).toMatch(/Could not open the file/);
    });
  });

  describe('daily automatic update', () => {
    const mockedFetch = vi.mocked(fetch);

    function respond(body: unknown) {
      return new Response(JSON.stringify(body), { status: 200 });
    }

    beforeEach(async () => {
      for (const [id, value] of [
        ['flags.currency', 'true'],
        ['flags.multiCurrency', 'true'],
        ['defaultCurrencyCode', 'CAD'],
        ['exchange-rates-auto-update', 'true'],
      ]) {
        await db.update('preferences', { id, value });
      }
      loadSqlConversionState();
      await db.insertAccount({ id: 'usd', name: 'US', currency: 'USD' });
      await prefs.loadPrefs();
      mockedFetch.mockReset();
      mockedFetch.mockImplementation(async input =>
        String(input).includes('/v2/currencies')
          ? respond([{ iso_code: 'CAD' }, { iso_code: 'USD' }])
          : respond([
              { date: '2017-01-01', base: 'CAD', quote: 'USD', rate: 0.7 },
            ]),
      );
    });

    afterEach(() => {
      prefs.unloadPrefs();
      vi.restoreAllMocks();
    });

    it('runs after a sync', async () => {
      app.events.emit('sync', { type: 'success', tables: [] });

      await vi.waitFor(() =>
        expect(prefs.getPrefs().lastExchangeRateUpdate).toBe('2017-01-01'),
      );
      expect(await app.handlers['exchange-rates-get']()).toEqual([
        expect.objectContaining({ date: '2017-01-01', source: 'frankfurter' }),
      ]);
    });

    it('runs once a day', async () => {
      await updateExchangeRatesDaily();
      const calls = mockedFetch.mock.calls.length;
      expect(calls).toBeGreaterThan(0);

      await updateExchangeRatesDaily();

      expect(mockedFetch).toHaveBeenCalledTimes(calls);
    });

    it('counts a successful update on demand for the day', async () => {
      await app.handlers['exchange-rates-update']();
      expect(prefs.getPrefs().lastExchangeRateUpdate).toBe('2017-01-01');
      const calls = mockedFetch.mock.calls.length;

      await updateExchangeRatesDaily();

      expect(mockedFetch).toHaveBeenCalledTimes(calls);
    });

    it('updates on demand while automatic updates are off', async () => {
      await db.update('preferences', {
        id: 'exchange-rates-auto-update',
        value: 'false',
      });
      prefs.unloadPrefs();

      expect(await app.handlers['exchange-rates-update']()).toMatchObject({
        added: 1,
        errors: [],
      });
    });

    it('tries a failed update again an hour later', async () => {
      const now = Date.now();
      mockedFetch.mockRejectedValueOnce(new Error('offline'));
      await updateExchangeRatesDaily();
      expect(await app.handlers['exchange-rates-update-status']()).toEqual(
        expect.objectContaining({ errors: ['offline'] }),
      );
      expect(prefs.getPrefs().lastExchangeRateUpdate).toBeUndefined();

      await updateExchangeRatesDaily();
      expect(mockedFetch).toHaveBeenCalledTimes(1);

      // Succeeding clears the failure, so later tests aren't held back
      vi.spyOn(Date, 'now').mockReturnValue(now + 61 * 60 * 1000);
      await updateExchangeRatesDaily();
      expect(prefs.getPrefs().lastExchangeRateUpdate).toBe('2017-01-01');
    });
  });
});
