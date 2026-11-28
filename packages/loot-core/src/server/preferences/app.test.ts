import * as db from '#server/db';
import * as prefs from '#server/prefs';

import { app } from './app';

vi.mock('#server/main', () => ({ getDefaultDocumentDir: vi.fn() }));

beforeEach(global.emptyDatabase());
beforeEach(() => prefs.loadPrefs());

describe('protected amount encoding preferences', () => {
  it.each(['amountEncoding', 'defaultCurrencyCode'] as const)(
    'rejects direct changes to %s while precision is active',
    async id => {
      const encoding = JSON.stringify({
        version: 1,
        currencyCode: 'JPY',
        precision: 0,
      });
      await prefs.savePrefs({ amountEncoding: encoding });
      db.execQuery(`
        INSERT INTO preferences (id, value) VALUES
          ('amountEncoding', '${encoding}'),
          ('defaultCurrencyCode', 'JPY');
      `);

      await expect(
        app.handlers['preferences/save']({ id, value: 'changed' }),
      ).rejects.toThrow('amount-encoding-transition-required');
    },
  );
});
