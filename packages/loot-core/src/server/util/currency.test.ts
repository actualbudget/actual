import * as db from '#server/db';
import * as prefs from '#server/prefs';
import { createSchedule } from '#server/schedules/app';
import { insertRule } from '#server/transactions/transaction-rules';

import {
  getAccountCurrency,
  initializeImportedAmountEncoding,
  isMulticurrencyAvailable,
  resolveAccountCurrencyInput,
} from './currency';

beforeEach(global.emptyDatabase());

describe('initializeImportedAmountEncoding', () => {
  beforeEach(() => prefs.loadPrefs());

  it('records reviewed currency precision before importing amounts', async () => {
    await initializeImportedAmountEncoding('JPY');

    expect(
      db.firstSync<{ value: string }>(
        "SELECT value FROM preferences WHERE id = 'amountEncoding'",
      )?.value,
    ).toBe(JSON.stringify({ version: 1, currencyCode: 'JPY', precision: 0 }));
    expect(prefs.getPrefs().amountEncoding).toBe(
      JSON.stringify({ version: 1, currencyCode: 'JPY', precision: 0 }),
    );
  });

  it('records a no-symbol two-decimal encoding when currency is missing', async () => {
    await initializeImportedAmountEncoding('');
    expect(
      db.firstSync("SELECT value FROM preferences WHERE id = 'amountEncoding'"),
    ).toEqual({
      value: JSON.stringify({ version: 1, currencyCode: '', precision: 2 }),
    });
  });

  it('rejects unknown source currencies', async () => {
    await expect(initializeImportedAmountEncoding('XYZ')).rejects.toThrow(
      'amount-encoding-unreviewed-currency',
    );
  });
});

