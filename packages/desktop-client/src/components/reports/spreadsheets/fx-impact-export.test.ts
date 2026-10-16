import { MAX_SAFE_NUMBER } from '@actual-app/core/shared/util';
import type {
  FxExchange,
  FxExchangeEnd,
  FxImpactResult,
} from '@actual-app/core/types/models';

import { fxImpactFixture } from '#mocks/fxImpact';

import {
  buildFxImpactCsv,
  buildFxImpactRecords,
  exactDecimal,
} from './fx-impact-export';

describe('exactDecimal', () => {
  it.each([
    [0, 0, '0'],
    [-10000, 0, '-10000'],
    [5, 2, '0.05'],
    [-5, 2, '-0.05'],
    [-200, 2, '-2.00'],
    [0, 2, '0.00'],
    [1234, 3, '1.234'],
    [-1, 3, '-0.001'],
    [MAX_SAFE_NUMBER, 3, '2251799813685.247'],
    [-MAX_SAFE_NUMBER, 3, '-2251799813685.247'],
    [Number.MAX_SAFE_INTEGER, 2, '90071992547409.91'],
  ])('writes %i at %idp as %s', (value, precision, expected) => {
    expect(exactDecimal(value, precision)).toBe(expected);
  });

  it('leaves unknown values and unknown precision empty', () => {
    expect(exactDecimal(null, 2)).toBe('');
    expect(exactDecimal(100, null)).toBe('');
  });
});