describe('account currency', () => {
  async function setBudgetCurrency(currencyCode: string, precision: number) {
    await db.update('preferences', {
      id: 'defaultCurrencyCode',
      value: currencyCode,
    });
    await prefs.savePrefs({
      amountEncoding: JSON.stringify({ version: 1, currencyCode, precision }),
    });
  }

  async function enableMulticurrency() {
    await db.update('preferences', { id: 'flags.currency', value: 'true' });
    await db.update('preferences', {
      id: 'flags.multicurrency',
      value: 'true',
    });
  }

  beforeEach(async () => {
    await prefs.loadPrefs();
  });

  it.each([
    ['', undefined, 2],
    ['USD', 2, 2],
    ['JPY', 0, 0],
    ['KWD', 3, 3],
  ])(
    'resolves inherited %s accounts from the recorded encoding',
    async (code, precision, expected) => {
      if (precision !== undefined) await setBudgetCurrency(code, precision);
      await db.insertAccount({ id: 'acct1', name: 'Checking' });
      expect(await getAccountCurrency('acct1')).toEqual({
        currencyCode: code,
        precision: expected,
      });
    },
  );

  it('uses the recorded precision rather than the currency table', async () => {
    // A budget recorded before a precision correction keeps its scale.
    await setBudgetCurrency('JPY', 2);
    await db.insertAccount({ id: 'acct1', name: 'Checking' });
    expect(await getAccountCurrency('acct1')).toEqual({
      currencyCode: 'JPY',
      precision: 2,
    });
  });

  it('requires both flags and a recorded budget currency', async () => {
    expect(await isMulticurrencyAvailable()).toBe(false);
    await enableMulticurrency();
    expect(await isMulticurrencyAvailable()).toBe(false);
    await setBudgetCurrency('USD', 2);
    expect(await isMulticurrencyAvailable()).toBe(true);
    await db.update('preferences', { id: 'flags.currency', value: 'false' });
    expect(await isMulticurrencyAvailable()).toBe(false);
  });

  it('normalizes the budget currency to inheritance', async () => {
    await setBudgetCurrency('USD', 2);
    expect(await resolveAccountCurrencyInput(undefined)).toBeUndefined();
    expect(await resolveAccountCurrencyInput(null)).toBeNull();
    expect(await resolveAccountCurrencyInput('USD')).toBeNull();
  });

  it('checks errors in order', async () => {
    await setBudgetCurrency('USD', 2);
    await db.insertAccount({ id: 'empty', name: 'Empty' });
    await db.insertAccount({ id: 'used', name: 'Used' });
    await db.insertTransaction({
      account: 'used',
      date: '2026-03-01',
      amount: 100,
    });

    for (const invalid of ['usd', 'US', 'XXX', 7]) {
      await expect(
        resolveAccountCurrencyInput(invalid, 'used'),
      ).rejects.toThrow('account-currency-invalid');
    }
    await expect(resolveAccountCurrencyInput('JPY', 'used')).rejects.toThrow(
      'account-currency-immutable',
    );
    await expect(resolveAccountCurrencyInput('USD', 'used')).resolves.toBe(
      null,
    );
    await expect(resolveAccountCurrencyInput('JPY', 'empty')).rejects.toThrow(
      'multicurrency-unavailable',
    );
    await enableMulticurrency();
    await expect(resolveAccountCurrencyInput('JPY', 'empty')).resolves.toBe(
      'JPY',
    );
    await expect(resolveAccountCurrencyInput('JPY')).resolves.toBe('JPY');
  });

  it('keeps the currency of an account that schedules reference', async () => {
    await setBudgetCurrency('USD', 2);
    await enableMulticurrency();
    await db.insertAccount({ id: 'empty', name: 'Empty' });
    await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'empty' },
        {
          op: 'isapprox',
          field: 'date',
          value: {
            start: '2026-03-01',
            frequency: 'monthly',
            patterns: [],
            skipWeekend: false,
            weekendSolveMode: 'after',
            endMode: 'never',
            endOccurrences: 1,
            endDate: '2026-03-01',
          },
        },
        { op: 'is', field: 'amount', value: -100 },
      ] as never,
    });
    await expect(resolveAccountCurrencyInput('JPY', 'empty')).rejects.toThrow(
      'account-currency-has-schedules',
    );
  });

  it('keeps the currency of an account that a schedule-linking rule references', async () => {
    await setBudgetCurrency('USD', 2);
    await enableMulticurrency();
    await db.insertAccount({ id: 'empty', name: 'Empty' });
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [
        { op: 'oneOf', field: 'account', value: ['other', 'empty'] },
      ],
      actions: [{ op: 'link-schedule', value: 'sched' }],
    } as never);
    await expect(resolveAccountCurrencyInput('JPY', 'empty')).rejects.toThrow(
      'account-currency-has-schedules',
    );
  });

  it('keeps the currency of an account that incoming transfers reference', async () => {
    await setBudgetCurrency('USD', 2);
    await enableMulticurrency();
    await db.insertAccount({ id: 'empty', name: 'Empty' });
    await db.insertAccount({ id: 'used', name: 'Used' });
    await db.insertPayee({ id: 'to-empty', name: '', transfer_acct: 'empty' });
    await db.insertTransaction({
      account: 'used',
      date: '2026-03-01',
      amount: -100,
      payee: 'to-empty',
    });
    await expect(resolveAccountCurrencyInput('JPY', 'empty')).rejects.toThrow(
      'account-currency-has-transfers',
    );
  });

  it('requires the recorded budget currency to be reviewed', async () => {
    await enableMulticurrency();
    await setBudgetCurrency('CLF', 4);
    expect(await isMulticurrencyAvailable()).toBe(false);
  });

  it('normalizes the budget currency before validating it', async () => {
    expect(await resolveAccountCurrencyInput('')).toBeNull();
  });

  it('treats an empty budget currency as legacy', async () => {
    await enableMulticurrency();
    expect(await isMulticurrencyAvailable()).toBe(false);
    await expect(resolveAccountCurrencyInput('USD')).rejects.toThrow(
      'multicurrency-unavailable',
    );
  });
});