describe('buildFxImpactRecords', () => {
  const records = () => buildFxImpactRecords(fxImpactFixture);
  const ofType = (type: string) => records().filter(r => r.Type === type);

  it('writes one record per result record, in a fixed order', () => {
    expect(records().map(r => [r.Type, r['Account ID'] || r.Currency])).toEqual(
      [
        ['account', 'yen'],
        ['account', 'dinar'],
        ['currency', 'JPY'],
        ['currency', 'KWD'],
        ['budget-currency-fees', 'USD'],
        ['total', ''],
        ['on-budget', ''],
        ['bridge', ''],
        ['bridge-account', 'yen'],
        ['exchange', ''],
      ],
    );
  });

  it('writes 0dp native and 2dp base amounts as exact signed decimals', () => {
    expect(ofType('account')[0]).toMatchObject({
      Month: '2016-12',
      Currency: 'JPY',
      'Account ID': 'yen',
      Account: "'=Yen",
      'Opening native': '0',
      'Closing native': '10000',
      'Closing booked': '100.00',
      'Closing basis': '100.00',
      'Closing value': '125.00',
      'Closing unrealized': '25.00',
      Realized: '0.00',
      'Unrealized change': '25.00',
      'Total change': '25.00',
      'Closing rate date': '2016-12-31',
      'Closing rate': '80',
      'Closing rate kind': 'standing',
      'Closing rate source': 'manual',
      'Closing rate timestamp': '2016-12-01T00:00:00.000Z',
      'Closing rate fallback': 'false',
      Reasons: '',
    });
  });

  it('keeps unknown cells empty with their reasons, and 3dp at the wire bound', () => {
    expect(ofType('account')[1]).toMatchObject({
      Currency: 'KWD',
      Account: 'Dinar',
      'Off budget': 'true',
      'Closing native': '2251799813685.247',
      'Closing booked': '1.00',
      'Closing basis': '',
      'Closing value': '',
      Realized: '',
      'Fee expense': '0.00',
      'Total change': '',
      'Closing rate': '',
      Reasons:
        'sign-mismatch since 2016-12-05; rate-unavailable since 2016-12-31',
    });
    expect(ofType('currency')[1]).toMatchObject({
      Currency: 'KWD',
      Realized: '',
      'Incomplete accounts': 'dinar',
    });
  });

  it('writes the R8 E1 scope rows: selected fees beside whole-exchange reference figures', () => {
    expect(ofType('budget-currency-fees')[0]).toMatchObject({
      Currency: 'USD',
      'Fee expense': '-2.00',
    });
    expect(ofType('total')[0]).toMatchObject({
      'Fee expense': '-2.00',
      Realized: '',
      'Incomplete accounts': 'dinar',
    });
    expect(ofType('exchange')[0]).toMatchObject({
      Date: '2016-12-10',
      'Exchange ID': 'x1',
      'Exchange value': '100.00',
      Spread: '25.00',
      'Source account': 'cash',
      'Source currency': 'USD',
      'Source native': '-100.00',
      'Source fee': '-2.00',
      'Source fee booked': '-2.00',
      'Source realized': '',
      'Destination account': 'yen',
      'Destination currency': 'JPY',
      'Destination native': '10000',
      'Destination fee': '0',
      'Destination realized': '0.00',
      'Destination reference rate': '100',
      // The budget-currency endpoint's realization does not apply.
      Reasons: '',
      Note: 'Reference figures for whole exchanges; do not add to FX totals',
    });
  });

  // Whole-exchange figures per fixture, then the selected-scope rows of the
  // MC-9 R8 table: budget-currency fee line, selected fee expense and
  // selected realized ('none': no FX account row is selected).
  const ends = {
    usd: (native: number, fee = 0): FxExchangeEnd => ({
      accountId: 'cash',
      currency: null,
      native,
      fee,
      feeBooked: fee,
      realized: null,
      feeRealized: null,
      referenceRate: null,
      reasons: [],
    }),
    yen: (
      native: number,
      [fee, feeBooked, realized, feeRealized]: number[],
    ): FxExchangeEnd => ({
      accountId: 'yen',
      currency: 'JPY',
      native,
      fee,
      feeBooked,
      realized,
      feeRealized,
      referenceRate: null,
      reasons: [],
    }),
  };
  const scopeExchanges: Record<string, FxExchange> = {
    E1: {
      id: 'E1',
      date: '2016-12-10',
      value: 10000,
      source: ends.usd(-10000, -200),
      destination: ends.yen(10000, [0, 0, 0, 0]),
      spread: 2500,
    },
    E2: {
      id: 'E2',
      date: '2016-12-10',
      value: 10000,
      source: ends.usd(-10000),
      destination: ends.yen(10100, [-100, -99, 0, 0]),
      spread: 100,
    },
    E3: {
      id: 'E3',
      date: '2016-12-10',
      value: 11000,
      source: ends.yen(-10000, [-100, -110, 1000, 10]),
      destination: ends.usd(11000),
      spread: 1000,
    },
    E4: {
      id: 'E4',
      date: '2016-12-10',
      value: 11000,
      source: ends.yen(-10000, [0, 0, 1000, 0]),
      destination: ends.usd(11000, -200),
      spread: 1000,
    },
  };
  const scopeLiterals = {
    E1: ['-100.00', '-2.00', '-2.00', '10000', '0', '0.00', '0.00', '25.00'],
    E2: ['-100.00', '0.00', '0.00', '10100', '-100', '-0.99', '0.00', '1.00'],
    E3: ['-10000', '-100', '-1.10', '110.00', '0.00', '0.00', '10.00', '10.00'],
    E4: ['-10000', '0', '0.00', '110.00', '-2.00', '-2.00', '10.00', '10.00'],
  };

  it.each([
    ['E1', 'USD source only', -200, -200, null, '-2.00', '-2.00', 'none'],
    [
      'E1',
      'JPY destination only, or [JPY]',
      0,
      0,
      [0, 0],
      '0.00',
      '0.00',
      '0.00',
    ],
    ['E1', 'both', -200, -200, [0, 0], '-2.00', '-2.00', '0.00'],
    ['E2', 'USD source only', 0, 0, null, '0.00', '0.00', 'none'],
    [
      'E2',
      'JPY destination only, or [JPY]',
      0,
      -99,
      [0, 0],
      '0.00',
      '-0.99',
      '0.00',
    ],
    ['E2', 'both', 0, -99, [0, 0], '0.00', '-0.99', '0.00'],
    [
      'E3',
      'JPY source only, or [JPY]',
      0,
      -110,
      [1010, 10],
      '0.00',
      '-1.10',
      '10.10',
    ],
    ['E3', 'USD destination only', 0, 0, null, '0.00', '0.00', 'none'],
    ['E3', 'both', 0, -110, [1010, 10], '0.00', '-1.10', '10.10'],
    [
      'E4',
      'JPY source only, or [JPY]',
      0,
      0,
      [1000, 0],
      '0.00',
      '0.00',
      '10.00',
    ],
    ['E4', 'USD destination only', -200, -200, null, '-2.00', '-2.00', 'none'],
    ['E4', 'both', -200, -200, [1000, 0], '-2.00', '-2.00', '10.00'],
  ] as const)(
    'writes R8 %s, %s, beside its whole-exchange reference figures',
    (
      fixture,
      _selection,
      budgetFees,
      feeExpense,
      yen,
      budgetFeesText,
      feeExpenseText,
      realizedText,
    ) => {
      const month = fxImpactFixture.months[0];
      const [yenRow] = month.accounts;
      const yenFees = feeExpense - budgetFees;
      const accounts = yen
        ? [
            {
              ...yenRow,
              realized: yen[0],
              feeRealized: yen[1],
              feeExpense: yenFees,
            },
          ]
        : [];
      const result: FxImpactResult = {
        ...fxImpactFixture,
        months: [
          {
            ...month,
            accounts,
            currencies: [],
            budgetCurrencyFeeExpense: budgetFees,
            total: {
              ...month.onBudget,
              realized: yen ? yen[0] : 0,
              feeRealized: yen ? yen[1] : 0,
              feeExpense,
            },
            bridge: null,
            exchanges: [scopeExchanges[fixture]],
          },
        ],
      };
      const rows = buildFxImpactRecords(result);
      const of = (type: string) => rows.filter(r => r.Type === type);
      expect(of('budget-currency-fees')[0]['Fee expense']).toBe(budgetFeesText);
      expect(of('total')[0]).toMatchObject({
        'Fee expense': feeExpenseText,
        Realized: realizedText === 'none' ? '0.00' : realizedText,
      });
      expect(of('account')).toHaveLength(yen ? 1 : 0);
      if (yen) {
        expect(of('account')[0].Realized).toBe(realizedText);
      }
      const [
        sourceNative,
        sourceFee,
        sourceFeeBooked,
        destinationNative,
        destinationFee,
        destinationFeeBooked,
        principalRealized,
        spread,
      ] = scopeLiterals[fixture];
      const yenIsSource = fixture === 'E3' || fixture === 'E4';
      expect(of('exchange')[0]).toMatchObject({
        'Exchange ID': fixture,
        'Source native': sourceNative,
        'Source fee': sourceFee,
        'Source fee booked': sourceFeeBooked,
        'Destination native': destinationNative,
        'Destination fee': destinationFee,
        'Destination fee booked': destinationFeeBooked,
        [yenIsSource ? 'Source realized' : 'Destination realized']:
          principalRealized,
        [yenIsSource ? 'Destination realized' : 'Source realized']: '',
        Spread: spread,
        Reasons: '',
        Note: 'Reference figures for whole exchanges; do not add to FX totals',
      });
    },
  );

  it('explains a spread unknown for a missing exchange-date rate, though the close resolves', () => {
    const month = fxImpactFixture.months[0];
    const [exchange] = month.exchanges;
    const result: FxImpactResult = {
      ...fxImpactFixture,
      months: [
        {
          ...month,
          exchanges: [
            {
              ...exchange,
              spread: null,
              destination: {
                ...exchange.destination,
                referenceRate: null,
                reasons: [{ reason: 'rate-unavailable', since: '2016-12-10' }],
              },
            },
          ],
        },
      ],
    };
    const rows = buildFxImpactRecords(result);
    expect(rows.find(r => r['Account ID'] === 'yen')).toMatchObject({
      'Closing rate': '80',
      Reasons: '',
    });
    expect(rows.find(r => r.Type === 'exchange')).toMatchObject({
      Spread: '',
      'Destination reference rate': '',
      'Destination realized': '0.00',
      'Source realized': '',
      Reasons: 'destination: rate-unavailable since 2016-12-10',
    });
  });

  it('explains an ambiguous unselected endpoint when only the healthy endpoint is selected', () => {
    const month = fxImpactFixture.months[0];
    const result: FxImpactResult = {
      ...fxImpactFixture,
      months: [
        {
          ...month,
          // Only the budget-currency account is selected: no FX account rows.
          accounts: [],
          currencies: [],
          bridge: null,
          exchanges: [
            {
              id: 'x2',
              date: '2016-12-10',
              value: 10000,
              source: {
                ...ends.yen(-10000, [0, 0, 0, 0]),
                fee: null,
                feeBooked: null,
                reasons: [
                  {
                    reason: 'exchange-family-ambiguous',
                    since: '2016-12-10',
                  },
                ],
              },
              destination: ends.usd(10000),
              spread: 0,
            },
          ],
          diagnostics: { fees: null, spread: 0 },
        },
      ],
    };
    const lines = buildFxImpactCsv(result).trimEnd().split('\n');
    const exchangeLine = lines.find(line => line.startsWith('exchange,'));
    expect(exchangeLine).toContain(
      ',x2,2016-12-10,100.00,0.00,yen,JPY,-10000,,,0.00,0.00,,cash,USD,100.00,0.00,0.00,,,,',
    );
    expect(exchangeLine).toMatch(
      /,source: exchange-family-ambiguous since 2016-12-10,,Reference figures for whole exchanges; do not add to FX totals$/,
    );
  });

  it('writes the bridge with its captured cell, computed contribution and pending state', () => {
    expect(ofType('bridge')[0]).toMatchObject({
      'Budget type': 'envelope',
      Posted: '25.00',
      'Brought forward': '0.00',
      Contribution: '25.00',
      'Contribution incomplete': 'false',
      'Included in To Budget': '0.00',
      'Included incomplete': 'false',
      Pending: 'true',
    });
    expect(ofType('bridge-account')[0]).toMatchObject({
      'Account ID': 'yen',
      Covers: '2016-11-30',
      Posted: '25.00',
      'Opening value': '0.00',
      'Closing value': '125.00',
      Stale: 'false',
    });
  });

  it('leaves tracking budget cells empty and notes them', () => {
    const month = fxImpactFixture.months[0];
    const tracking: FxImpactResult = {
      ...fxImpactFixture,
      months: [
        {
          ...month,
          bridge: {
            ...month.bridge,
            budgetType: 'tracking',
            cell: null,
            pending: false,
          },
        },
      ],
    };
    expect(
      buildFxImpactRecords(tracking).find(r => r.Type === 'bridge'),
    ).toMatchObject({
      'Budget type': 'tracking',
      'Included in To Budget': '',
      'Included incomplete': '',
    });
  });

  it('uses names, currencies and precision recorded in the result, not current settings', () => {
    const renamed: FxImpactResult = {
      ...fxImpactFixture,
      accounts: fxImpactFixture.accounts.map(a =>
        a.id === 'yen' ? { ...a, name: '+Kept', precision: null } : a,
      ),
    };
    expect(buildFxImpactRecords(renamed)[0]).toMatchObject({
      Account: "'+Kept",
      'Closing native': '',
      Reasons: 'precision-unavailable',
    });
  });
});

describe('buildFxImpactCsv', () => {
  it('protects text cells only and leaves signed amounts unquoted', () => {
    const lines = buildFxImpactCsv(fxImpactFixture).trimEnd().split('\n');
    expect(lines).toHaveLength(11);
    expect(lines[0].startsWith('Type,Month,Currency,Account ID,Account,')).toBe(
      true,
    );
    expect(lines[1]).toContain(",yen,'=Yen,");
    expect(lines[5]).toContain(',-2.00,');
    expect(lines[10]).toContain(',-100.00,-2.00,-2.00,');
  });

  it('writes only the header for a result without months', () => {
    expect(
      buildFxImpactCsv({ ...fxImpactFixture, months: [] })
        .trimEnd()
        .split('\n'),
    ).toHaveLength(1);
  });
});
