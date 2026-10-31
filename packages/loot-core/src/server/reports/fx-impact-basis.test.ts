import type {
  ExchangeRateEntity,
  FxAccountMonth,
  FxImpactRequest,
  FxImpactResult,
} from '#types/models';

import { calculateFxImpact } from './fx-impact';
import { replayFxBasis, validateFxEvents } from './fx-impact-basis';
import type {
  FxAccountState,
  FxSnapshot,
  FxSnapshotRow,
} from './fx-impact-basis';

// Budget USD 2dp. USD amounts are cents; native amounts are literal stored
// integers in each account's recorded precision. Rates are quote major
// units per USD.

const PRECISION: Record<string, number> = { JPY: 0, KWD: 3, USD: 2 };

function budget(today = '2026-02-14', budgetCurrency = 'USD', bp = 2) {
  const s: FxSnapshot = {
    today,
    budgetCurrency,
    basePrecision: bp,
    budgetType: 'envelope',
    createdMonths: [],
    cells: {},
    accounts: [],
    rows: [],
    rates: [],
  };
  const api = {
    s,
    account(
      id: string,
      currency: string | null = 'JPY',
      precision: number | null = currency === null
        ? null
        : (PRECISION[currency] ?? null),
      { offbudget = false } = {},
    ) {
      s.accounts.push({
        id,
        name: id,
        currency,
        precision,
        encoding: currency === null ? '' : `${currency}.${precision}`,
        offbudget,
        closed: false,
        sortOrder: s.accounts.length,
      });
      return api;
    },
    row(row: Partial<FxSnapshotRow> & Pick<FxSnapshotRow, 'id' | 'account'>) {
      s.rows.push({
        date: '2026-01-01',
        amount: 0,
        native: null,
        pair: null,
        isParent: false,
        parentId: null,
        transferId: null,
        ...row,
      });
      return api;
    },
    flow(
      id: string,
      account: string,
      date: string,
      native: number | null,
      amount: number,
    ) {
      return api.row({ id, account, date, native, amount });
    },
    /** Two reciprocal top-level legs; base is the destination's booked base. */
    transfer(
      date: string,
      [sourceId, source, sourceNative]: [string, string, number | null],
      [destinationId, destination, destinationNative]: [
        string,
        string,
        number | null,
      ],
      base: number,
    ) {
      api.row({
        id: sourceId,
        account: source,
        date,
        native: sourceNative,
        amount: -base,
        transferId: destinationId,
      });
      return api.row({
        id: destinationId,
        account: destination,
        date,
        native: destinationNative,
        amount: base,
        transferId: sourceId,
      });
    },
    rate(
      quote: string,
      rate: string,
      date = '2025-12-01',
      kind: ExchangeRateEntity['kind'] = 'standing',
    ) {
      const timestamp = `${date}T00:00:00.000Z`;
      s.rates.push({
        id: `${quote}-${kind}-${date}-${rate}`,
        base_currency: budgetCurrency,
        quote_currency: quote,
        rate,
        kind,
        source: kind === 'fetched' ? 'provider' : 'manual',
        timestamp,
        tombstone: 0,
      });
      return api;
    },
    run(request: Partial<FxImpactRequest> = {}) {
      return calculateFxImpact(s, {
        startMonth: '2026-01',
        endMonth: today.slice(0, 7),
        accountIds: null,
        currencies: null,
        ...request,
      });
    },
  };
  return api;
}

const monthOf = (result: FxImpactResult, month: string) => {
  const found = result.months.find(m => m.month === month);
  if (!found) throw new Error(`no month ${month}`);
  return found;
};
const rowOf = (result: FxImpactResult, month: string, id: string) =>
  monthOf(result, month).accounts.find(a => a.accountId === id);
const accountOf = (result: FxImpactResult, month: string, id: string) => {
  const found = rowOf(result, month, id);
  if (!found) throw new Error(`no row ${id} in ${month}`);
  return found;
};

/** Cumulative realized, carry and settlement over every reported month. */
function cumulative(result: FxImpactResult, id: string) {
  const sum = (field: 'realized' | 'feeRealized' | 'carry' | 'settlement') =>
    result.months.reduce<number | null>((total, month) => {
      // An absent row is all zero; a present null stays unknown.
      const row = month.accounts.find(a => a.accountId === id);
      const value = row ? row[field] : 0;
      return total === null || value === null ? null : total + value;
    }, 0);
  return {
    realized: sum('realized'),
    feeRealized: sum('feeRealized'),
    carry: sum('carry'),
    settlement: sum('settlement'),
  };
}

/** The stocks an account closes the last reported month with. */
function closing(result: FxImpactResult, id: string) {
  const last = result.months[result.months.length - 1];
  const row = last.accounts.find(a => a.accountId === id);
  if (!row) throw new Error(`no row ${id}`);
  const { native, basis, booked, value, unrealized } = row.closing;
  return {
    native,
    basis,
    booked,
    value,
    unrealized,
    gap: value === null || booked === null ? null : value - booked,
    ...cumulative(result, id),
  };
}

/**
 * Replays the snapshot, checking L - B - R = C + X for every account with
 * known basis after every event, and the five conservation checks for every
 * same-currency transfer. Also checks every known account month's gap.
 */
function checkIdentities(s: FxSnapshot, result?: FxImpactResult) {
  const { events, validation } = validateFxEvents(s);
  let before = new Map<string, FxAccountState>();
  const scale = (id: string) =>
    10n **
    BigInt(6 - (s.accounts.find(account => account.id === id)?.precision ?? 0));
  replayFxBasis(events, validation, s, {
    closes: [s.today],
    afterEvent(event, states, isKnown) {
      for (const [id, state] of states) {
        if (!isKnown(id)) continue;
        expect(
          state.acquisition - state.borrowing - state.booked - state.realized,
        ).toBe(state.carry + state.settlement);
      }
      if (event.kind === 'transfer') {
        const ids = [event.source.account, event.destination.account];
        if (ids.every(isKnown)) {
          const delta = (id: string, field: keyof FxAccountState) =>
            states.get(id)![field] - (before.get(id)?.[field] ?? 0n);
          expect(
            event.source.native! * scale(event.source.account) +
              event.destination.native! * scale(event.destination.account),
          ).toBe(0n);
          expect(event.source.base! + event.destination.base!).toBe(0n);
          expect(delta(ids[0], 'carry') + delta(ids[1], 'carry')).toBe(0n);
          const signed = (id: string) =>
            delta(id, 'acquisition') - delta(id, 'borrowing');
          expect(signed(ids[0]) + signed(ids[1])).toBe(
            delta(ids[0], 'settlement') + delta(ids[1], 'settlement'),
          );
          for (const id of ids) {
            expect(signed(id) - delta(id, 'booked')).toBe(
              delta(id, 'carry') + delta(id, 'settlement'),
            );
          }
        }
      }
      before = new Map(
        [...states].map(([id, state]) => [id, { ...state }] as const),
      );
    },
  });
  for (const month of result?.months ?? []) {
    for (const row of month.accounts) {
      const parts = [row.realized, row.unrealized, row.carry, row.settlement];
      if (row.gap === null || parts.some(part => part === null)) continue;
      expect(row.gap).toBe(parts.reduce<number>((sum, part) => sum + part!, 0));
    }
  }
}

/** F1: flows, a filtered transfer and its carried basis. */
function f1(offbudgetB = false) {
  return budget()
    .account('A')
    .account('B', 'JPY', 0, { offbudget: offbudgetB })
    .rate('JPY', '80')
    .flow('a01', 'A', '2026-01-01', 10000, 10000)
    .flow('a02', 'A', '2026-01-02', 10000, 12000)
    .flow('a03', 'A', '2026-01-03', -5000, -6500)
    .transfer('2026-01-04', ['a04', 'A', -5000], ['b04', 'B', 5000], 5000);
}

describe('F1 flows and filtered carry', () => {
  it('closes January with literal stocks per account and pool', () => {
    const b = f1();
    b.s.today = '2026-01-31';
    const result = b.run({ endMonth: '2026-01' });
    expect(closing(result, 'A')).toMatchObject({
      native: 10000,
      basis: 11000,
      booked: 10500,
      realized: 1000,
      carry: -500,
      settlement: 0,
      value: 12500,
      unrealized: 1500,
      gap: 2000,
    });
    expect(closing(result, 'B')).toMatchObject({
      native: 5000,
      basis: 5500,
      booked: 5000,
      realized: 0,
      carry: 500,
      value: 6250,
      unrealized: 750,
      gap: 1250,
    });
    const jpy = monthOf(result, '2026-01').currencies.find(
      c => c.currency === 'JPY',
    )!;
    expect(jpy).toMatchObject({
      realized: 1000,
      carry: 0,
      settlement: 0,
      unrealized: 2250,
      gap: 3250,
      closing: { basis: 16500, booked: 15500, value: 18750, unrealized: 2250 },
      incompleteAccountIds: [],
    });
    checkIdentities(b.s, result);
  });

  it('bridges A alone with B off budget, and keeps B basis when filtered', () => {
    const b = f1(true);
    b.s.createdMonths = ['2025-12', '2026-01', '2026-02'];
    const result = b.run({ startMonth: '2025-12' });
    const january = monthOf(result, '2026-01');
    expect(january.bridge?.accounts.map(a => a.accountId)).toEqual(['A']);
    expect(january.bridge?.posted).toBe(2000);
    expect(january.onBudget).toMatchObject({
      realized: 1000,
      unrealized: 1500,
      carry: -500,
      gap: 2000,
    });
    const onlyB = b.run({ accountIds: ['B'] });
    expect(onlyB.months[0].accounts.map(a => a.accountId)).toEqual(['B']);
    expect(accountOf(onlyB, '2026-01', 'B').closing.basis).toBe(5500);
  });

  it('realizes carried basis when B spends in February', () => {
    const b = f1().flow('b05', 'B', '2026-02-01', -5000, -6000);
    const result = b.run();
    expect(accountOf(result, '2026-02', 'B')).toMatchObject({
      realized: 500,
      gap: -250,
      unrealized: -750,
      flows: -6000,
    });
    expect(closing(result, 'B')).toMatchObject({
      booked: -1000,
      carry: 500,
      gap: 1000,
      native: 0,
      basis: 0,
    });
    checkIdentities(b.s, result);
  });
});

describe('F2 borrowing and crossing zero by flows', () => {
  const f2 = (today: string) =>
    budget(today)
      .account('D')
      .rate('JPY', '80')
      .flow('d1', 'D', '2026-01-01', -10000, -10000)
      .flow('d2', 'D', '2026-01-02', 4000, 4800)
      .flow('d3', 'D', '2026-01-03', 8000, 9600)
      .flow('d4', 'D', '2026-01-04', -5000, -6000);

  it.each([
    [
      '2026-01-02',
      {
        native: -6000,
        basis: -6000,
        booked: -5200,
        realized: -800,
        value: -7500,
        unrealized: -1500,
        gap: -2300,
      },
    ],
    [
      '2026-01-03',
      {
        native: 2000,
        basis: 2400,
        booked: 4400,
        realized: -2000,
        value: 2500,
        unrealized: 100,
        gap: -1900,
      },
    ],
    [
      '2026-01-04',
      {
        native: -3000,
        basis: -3600,
        booked: -1600,
        realized: -2000,
        value: -3750,
        unrealized: -150,
        gap: -2150,
      },
    ],
  ])('after %s', (today, expected) => {
    const b = f2(today);
    const result = b.run();
    expect(closing(result, 'D')).toMatchObject(expected);
    checkIdentities(b.s, result);
  });
});

describe('same-currency transfers across sides', () => {
  it('T1 overdraws the source into the destination holdings', () => {
    const b = budget()
      .account('A')
      .account('B')
      .rate('JPY', '100')
      .flow('a1', 'A', '2026-01-01', 4000, 4000)
      .transfer('2026-01-02', ['a2', 'A', -6000], ['b2', 'B', 6000], 6600);
    const result = b.run();
    expect(closing(result, 'A')).toMatchObject({
      native: -2000,
      basis: -2200,
      booked: -2600,
      carry: 400,
      unrealized: 200,
    });
    expect(closing(result, 'B')).toMatchObject({
      native: 6000,
      basis: 6200,
      booked: 6600,
      carry: -400,
      unrealized: -200,
    });
    expect(monthOf(result, '2026-01').total).toMatchObject({
      realized: 0,
      unrealized: 0,
      carry: 0,
      settlement: 0,
    });
    checkIdentities(b.s, result);
  });

  const t2 = (today: string, rate: string) =>
    budget(today)
      .account('A')
      .account('D')
      .rate('JPY', rate)
      .flow('a1', 'A', '2026-01-01', 10000, 10000)
      .flow('d1', 'D', '2026-01-01', -10000, -12000)
      .transfer('2026-01-02', ['a2', 'A', -10000], ['d2', 'D', 10000], 11000);

  it('T2 settles holdings against borrowing', () => {
    const b = t2('2026-01-31', '100');
    const result = b.run({ endMonth: '2026-01' });
    for (const id of ['A', 'D']) {
      expect(closing(result, id)).toMatchObject({
        native: 0,
        basis: 0,
        booked: -1000,
        gap: 1000,
        settlement: 1000,
        realized: 0,
      });
    }
    expect(monthOf(result, '2026-01').total).toMatchObject({
      settlement: 2000,
      realized: 0,
      opening: { basis: 0 },
      closing: { basis: 0 },
    });
    checkIdentities(b.s, result);
  });

  it.each([
    ['80', 2500, -500, 2000],
    ['100', 0, 2000, 2000],
  ])('T3 at rate %s moves pool G by zero', (rate, uA, uD, poolU) => {
    const before = t2('2026-01-01', rate).run({ endMonth: '2026-01' });
    expect(closing(before, 'A').unrealized).toBe(uA);
    expect(closing(before, 'D').unrealized).toBe(uD);
    const total = monthOf(before, '2026-01').total.closing;
    expect(total.unrealized).toBe(poolU);
    const after = t2('2026-01-02', rate).run({ endMonth: '2026-01' });
    const after2 = monthOf(after, '2026-01').total.closing;
    expect(after2.value! - after2.booked!).toBe(total.value! - total.booked!);
  });

  it('T4 carries borrowing basis from destination to source', () => {
    const b = budget()
      .account('D')
      .account('E')
      .rate('JPY', '80')
      .flow('d1', 'D', '2026-01-01', -10000, -12000)
      .transfer('2026-01-02', ['e2', 'E', -10000], ['d2', 'D', 10000], 11000);
    const result = b.run();
    expect(closing(result, 'E')).toMatchObject({
      native: -10000,
      basis: -12000,
      booked: -11000,
      carry: -1000,
      unrealized: -500,
      gap: -1500,
    });
    expect(closing(result, 'D')).toMatchObject({
      native: 0,
      basis: 0,
      booked: -1000,
      carry: 1000,
      gap: 1000,
    });
    const total = monthOf(result, '2026-02').total.closing;
    expect(total.value! - total.booked!).toBe(-500);
    checkIdentities(b.s, result);
  });

  it('T5 spans settlement, debt carry and new holdings', () => {
    const b = budget()
      .account('S')
      .account('D')
      .rate('JPY', '100')
      .flow('s1', 'S', '2026-01-01', 3000, 3600)
      .flow('d1', 'D', '2026-01-01', -5000, -5000)
      .transfer('2026-01-02', ['s2', 'S', -8000], ['d2', 'D', 8000], 8800);
    const result = b.run();
    expect(closing(result, 'S')).toMatchObject({
      native: -5000,
      basis: -5300,
      booked: -5200,
      carry: 200,
      settlement: -300,
    });
    expect(closing(result, 'D')).toMatchObject({
      native: 3000,
      basis: 3300,
      booked: 3800,
      carry: -200,
      settlement: -300,
    });
    const month = monthOf(result, '2026-01').total;
    expect(month.settlement).toBe(-600);
    expect(month.closing.value! - month.closing.booked!).toBe(-600);
    checkIdentities(b.s, result);
  });
});

describe('recorded scale (R1)', () => {
  const iqd = () =>
    budget().account('I3', 'IQD', 3).account('I0', 'IQD', 0).rate('IQD', '0.1');

  it('Q1 carries an equivalent transfer across precisions', () => {
    const b = iqd()
      .flow('i1', 'I3', '2026-01-01', 10000, 10000)
      .transfer('2026-01-02', ['i2', 'I3', -10000], ['o2', 'I0', 10], 11000);
    const result = b.run();
    expect(closing(result, 'I3')).toMatchObject({
      native: 0,
      basis: 0,
      realized: 0,
      carry: 1000,
    });
    expect(closing(result, 'I0')).toMatchObject({
      native: 10,
      basis: 10000,
      realized: 0,
      carry: -1000,
    });
    expect(monthOf(result, '2026-01').currencies[0]).toMatchObject({
      currency: 'IQD',
      realized: 0,
      carry: 0,
    });
    checkIdentities(b.s, result);
  });

  it('Q2 leaves a lossy transfer unattributed and its bridge intact', () => {
    const b = iqd()
      .flow('i1', 'I3', '2026-01-01', 10000, 10000)
      .transfer('2026-01-02', ['i2', 'I3', -1234], ['o2', 'I0', 1], 1200);
    b.s.createdMonths = ['2026-01', '2026-02'];
    const result = b.run();
    const january = monthOf(result, '2026-01');
    for (const [id, native, booked] of [
      ['I3', 8766, 8800],
      ['I0', 1, 1200],
    ] as const) {
      const row = accountOf(result, '2026-01', id);
      expect(row.closing).toMatchObject({
        native,
        booked,
        basis: null,
        unrealized: null,
      });
      expect(row).toMatchObject({ realized: null, carry: null });
      expect(row.reasons).toEqual([
        { reason: 'transfer-quantity-mismatch', since: '2026-01-02' },
      ]);
    }
    expect(
      january.bridge?.accounts.map(a => [a.accountId, a.posted, a.stale]),
    ).toEqual([
      ['I3', -34, false],
      ['I0', -200, false],
    ]);
  });

  it('Q3 carries the principal and realizes the fee on its endpoint', () => {
    const b = iqd()
      .flow('i1', 'I3', '2026-01-01', 10500, 10500)
      .row({
        id: 'p3',
        account: 'I3',
        date: '2026-01-02',
        native: -10500,
        amount: -11550,
        isParent: true,
      })
      .row({
        id: 't3',
        account: 'I3',
        date: '2026-01-02',
        native: -10000,
        amount: -11000,
        parentId: 'p3',
        transferId: 'd3',
      })
      .row({
        id: 'f3',
        account: 'I3',
        date: '2026-01-02',
        native: -500,
        amount: -550,
        parentId: 'p3',
      })
      .row({
        id: 'd3',
        account: 'I0',
        date: '2026-01-02',
        native: 10,
        amount: 11000,
        transferId: 't3',
      });
    const result = b.run();
    expect(closing(result, 'I3')).toMatchObject({
      native: 0,
      basis: 0,
      booked: -1050,
      realized: 50,
      feeRealized: 50,
      carry: 1000,
    });
    expect(closing(result, 'I0')).toMatchObject({
      basis: 10000,
      carry: -1000,
    });
    expect(accountOf(result, '2026-01', 'I3').feeExpense).toBe(-550);
    checkIdentities(b.s, result);
  });

  it('X1 splits opposite sides across precisions without rounding a segment', () => {
    const b = iqd()
      .flow('i1', 'I3', '2026-01-01', 1, 1)
      .flow('o1', 'I0', '2026-01-01', -1, -10000)
      .transfer('2026-01-02', ['i2', 'I3', -1000], ['o2', 'I0', 1], 11000);
    const result = b.run();
    expect(closing(result, 'I3')).toMatchObject({
      native: -999,
      basis: -9990,
      booked: -10999,
      realized: 0,
      carry: 999,
      settlement: 10,
    });
    expect(closing(result, 'I0')).toMatchObject({
      native: 0,
      basis: 0,
      booked: 1000,
      carry: -999,
      settlement: -1,
    });
    expect(monthOf(result, '2026-01').total).toMatchObject({
      settlement: 9,
      carry: 0,
    });
    checkIdentities(b.s, result);
  });

  it('Q4 rejects reciprocal legs that both add units', () => {
    const result = iqd()
      .transfer('2026-01-02', ['i2', 'I3', 1000], ['o2', 'I0', 1], 100)
      .run();
    for (const id of ['I3', 'I0']) {
      expect(accountOf(result, '2026-01', id).reasons).toEqual([
        { reason: 'transfer-direction-invalid', since: '2026-01-02' },
      ]);
    }
  });
});

describe('zero and base-only transfers', () => {
  it('ZP3 keeps a broken link and a failing split around a zero pair', () => {
    const broken = budget()
      .account('A')
      .account('B')
      .rate('JPY', '100')
      .row({
        id: 'z1',
        account: 'A',
        date: '2026-01-05',
        native: 0,
        amount: 0,
        transferId: 'gone',
      })
      .run();
    expect(accountOf(broken, '2026-01', 'A').reasons).toEqual([
      { reason: 'transfer-link-broken', since: '2026-01-05' },
    ]);
    const split = budget()
      .account('A')
      .account('B')
      .rate('JPY', '100')
      .row({
        id: 'p',
        account: 'A',
        date: '2026-01-05',
        native: -100,
        amount: -100,
        isParent: true,
      })
      .row({
        id: 'z1',
        account: 'A',
        date: '2026-01-05',
        native: 0,
        amount: 0,
        parentId: 'p',
        transferId: 'z2',
      })
      .row({
        id: 'z2',
        account: 'B',
        date: '2026-01-05',
        native: 0,
        amount: 0,
        transferId: 'z1',
      })
      .run();
    expect(accountOf(split, '2026-01', 'A').reasons).toEqual([
      { reason: 'family-sum-mismatch', since: '2026-01-05' },
    ]);
  });

  it('treats a valid zero pair as a no-op', () => {
    const plain = f1();
    const withZero = f1().transfer(
      '2026-01-02',
      ['z1', 'A', 0],
      ['z2', 'B', 0],
      0,
    );
    expect(withZero.run()).toEqual(plain.run());
  });

  it('attributes a base-only same-currency pair to carry, cumulatively', () => {
    const b = budget('2026-01-02')
      .account('A')
      .account('B')
      .rate('JPY', '100')
      .flow('a01', 'A', '2026-01-01', 10000, 10000)
      .transfer('2026-01-02', ['x1', 'A', 0], ['y1', 'B', 0], 100);
    const first = b.run({ endMonth: '2026-01' });
    expect(closing(first, 'A')).toMatchObject({
      native: 10000,
      basis: 10000,
      booked: 9900,
      realized: 0,
      carry: 100,
      unrealized: 0,
      gap: 100,
    });
    expect(closing(first, 'B')).toMatchObject({
      native: 0,
      basis: 0,
      booked: 100,
      carry: -100,
      gap: -100,
    });
    checkIdentities(b.s, first);
    b.transfer('2026-01-03', ['x2', 'A', 0], ['y2', 'B', 0], 100);
    b.s.today = '2026-01-03';
    const second = b.run({ endMonth: '2026-01' });
    expect(closing(second, 'A')).toMatchObject({
      booked: 9800,
      carry: 200,
      gap: 200,
    });
    expect(closing(second, 'B')).toMatchObject({
      booked: 200,
      carry: -200,
      gap: -200,
    });
    expect(monthOf(second, '2026-01').total).toMatchObject({ carry: 0 });
    const pool = monthOf(second, '2026-01').total.closing;
    expect(pool.value! - pool.booked!).toBe(0);
    checkIdentities(b.s, second);
  });
});

describe('validation and dependencies', () => {
  it('V1 sign mismatch makes only the owning basis unknown', () => {
    const result = f1()
      .flow('v1', 'A', '2026-01-05', 100, -100)
      .run({ endMonth: '2026-01' });
    const a = accountOf(result, '2026-01', 'A');
    expect(a.reasons).toEqual([
      { reason: 'sign-mismatch', since: '2026-01-05' },
    ]);
    expect(a.closing).toMatchObject({
      native: 10100,
      booked: 10400,
      basis: null,
      value: 12625,
    });
    expect(a.realized).toBeNull();
    expect(accountOf(result, '2026-01', 'B').reasons).toEqual([]);
    expect(monthOf(result, '2026-01').total.incompleteAccountIds).toEqual([
      'A',
    ]);
  });

  it('V2 and V3 reject mismatched and misdirected legs', () => {
    const v2 = budget()
      .account('A')
      .account('B')
      .rate('JPY', '100')
      .transfer('2026-01-02', ['a', 'A', -500], ['b', 'B', 1000], 100)
      .run();
    for (const id of ['A', 'B']) {
      expect(accountOf(v2, '2026-01', id).reasons).toEqual([
        { reason: 'transfer-quantity-mismatch', since: '2026-01-02' },
      ]);
    }
    const v3 = budget()
      .account('usd', null)
      .account('J')
      .rate('JPY', '100')
      .row({
        id: 'u',
        account: 'usd',
        date: '2026-01-02',
        amount: -10000,
        transferId: 'j',
      })
      .row({
        id: 'j',
        account: 'J',
        date: '2026-01-02',
        native: -10000,
        amount: 10000,
        transferId: 'u',
      })
      .run();
    expect(accountOf(v3, '2026-01', 'J').reasons).toEqual([
      { reason: 'transfer-direction-invalid', since: '2026-01-02' },
    ]);
  });

  const v4 = () =>
    budget()
      .account('D')
      .account('E')
      .rate('JPY', '80')
      .flow('d0', 'D', '2026-01-01', 100, -100)
      .flow('d1', 'D', '2026-01-01', -10000, -12000)
      .transfer('2026-01-02', ['e2', 'E', -10000], ['d2', 'D', 10000], 11000)
      .flow('e3', 'E', '2026-01-03', 1000, 1200);

  it('V4 propagates unknown debt basis to the transfer source', () => {
    const result = v4().run();
    const e = accountOf(result, '2026-01', 'E');
    expect(e.reasons).toEqual([
      { reason: 'sign-mismatch', since: '2026-01-02', fromAccountId: 'D' },
    ]);
    expect(e.realized).toBeNull();
    expect(e.closing).toMatchObject({
      native: -9000,
      booked: -9800,
      basis: null,
    });
  });

  const v5 = () =>
    budget()
      .account('P')
      .account('Q')
      .account('W')
      .rate('JPY', '100')
      .flow('p1', 'P', '2026-01-01', 10000, 10000)
      .row({
        id: 'zz9',
        account: 'P',
        date: '2026-01-05',
        native: -3000,
        amount: -3000,
        isParent: true,
      })
      .row({
        id: 'aa1',
        account: 'P',
        date: '2026-01-05',
        native: -2000,
        amount: -2000,
        parentId: 'zz9',
        transferId: 'qq1',
      })
      .row({
        id: 'cc1',
        account: 'P',
        date: '2026-01-05',
        native: -500,
        amount: -500,
        parentId: 'zz9',
      })
      .row({
        id: 'qq1',
        account: 'Q',
        date: '2026-01-05',
        native: 2000,
        amount: 2000,
        transferId: 'aa1',
      })
      .transfer('2026-01-06', ['qq2', 'Q', -1000], ['ww2', 'W', 1000], 1000);

  it('V5 validates a split before replaying its earlier-sorting child', () => {
    const result = v5().run();
    expect(accountOf(result, '2026-01', 'P').reasons).toEqual([
      { reason: 'family-sum-mismatch', since: '2026-01-05' },
    ]);
    expect(accountOf(result, '2026-01', 'Q').reasons).toEqual([
      {
        reason: 'family-sum-mismatch',
        since: '2026-01-05',
        fromAccountId: 'P',
      },
    ]);
    expect(accountOf(result, '2026-01', 'W').reasons).toEqual([
      {
        reason: 'family-sum-mismatch',
        since: '2026-01-06',
        fromAccountId: 'Q',
      },
    ]);
  });

  it('V6 keeps realized FX known before the unknown basis arrives', () => {
    const result = budget()
      .account('A')
      .account('B')
      .rate('JPY', '100')
      .flow('b1', 'B', '2025-12-01', 1000, 1000)
      .flow('b2', 'B', '2025-12-05', -500, -600)
      .flow('a1', 'A', '2026-01-01', 10000, 10000)
      .flow('a2', 'A', '2026-01-02', 100, -100)
      .transfer('2026-01-03', ['a3', 'A', -2000], ['b3', 'B', 2000], 2000)
      .run({ startMonth: '2025-12' });
    expect(accountOf(result, '2025-12', 'B').realized).toBe(100);
    expect(accountOf(result, '2026-01', 'B')).toMatchObject({
      realized: null,
      reasons: [
        { reason: 'sign-mismatch', since: '2026-01-03', fromAccountId: 'A' },
      ],
    });
  });

  it('V7 keeps frozen measures known without any rate', () => {
    const b = f1();
    b.s.rates = [];
    const result = b.run({ endMonth: '2026-01' });
    const a = accountOf(result, '2026-01', 'A');
    expect(a).toMatchObject({
      realized: 1000,
      carry: -500,
      settlement: 0,
      unrealized: null,
      gap: null,
    });
    expect(a.closing).toMatchObject({ basis: 11000, value: null });
    expect(a.reasons).toEqual([
      { reason: 'rate-unavailable', since: '2026-01-31' },
    ]);
  });

  it.each([
    ['a fractional source native', -1.5, 2, 'A', 'B'],
    ['an unsafe destination native', -5, 2 ** 60, 'B', 'A'],
  ])(
    'marks %s in a synced same-currency transfer incomplete without throwing',
    (_name, sourceNative, destinationNative, owner, linked) => {
      const result = budget()
        .account('A')
        .account('B')
        .account('C')
        .rate('JPY', '100')
        .flow('a1', 'A', '2026-01-01', 10000, 10000)
        .flow('c1', 'C', '2026-01-01', 1000, 1000)
        .transfer(
          '2026-01-05',
          ['x', 'A', sourceNative],
          ['y', 'B', destinationNative],
          100,
        )
        .run();
      expect(accountOf(result, '2026-01', owner)).toMatchObject({
        reasons: [{ reason: 'amount-out-of-range', since: '2026-01-05' }],
        closing: { native: null, basis: null },
      });
      expect(accountOf(result, '2026-01', linked)).toMatchObject({
        reasons: [
          {
            reason: 'amount-out-of-range',
            since: '2026-01-05',
            fromAccountId: owner,
          },
        ],
        closing: { basis: null },
      });
      expect(
        accountOf(result, '2026-01', linked).closing.native,
      ).not.toBeNull();
      expect(accountOf(result, '2026-01', 'C').reasons).toEqual([]);
    },
  );

  it('V8 gives identical rows for every selection and insertion order', () => {
    const b = v4();
    const other = v5();
    b.s.accounts.push(...other.s.accounts);
    b.s.rows.push(...other.s.rows);
    const full = b.run();
    const ids = b.s.accounts.map(a => a.id);
    const rowsFor = (result: FxImpactResult, selected: string[]) =>
      result.months.map(m =>
        m.accounts.filter(a => selected.includes(a.accountId)),
      );
    for (let mask = 1; mask < 1 << ids.length; mask++) {
      const selected = ids.filter((_, i) => mask & (1 << i));
      const subset = b.run({ accountIds: selected });
      expect(rowsFor(subset, selected)).toEqual(rowsFor(full, selected));
    }
    const rows = [...b.s.rows];
    for (const seed of [1, 2, 3, 4, 5]) {
      b.s.rows = [...rows].sort(
        (x, y) =>
          ((x.id.charCodeAt(0) * seed) % 7) - ((y.id.charCodeAt(0) * seed) % 7),
      );
      b.s.rows.reverse();
      expect(JSON.stringify(b.run())).toBe(JSON.stringify(full));
    }
  });
});

describe('exchanges and every fee location', () => {
  const usdToJpy = (sourceFee: number, destinationFee: number) => {
    const b = budget('2026-01-31')
      .account('usd', null)
      .account('J')
      .rate('JPY', '80')
      .rate('JPY', '100', '2026-01-15');
    if (sourceFee) {
      b.row({
        id: 'up',
        account: 'usd',
        date: '2026-01-02',
        amount: -10000 - sourceFee,
        isParent: true,
      })
        .row({
          id: 'ut',
          account: 'usd',
          date: '2026-01-02',
          amount: -10000,
          parentId: 'up',
          transferId: 'jt',
        })
        .row({
          id: 'uf',
          account: 'usd',
          date: '2026-01-02',
          amount: -sourceFee,
          parentId: 'up',
        })
        .row({
          id: 'jt',
          account: 'J',
          date: '2026-01-02',
          native: 10000,
          amount: 10000,
          transferId: 'ut',
        });
    } else {
      b.row({
        id: 'ut',
        account: 'usd',
        date: '2026-01-02',
        amount: -10000,
        transferId: 'jt',
      })
        .row({
          id: 'jp',
          account: 'J',
          date: '2026-01-02',
          native: 10100 - destinationFee,
          amount: 10000 - 99,
          isParent: true,
        })
        .row({
          id: 'jt',
          account: 'J',
          date: '2026-01-02',
          native: 10100,
          amount: 10000,
          parentId: 'jp',
          transferId: 'ut',
        })
        .row({
          id: 'jf',
          account: 'J',
          date: '2026-01-02',
          native: -destinationFee,
          amount: -99,
          parentId: 'jp',
        });
    }
    return b;
  };

  const jpyToUsd = (sourceFee: boolean) => {
    const b = budget('2026-01-31')
      .account('J')
      .account('usd', null)
      .rate('JPY', '100');
    if (sourceFee) {
      b.flow('j0', 'J', '2026-01-01', 10100, 10100)
        .row({
          id: 'jp',
          account: 'J',
          date: '2026-01-02',
          native: -10100,
          amount: -11110,
          isParent: true,
        })
        .row({
          id: 'jt',
          account: 'J',
          date: '2026-01-02',
          native: -10000,
          amount: -11000,
          parentId: 'jp',
          transferId: 'ut',
        })
        .row({
          id: 'jf',
          account: 'J',
          date: '2026-01-02',
          native: -100,
          amount: -110,
          parentId: 'jp',
        })
        .row({
          id: 'ut',
          account: 'usd',
          date: '2026-01-02',
          amount: 11000,
          transferId: 'jt',
        });
    } else {
      b.flow('j0', 'J', '2026-01-01', 10000, 10000)
        .row({
          id: 'jt',
          account: 'J',
          date: '2026-01-02',
          native: -10000,
          amount: -11000,
          transferId: 'ut',
        })
        .row({
          id: 'up',
          account: 'usd',
          date: '2026-01-02',
          amount: 10800,
          isParent: true,
        })
        .row({
          id: 'ut',
          account: 'usd',
          date: '2026-01-02',
          amount: 11000,
          parentId: 'up',
          transferId: 'jt',
        })
        .row({
          id: 'uf',
          account: 'usd',
          date: '2026-01-02',
          amount: -200,
          parentId: 'up',
        });
    }
    return b;
  };

  it('E1 source fee in the budget currency', () => {
    const b = usdToJpy(200, 0);
    const result = b.run({ endMonth: '2026-01' });
    expect(closing(result, 'J')).toMatchObject({ basis: 10000, unrealized: 0 });
    expect(monthOf(result, '2026-01').exchanges).toEqual([
      expect.objectContaining({ value: 10000, spread: 2500 }),
    ]);
    checkIdentities(b.s, result);
  });

  it('E1 explains a spread unknown for a missing exchange-date rate', () => {
    const b = usdToJpy(200, 0);
    b.s.rates = [];
    b.rate('JPY', '100', '2026-01-10');
    for (const accountIds of [null, ['usd'], ['J']]) {
      const result = b.run({ endMonth: '2026-01', accountIds });
      expect(monthOf(result, '2026-01').exchanges).toEqual([
        expect.objectContaining({
          value: 10000,
          spread: null,
          source: expect.objectContaining({ referenceRate: null, reasons: [] }),
          destination: expect.objectContaining({
            native: 10000,
            realized: 0,
            referenceRate: null,
            reasons: [{ reason: 'rate-unavailable', since: '2026-01-02' }],
          }),
        }),
      ]);
    }
    // The close resolves its rate, so the account itself has no reason.
    expect(closing(b.run({ endMonth: '2026-01' }), 'J')).toMatchObject({
      value: 10000,
    });
    expect(
      accountOf(b.run({ endMonth: '2026-01' }), '2026-01', 'J').reasons,
    ).toEqual([]);
  });

  it('E2 destination fee removes its basis without realizing', () => {
    const b = usdToJpy(0, 100);
    b.s.rates = [];
    b.rate('JPY', '100');
    const result = b.run({ endMonth: '2026-01' });
    expect(closing(result, 'J')).toMatchObject({
      basis: 9901,
      booked: 9901,
      realized: 0,
      feeRealized: 0,
      unrealized: 99,
    });
    expect(monthOf(result, '2026-01').exchanges[0].spread).toBe(100);
    checkIdentities(b.s, result);
  });

  it('E3 source fee in the foreign currency realizes fee FX', () => {
    const b = jpyToUsd(true);
    const result = b.run({ endMonth: '2026-01' });
    expect(closing(result, 'J')).toMatchObject({
      native: 0,
      booked: -1010,
      realized: 1010,
      feeRealized: 10,
      gap: 1010,
    });
    expect(accountOf(result, '2026-01', 'J').feeExpense).toBe(-110);
    expect(monthOf(result, '2026-01').exchanges[0].spread).toBe(1000);
    checkIdentities(b.s, result);
  });

  it('E4 destination fee in the budget currency', () => {
    const b = jpyToUsd(false);
    const result = b.run({ endMonth: '2026-01' });
    expect(closing(result, 'J').realized).toBe(1000);
    expect(monthOf(result, '2026-01').budgetCurrencyFeeExpense).toBe(-200);
    expect(monthOf(result, '2026-01').exchanges[0].spread).toBe(1000);
  });

  it.each([
    ['0.25', 1000, 2000],
    ['0.3', -1000, 0],
  ])('E5 JPY to KWD at %s', (kwd, unrealized, spread) => {
    const b = budget('2026-01-31')
      .account('J')
      .account('K', 'KWD')
      .rate('JPY', '100')
      .rate('KWD', kwd)
      .flow('j0', 'J', '2026-01-01', 10000, 10000)
      .transfer('2026-01-02', ['jt', 'J', -10000], ['kt', 'K', 30000], 11000);
    const result = b.run({ endMonth: '2026-01' });
    expect(closing(result, 'J').realized).toBe(1000);
    expect(closing(result, 'K')).toMatchObject({ basis: 11000, unrealized });
    expect(monthOf(result, '2026-01').exchanges[0].spread).toBe(spread);
    checkIdentities(b.s, result);
  });

  it('E6 an exchange repays debt', () => {
    const result = budget('2026-01-31')
      .account('usd', null)
      .account('J')
      .rate('JPY', '100')
      .flow('j0', 'J', '2026-01-01', -10000, -12000)
      .transfer('2026-01-02', ['ut', 'usd', null], ['jt', 'J', 10000], 11000)
      .run({ endMonth: '2026-01' });
    expect(closing(result, 'J')).toMatchObject({ realized: 1000, native: 0 });
  });

  // R8: selected scope versus whole-exchange diagnostics.
  it.each([
    ['E1', ['usd'], null, -200, null],
    ['E1', ['J'], null, 0, 0],
    ['E1', null, ['JPY'], 0, 0],
    ['E1', null, null, -200, 0],
    ['E2', ['usd'], null, 0, null],
    ['E2', ['J'], null, -99, 0],
    ['E2', null, ['JPY'], -99, 0],
    ['E2', null, null, -99, 0],
    ['E3', ['J'], null, -110, 1010],
    ['E3', null, ['JPY'], -110, 1010],
    ['E3', ['usd'], null, 0, null],
    ['E3', null, null, -110, 1010],
    ['E4', ['J'], null, 0, 1000],
    ['E4', null, ['JPY'], 0, 1000],
    ['E4', ['usd'], null, -200, null],
    ['E4', null, null, -200, 1000],
  ] as const)(
    'scope %s accounts %j currencies %j',
    (fixture, accountIds, currencies, feeExpense, realized) => {
      const b = {
        E1: () => usdToJpy(200, 0),
        E2: () => {
          const e2 = usdToJpy(0, 100);
          e2.s.rates = [];
          return e2.rate('JPY', '100');
        },
        E3: () => jpyToUsd(true),
        E4: () => jpyToUsd(false),
      }[fixture]();
      const month = monthOf(
        b.run({
          endMonth: '2026-01',
          accountIds: accountIds ? [...accountIds] : null,
          currencies: currencies ? [...currencies] : null,
        }),
        '2026-01',
      );
      const diagnostics = {
        E1: { fees: -200, spread: 2500 },
        E2: { fees: -99, spread: 100 },
        E3: { fees: -110, spread: 1000 },
        E4: { fees: -200, spread: 1000 },
      }[fixture];
      expect(month.total.feeExpense).toBe(feeExpense);
      if (realized === null) {
        expect(month.accounts).toEqual([]);
      } else {
        expect(month.total.realized).toBe(realized);
      }
      expect(month.diagnostics).toEqual(diagnostics);
      expect(month.exchanges).toHaveLength(1);
    },
  );
});

describe('precision, rounding and order', () => {
  it('P1 carries a rounded share, then the rest', () => {
    const b = budget()
      .account('A')
      .account('B')
      .rate('JPY', '100')
      .flow('a1', 'A', '2026-01-01', 3, 1)
      .transfer('2026-01-02', ['a2', 'A', -1], ['b2', 'B', 1], 0);
    b.s.today = '2026-01-02';
    expect(closing(b.run({ endMonth: '2026-01' }), 'B').basis).toBe(0);
    b.transfer('2026-01-03', ['a3', 'A', -2], ['b3', 'B', 2], 1);
    b.s.today = '2026-01-03';
    const result = b.run({ endMonth: '2026-01' });
    expect(closing(result, 'B').basis).toBe(1);
    // A ends with every stock and January change at zero, so it has no row.
    expect(rowOf(result, '2026-01', 'A')).toBeUndefined();
    checkIdentities(b.s, result);
  });

  it('P2 gives a crossing tie to the closing component', () => {
    const b = budget()
      .account('A')
      .rate('JPY', '100')
      .flow('a1', 'A', '2026-01-01', 1, 1)
      .flow('a2', 'A', '2026-01-02', -2, -1);
    const result = b.run();
    expect(closing(result, 'A')).toMatchObject({
      native: -1,
      basis: 0,
      booked: 0,
      realized: 0,
    });
    checkIdentities(b.s, result);
  });

  it('P2b gives a transfer tie to the first segment', () => {
    const b = budget()
      .account('A')
      .account('B')
      .rate('JPY', '100')
      .flow('a1', 'A', '2026-01-01', 1, 1)
      .transfer('2026-01-02', ['a2', 'A', -2], ['b2', 'B', 2], 1);
    const result = b.run();
    expect(closing(result, 'A')).toMatchObject({
      native: -1,
      basis: 0,
      booked: 0,
      carry: 0,
    });
    expect(closing(result, 'B')).toMatchObject({
      native: 2,
      basis: 1,
      booked: 1,
      carry: 0,
    });
    checkIdentities(b.s, result);
  });

  it('P3 orders a date by id, independent of insertion and selection', () => {
    const b = budget()
      .account('A')
      .account('Z')
      .rate('JPY', '100')
      .flow('003', 'A', '2026-01-01', -100, -200)
      .flow('001', 'A', '2026-01-01', 100, 100)
      .flow('002', 'A', '2026-01-01', 100, 200);
    const result = b.run();
    expect(closing(result, 'A')).toMatchObject({
      realized: 50,
      native: 100,
      basis: 150,
    });
    b.s.rows.reverse();
    expect(JSON.stringify(b.run())).toBe(JSON.stringify(result));
    expect(JSON.stringify(b.run({ accountIds: ['A'] }).months)).toBe(
      JSON.stringify(result.months),
    );
  });

  it('P4 realizes a base-only row', () => {
    const result = budget()
      .account('A')
      .rate('JPY', '100')
      .flow('a1', 'A', '2026-01-01', 0, 1)
      .run();
    expect(closing(result, 'A')).toMatchObject({ realized: -1, booked: 1 });
  });

  it('P5 values an account with its recorded precision', () => {
    const result = budget()
      .account('A', 'JPY', 3)
      .rate('JPY', '100')
      .flow('a1', 'A', '2026-01-01', 10000, 10)
      .run();
    expect(closing(result, 'A')).toMatchObject({ value: 10, unrealized: 0 });
  });
});

describe('budget encodings', () => {
  it('returns complete empty months without a budget currency', () => {
    const result = budget('2026-02-14', '').account('a', null).run();
    expect(result.months.map(m => m.month)).toEqual(['2026-01', '2026-02']);
    for (const month of result.months) {
      expect(month.accounts).toEqual([]);
      expect(month.total).toMatchObject({
        realized: 0,
        gap: 0,
        incompleteAccountIds: [],
      });
    }
  });

  it('values in a JPY 0dp budget', () => {
    const result = budget('2026-02-14', 'JPY', 0)
      .account('U', 'USD', 2)
      .rate('USD', '0.01')
      .flow('u1', 'U', '2026-01-01', 10000, 9000)
      .run();
    expect(closing(result, 'U')).toMatchObject({
      value: 10000,
      unrealized: 1000,
    });
  });

  it('values in a KWD 3dp budget', () => {
    const result = budget('2026-02-14', 'KWD', 3)
      .account('U', 'USD', 2)
      .rate('USD', '3.25')
      .flow('u1', 'U', '2026-01-01', 10000, 30000)
      .run();
    expect(closing(result, 'U')).toMatchObject({
      value: 30769,
      unrealized: 769,
    });
  });
});

describe('dates, rates and the bridge', () => {
  const d1 = () =>
    budget()
      .account('A')
      .rate('JPY', '100')
      .rate('JPY', '80', '2026-01-31')
      .rate('JPY', '100', '2026-02-01')
      .flow('a1', 'A', '2025-12-15', 10000, 10000)
      .flow('a2', 'A', '2026-02-01', 1000, 1000)
      .flow('a3', 'A', '2026-02-20', 5000, 5000);

  it('D1 reports a rate move and its reversal', () => {
    const b = d1();
    b.s.createdMonths = ['2025-12', '2026-01', '2026-02'];
    const result = b.run({ startMonth: '2025-12' });
    expect(accountOf(result, '2026-01', 'A')).toMatchObject({
      realized: 0,
      unrealized: 2500,
      flows: 0,
    });
    expect(accountOf(result, '2026-02', 'A')).toMatchObject({
      unrealized: -2500,
      flows: 1000,
    });
    expect(closing(result, 'A').native).toBe(11000);
    expect(monthOf(result, '2026-01').bridge?.posted).toBe(2500);
    expect(monthOf(result, '2026-02').bridge?.posted).toBe(-2500);
  });

  const d2 = () =>
    budget()
      .account('A')
      .rate('JPY', '100', '2025-12-31', 'fetched')
      .rate('JPY', '80', '2026-02-14', 'fetched')
      .flow('a1', 'A', '2025-12-15', 10000, 10000);

  it('D2 keeps frozen measures and catches up the bridge', () => {
    const b = d2();
    b.s.createdMonths = ['2025-12', '2026-01', '2026-02'];
    const result = b.run({ startMonth: '2025-12' });
    const january = accountOf(result, '2026-01', 'A');
    expect(january.closing).toMatchObject({
      value: null,
      unrealized: null,
      basis: 10000,
    });
    expect(january).toMatchObject({ realized: 0, feeExpense: 0 });
    const february = accountOf(result, '2026-02', 'A');
    expect(february.opening.value).toBeNull();
    expect(february).toMatchObject({ unrealized: null, gap: null });
    expect(monthOf(result, '2026-01').bridge).toMatchObject({
      posted: 0,
      incomplete: true,
      contribution: 0,
    });
    expect(monthOf(result, '2026-02').bridge).toMatchObject({
      posted: 2500,
      contribution: 2500,
      accounts: [expect.objectContaining({ covers: ['2026-01-31'] })],
    });
  });

  it('D2b posts a healthy account beside an unavailable one', () => {
    const b = d2()
      .account('K', 'KWD')
      .rate('KWD', '0.3')
      .rate('KWD', '0.25', '2026-01-31')
      .flow('k1', 'K', '2025-12-15', 30000, 10000);
    b.s.createdMonths = ['2025-12', '2026-01', '2026-02'];
    b.s.cells = {
      '2025-12': { value: 0, incomplete: false },
      '2026-01': { value: 2000, incomplete: true },
      '2026-02': { value: 2500, incomplete: false },
    };
    const result = b.run({ startMonth: '2025-12' });
    expect(monthOf(result, '2026-01').bridge).toMatchObject({
      posted: 2000,
      broughtForward: 0,
      incomplete: true,
      contribution: 2000,
      contributionIncomplete: true,
      cell: { value: 2000, incomplete: true },
      pending: false,
    });
    expect(
      monthOf(result, '2026-01').bridge?.accounts.map(a => [
        a.accountId,
        a.posted,
        a.unavailableReason,
      ]),
    ).toEqual([
      ['A', 0, 'rate-unavailable'],
      ['K', 2000, null],
    ]);
    expect(monthOf(result, '2026-02').bridge).toMatchObject({
      contribution: 2500,
      contributionIncomplete: false,
      pending: false,
    });
  });

  it('D2b overflow contributes zero only because the sum is unrepresentable', () => {
    const b = budget()
      .account('K1', 'KWD')
      .account('K2', 'KWD')
      .rate('KWD', '0.01');
    // Each account's value is about 0.625 of MAX_SAFE_NUMBER (2^51 - 1).
    for (const id of ['K1', 'K2']) {
      b.flow(`${id}x`, id, '2026-01-15', 140737488355327, 0);
    }
    b.s.createdMonths = ['2026-01', '2026-02'];
    const bridge = monthOf(b.run(), '2026-01').bridge!;
    expect(bridge.accounts.map(a => a.posted)).toEqual([
      1407374883553270, 1407374883553270,
    ]);
    expect(bridge).toMatchObject({
      posted: null,
      contribution: 0,
      contributionIncomplete: true,
    });
  });

  it('D3 crops the report range but not the bridge context', () => {
    const b = d1();
    b.s.createdMonths = ['2025-12', '2026-01', '2026-02'];
    const cropped = b.run({ startMonth: '2026-02' });
    expect(cropped.months.map(m => m.month)).toEqual(['2026-02']);
    expect(accountOf(cropped, '2026-02', 'A').gap).toBe(-2500);
    expect(monthOf(cropped, '2026-02').bridge).toMatchObject({
      posted: -2500,
      broughtForward: 0,
    });
    b.s.createdMonths = ['2026-02'];
    expect(
      monthOf(b.run({ startMonth: '2026-02' }), '2026-02').bridge,
    ).toMatchObject({
      posted: -2500,
      broughtForward: 2500,
      contribution: 0,
    });
  });

  it('M1 keeps frozen events known in an unvalued month', () => {
    const b = d2()
      .account('B')
      .flow('a2', 'A', '2026-01-10', -5000, -6500)
      .transfer('2026-01-12', ['a3', 'A', -2000], ['b3', 'B', 2000], 3000);
    b.s.createdMonths = ['2025-12', '2026-01', '2026-02'];
    const result = b.run({ startMonth: '2025-12' });
    expect(accountOf(result, '2026-01', 'A')).toMatchObject({
      realized: 1500,
      carry: 1000,
      unrealized: null,
      gap: null,
    });
    expect(accountOf(result, '2026-01', 'B')).toMatchObject({
      carry: -1000,
      unrealized: null,
      gap: null,
    });
    const january = monthOf(result, '2026-01');
    expect(january.onBudget).toMatchObject({
      realized: 1500,
      carry: 0,
      unrealized: null,
      gap: null,
    });
    expect(january.onBudget.closing.value).toBeNull();
    expect(accountOf(result, '2026-02', 'A').closing).toMatchObject({
      native: 3000,
      value: 3750,
      basis: 3000,
      unrealized: 750,
    });
    expect(accountOf(result, '2026-02', 'B').closing).toMatchObject({
      native: 2000,
      value: 2500,
      basis: 2000,
      unrealized: 500,
    });
    expect(accountOf(result, '2026-02', 'A')).toMatchObject({
      realized: 0,
      carry: 0,
      unrealized: null,
      gap: null,
    });
    const bridge = monthOf(result, '2026-02').bridge!;
    expect(bridge.accounts.map(a => [a.accountId, a.posted, a.covers])).toEqual(
      [
        ['A', 3250, ['2026-01-31']],
        ['B', -500, ['2026-01-31']],
      ],
    );
    expect(bridge.posted).toBe(2750);
    checkIdentities(b.s, result);
  });

  it('D5 runs the walk for a tracking budget without a cell', () => {
    const b = d1();
    b.s.createdMonths = ['2025-12', '2026-01', '2026-02'];
    b.s.budgetType = 'tracking';
    const bridge = monthOf(b.run(), '2026-01').bridge;
    expect(bridge).toMatchObject({
      budgetType: 'tracking',
      cell: null,
      pending: false,
      posted: 2500,
    });
  });

  it('D6 a rate edit changes only market figures', () => {
    const run = (rate: string) => {
      const b = f1();
      b.s.rates = [];
      return b.rate('JPY', rate).run();
    };
    const [before, after] = [run('80'), run('90')];
    const frozen = (result: FxImpactResult) =>
      result.months.map(m =>
        m.accounts.map((a: FxAccountMonth) => ({
          basis: a.closing.basis,
          booked: a.closing.booked,
          realized: a.realized,
          carry: a.carry,
          settlement: a.settlement,
          feeExpense: a.feeExpense,
        })),
      );
    expect(frozen(after)).toEqual(frozen(before));
    expect(closing(after, 'A').value).not.toBe(closing(before, 'A').value);
  });

  it('D7 failures leave unrelated accounts and currencies complete', () => {
    const healthy = f1().run();
    const healthyRows = (result: FxImpactResult) =>
      result.months.map(m =>
        m.accounts.filter(a => ['A', 'B'].includes(a.accountId)),
      );
    const cases: Array<(b: ReturnType<typeof f1>) => void> = [
      b =>
        b.flow('x1', 'X', '2026-01-05', 1000, 1000).row({
          id: 'x2',
          account: 'X',
          date: '2026-01-06',
          native: -10,
          amount: -10,
          transferId: 'nowhere',
        }),
      b =>
        b
          .row({
            id: 'x1',
            account: 'X',
            date: '2026-01-05',
            native: -10,
            amount: -10,
            transferId: 'y1',
          })
          .row({
            id: 'y1',
            account: 'Y',
            date: '2026-01-06',
            native: 10,
            amount: 10,
            transferId: 'x1',
          }),
      b =>
        b
          .row({
            id: 'x1',
            account: 'X',
            date: '2026-01-05',
            native: -10,
            amount: -10,
            transferId: 'y1',
          })
          .row({
            id: 'y1',
            account: 'Y',
            date: '2026-01-05',
            native: 10,
            amount: 11,
            transferId: 'x1',
          }),
      b => b.flow('x1', 'X', '2026-01-05', null, 1000),
      b => {
        b.s.accounts.find(a => a.id === 'X')!.precision = null;
        b.flow('x1', 'X', '2026-01-05', 1000, 1000);
      },
      b => b.flow('x1', 'X', '2026-01-05', 1000, 2 ** 53),
      b => b.flow('x1', 'X', '2026-01-05', 2 ** 50, 1),
      b =>
        b
          .row({
            id: 'xp',
            account: 'X',
            date: '2026-01-05',
            native: -10,
            amount: -10,
            isParent: true,
          })
          .row({
            id: 'xc',
            account: 'X',
            date: '2026-01-05',
            native: -5,
            amount: -5,
            parentId: 'xp',
          }),
    ];
    for (const add of cases) {
      const b = f1();
      b.account('X', 'KWD').account('Y', 'KWD').rate('KWD', '0.000001');
      add(b);
      const result = b.run();
      expect(healthyRows(result)).toEqual(healthyRows(healthy));
      for (const month of result.months) {
        const jpy = month.currencies.find(c => c.currency === 'JPY')!;
        expect(jpy.incompleteAccountIds).toEqual([]);
      }
      expect(
        result.months.some(m =>
          m.accounts.some(a => a.accountId === 'X' && a.reasons.length > 0),
        ),
      ).toBe(true);
    }
  });
});

describe('fee family normalization', () => {
  it('N6 keeps a same-encoding split ordinary', () => {
    const b = budget()
      .account('A')
      .account('B')
      .rate('JPY', '100')
      .flow('a1', 'A', '2026-01-01', 10000, 10000)
      .row({
        id: 'p',
        account: 'A',
        date: '2026-01-02',
        native: -3000,
        amount: -3400,
        isParent: true,
      })
      .row({
        id: 't',
        account: 'A',
        date: '2026-01-02',
        native: -2000,
        amount: -2400,
        parentId: 'p',
        transferId: 'b',
      })
      .row({
        id: 'c',
        account: 'A',
        date: '2026-01-02',
        native: -1000,
        amount: -1000,
        parentId: 'p',
      })
      .row({
        id: 'b',
        account: 'B',
        date: '2026-01-02',
        native: 2000,
        amount: 2400,
        transferId: 't',
      });
    const result = b.run();
    expect(closing(result, 'A')).toMatchObject({
      carry: 400,
      realized: 0,
      feeRealized: 0,
      basis: 7000,
    });
    expect(accountOf(result, '2026-01', 'A').feeExpense).toBe(0);
    expect(closing(result, 'B')).toMatchObject({ carry: -400, basis: 2000 });
    checkIdentities(b.s, result);
  });

  it('N7 nets categorized children into one flow', () => {
    const b = budget()
      .account('A')
      .account('B')
      .rate('JPY', '100')
      .flow('a1', 'A', '2026-01-01', 10000, 10000)
      .row({
        id: 'p',
        account: 'A',
        date: '2026-01-02',
        native: -3000,
        amount: -3300,
        isParent: true,
      })
      .row({
        id: 't',
        account: 'A',
        date: '2026-01-02',
        native: -1000,
        amount: -1100,
        parentId: 'p',
        transferId: 'b',
      })
      .row({
        id: 'c1',
        account: 'A',
        date: '2026-01-02',
        native: -1000,
        amount: -1000,
        parentId: 'p',
      })
      .row({
        id: 'c2',
        account: 'A',
        date: '2026-01-02',
        native: -1000,
        amount: -1200,
        parentId: 'p',
      })
      .row({
        id: 'b',
        account: 'B',
        date: '2026-01-02',
        native: 1000,
        amount: 1100,
        transferId: 't',
      });
    const { events } = validateFxEvents(b.s);
    expect(events.map(e => [e.kind, e.id])).toEqual([
      ['flow', 'a1'],
      ['transfer', 'b'],
      ['flow', 'p'],
    ]);
    const result = b.run();
    expect(closing(result, 'A')).toMatchObject({
      carry: 100,
      realized: 200,
      basis: 7000,
    });
    checkIdentities(b.s, result);
  });
});

// 2 ** 51 - 1, the largest wire amount.
const MAX = 2251799813685247;

describe('output bounds and ordering', () => {
  it.each([
    ['P', 'Q', 'R'],
    ['R', 'P', 'Q'],
    ['Q', 'R', 'P'],
  ])('sums exactly before bounding a total, in order %s %s %s', (...order) => {
    const b = budget().rate('JPY', '100');
    for (const id of order) b.account(id);
    b.flow('p1', 'P', '2026-01-02', 1, MAX)
      .flow('q1', 'Q', '2026-01-02', 1, MAX)
      .flow('r1', 'R', '2026-01-02', -1, -MAX);
    const total = monthOf(b.run(), '2026-01').total;
    expect(total.closing.booked).toBe(MAX);
    expect(total.flows).toBe(MAX);
    expect(total.incompleteAccountIds).toEqual([]);
  });

  it('keeps a row and its reason when only a change is unrepresentable', () => {
    const result = budget()
      .account('A')
      .rate('JPY', '100')
      .flow('a1', 'A', '2025-12-15', -1, -MAX)
      .flow('a2', 'A', '2026-01-02', 1, MAX)
      .flow('a3', 'A', '2026-01-03', 1, MAX)
      .run({ endMonth: '2026-01' });
    const a = accountOf(result, '2026-01', 'A');
    expect(a.opening.booked).toBe(-MAX);
    expect(a.closing.booked).toBe(MAX);
    expect(a.flows).toBeNull();
    expect(a.reasons).toEqual([
      { reason: 'amount-out-of-range', since: '2026-01-31' },
    ]);
    expect(monthOf(result, '2026-01').total.incompleteAccountIds).toEqual([
      'A',
    ]);
  });

  it('builds the bridge from rows in any stored order', () => {
    const d1 = () =>
      budget()
        .account('A')
        .account('K', 'KWD')
        .rate('JPY', '100')
        .rate('JPY', '80', '2026-01-31')
        .rate('JPY', '100', '2026-02-01')
        .rate('KWD', '0.3')
        .flow('a1', 'A', '2025-12-15', 10000, 10000)
        .flow('k1', 'K', '2025-12-20', 30000, 10000)
        .flow('a2', 'A', '2026-02-01', 1000, 1000)
        .flow('k2', 'K', '2026-01-10', -3000, -900);
    const ordered = d1();
    const reversed = d1();
    for (const b of [ordered, reversed]) {
      b.s.createdMonths = ['2025-12', '2026-01', '2026-02'];
    }
    reversed.s.rows.reverse();
    const bridges = (result: FxImpactResult) =>
      result.months.map(m => m.bridge);
    const expected = bridges(ordered.run({ startMonth: '2025-12' }));
    expect(monthOf(ordered.run(), '2026-01').bridge?.accounts).toEqual([
      expect.objectContaining({ accountId: 'A', posted: 2500 }),
      // 27.000 KWD at 0.3 is 90.00 against 91.00 booked.
      expect.objectContaining({ accountId: 'K', posted: -100 }),
    ]);
    expect(bridges(reversed.run({ startMonth: '2025-12' }))).toEqual(expected);
  });

  it('reports an unrepresentable exchange amount as unknown, not zero', () => {
    const huge = 4503599627370496; // 2 ** 52: a safe integer above MAX.
    const result = budget('2026-01-31')
      .account('usd', null)
      .account('J')
      .rate('JPY', '100')
      .transfer('2026-01-02', ['u', 'usd', null], ['j', 'J', huge], 10000)
      .run({ endMonth: '2026-01' });
    const month = monthOf(result, '2026-01');
    expect(month.exchanges).toHaveLength(1);
    expect(month.exchanges[0]).toMatchObject({
      value: 10000,
      source: { accountId: 'usd', native: -10000, fee: 0, feeBooked: 0 },
      destination: { accountId: 'J', native: null, fee: 0, feeBooked: 0 },
      spread: null,
    });
    expect(accountOf(result, '2026-01', 'J').reasons).toContainEqual({
      reason: 'amount-out-of-range',
      since: '2026-01-02',
    });
  });
});

describe('Sol inspection round 1', () => {
  // R1: a rejected or uncovered movement still advances the known position
  // later transfers are segmented against.
  const iqdChronology = () =>
    budget()
      .account('A', 'IQD', 3)
      .account('B', 'IQD', 0)
      .account('C', 'IQD', 3)
      .rate('IQD', '1')
      .flow('a1', 'A', '2026-01-01', 1000, 100)
      .transfer('2026-01-02', ['a2', 'A', -2000], ['b2', 'B', 1], 200)
      .transfer('2026-01-03', ['c3', 'C', -500], ['a3', 'A', 500], 50)
      .flow('c4', 'C', '2026-01-04', 500, 75);

  it.each([[null], [['C']]])(
    'R1 makes C depend on the debt basis A holds after a rejected pair (selection %j)',
    accountIds => {
      const result = iqdChronology().run({
        endMonth: '2026-01',
        accountIds,
      });
      expect(accountOf(result, '2026-01', 'C')).toMatchObject({
        realized: null,
        carry: null,
        reasons: [
          {
            reason: 'transfer-quantity-mismatch',
            since: '2026-01-03',
            fromAccountId: 'A',
          },
        ],
        closing: { native: 0, booked: 25, basis: null },
      });
      if (accountIds === null) {
        checkIdentities(iqdChronology().s, result);
        expect(accountOf(result, '2026-01', 'A').closing).toMatchObject({
          native: -500,
          booked: -50,
          basis: null,
        });
      }
    },
  );

  it('R1 moves a rejected pair at its canonical id on a shared date', () => {
    // The rejected pair a2/z2 sorts as a2, before the C-to-A pair c3/d3.
    const b = budget()
      .account('A', 'IQD', 3)
      .account('B', 'IQD', 0)
      .account('C', 'IQD', 3)
      .rate('IQD', '1')
      .flow('a1', 'A', '2026-01-01', 1000, 100)
      .transfer('2026-01-02', ['z2', 'A', -2000], ['a2', 'B', 1], 200)
      .transfer('2026-01-02', ['c3', 'C', -500], ['d3', 'A', 500], 50)
      .flow('c4', 'C', '2026-01-04', 500, 75);
    const result = b.run({ endMonth: '2026-01' });
    expect(accountOf(result, '2026-01', 'C')).toMatchObject({
      realized: null,
      reasons: [
        {
          reason: 'transfer-quantity-mismatch',
          since: '2026-01-02',
          fromAccountId: 'A',
        },
      ],
      closing: { native: 0, booked: 25, basis: null },
    });
    const { events } = validateFxEvents(b.s);
    expect(
      events
        .filter(e => e.kind === 'position')
        .map(e => [e.id, e.kind === 'position' && e.leg.account]),
    ).toEqual([
      ['a2', 'B'],
      ['a2', 'A'],
    ]);
  });

  const signChange = (b: ReturnType<typeof budget>) =>
    b
      .transfer('2026-01-03', ['c3', 'C', -500], ['a3', 'A', 500], 500)
      .run({ endMonth: '2026-01' });

  it('R1 follows a sign change made by a broken link', () => {
    const result = signChange(
      budget()
        .account('A')
        .account('C')
        .rate('JPY', '100')
        .flow('a1', 'A', '2026-01-01', 1000, 1000)
        .row({
          id: 'a2',
          account: 'A',
          date: '2026-01-02',
          native: -3000,
          amount: -3000,
          transferId: 'gone',
        }),
    );
    expect(accountOf(result, '2026-01', 'C').reasons).toEqual([
      {
        reason: 'transfer-link-broken',
        since: '2026-01-03',
        fromAccountId: 'A',
      },
    ]);
  });

  it('R1 follows a sign change made by an invalid family', () => {
    const result = signChange(
      budget()
        .account('A')
        .account('C')
        .rate('JPY', '100')
        .flow('a1', 'A', '2026-01-01', 1000, 1000)
        .row({
          id: 'p',
          account: 'A',
          date: '2026-01-02',
          native: -3000,
          amount: -3000,
          isParent: true,
        })
        .row({
          id: 'p1',
          account: 'A',
          date: '2026-01-02',
          native: -500,
          amount: -500,
          parentId: 'p',
        }),
    );
    // 1000 - 3000 + the 500 received on January 3.
    expect(accountOf(result, '2026-01', 'A').closing.native).toBe(-1500);
    expect(accountOf(result, '2026-01', 'C').reasons).toEqual([
      {
        reason: 'family-sum-mismatch',
        since: '2026-01-03',
        fromAccountId: 'A',
      },
    ]);
  });

  // R2 and R3: an exchange endpoint that cannot be valued stays listed with
  // unknown reference figures; the other endpoint stays exact.
  const usdToJ = (
    jNative: number | null,
    {
      precision = 0 as number | null,
      base = 10000,
      pair = null as string | null,
    } = {},
  ) =>
    budget('2026-01-31')
      .account('usd', null)
      .account('J', 'JPY', precision)
      .account('H')
      .rate('JPY', '100')
      .flow('h1', 'H', '2026-01-01', 1000, 1000)
      .row({
        id: 'u',
        account: 'usd',
        date: '2026-01-02',
        amount: -base,
        transferId: 'j',
      })
      .row({
        id: 'j',
        account: 'J',
        date: '2026-01-02',
        native: jNative,
        amount: base,
        transferId: 'u',
        pair,
      })
      .run({ endMonth: '2026-01' });

  const healthy = (result: FxImpactResult) =>
    expect(accountOf(result, '2026-01', 'H')).toMatchObject({
      reasons: [],
      closing: { native: 1000, basis: 1000, value: 1000 },
    });

  it.each([
    ['missing', null],
    ['fractional', 0.5],
    ['out-of-range', 16],
  ])('R2 keeps a report whose exchange endpoint has %s precision', (_n, p) => {
    const result = usdToJ(10000, { precision: p });
    const exchange = monthOf(result, '2026-01').exchanges[0];
    expect(exchange).toMatchObject({
      value: 10000,
      spread: null,
      source: { accountId: 'usd', native: -10000 },
      destination: {
        accountId: 'J',
        native: null,
        referenceRate: null,
        reasons: [{ reason: 'precision-unavailable', since: '2026-01-02' }],
      },
    });
    expect(accountOf(result, '2026-01', 'J').reasons).toContainEqual({
      reason: 'precision-unavailable',
      since: '2026-01-02',
    });
    healthy(result);
  });

  it.each([
    ['missing', null, 'native-missing'],
    ['fractional', 1.5, 'amount-out-of-range'],
    ['unsafe', 2 ** 60, 'amount-out-of-range'],
  ] as const)(
    'R3 reports a %s exchange native as unknown, not zero',
    (_n, native, reason) => {
      const result = usdToJ(native);
      expect(monthOf(result, '2026-01').exchanges).toEqual([
        expect.objectContaining({
          value: 10000,
          spread: null,
          source: expect.objectContaining({ native: -10000, reasons: [] }),
          destination: expect.objectContaining({
            native: null,
            reasons: [{ reason, since: '2026-01-02' }],
          }),
        }),
      ]);
      expect(accountOf(result, '2026-01', 'J').reasons).toContainEqual({
        reason,
        since: '2026-01-02',
      });
      healthy(result);
    },
  );

  it('R3 reports an unsafe principal base as unknown', () => {
    const result = usdToJ(10000, { base: 2 ** 53 });
    expect(monthOf(result, '2026-01').exchanges).toEqual([
      expect.objectContaining({
        value: null,
        spread: null,
        source: expect.objectContaining({ native: null }),
        destination: expect.objectContaining({ native: 10000 }),
      }),
    ]);
    expect(accountOf(result, '2026-01', 'J').reasons).toContainEqual({
      reason: 'amount-out-of-range',
      since: '2026-01-02',
    });
    healthy(result);
  });

  it('R3 does not value a stale endpoint in its current encoding', () => {
    const result = usdToJ(10000, { pair: '10000:10000@J~KWD.3' });
    expect(monthOf(result, '2026-01').exchanges).toEqual([
      expect.objectContaining({
        value: 10000,
        spread: null,
        source: expect.objectContaining({ native: -10000 }),
        destination: expect.objectContaining({ native: null }),
      }),
    ]);
    expect(accountOf(result, '2026-01', 'J').reasons).toContainEqual({
      reason: 'stale-encoding',
      since: '2026-01-02',
    });
  });

  // E3's source-fee family with the fee booked at feeBase.
  const e3 = (feeBase = -110) =>
    budget()
      .account('J')
      .account('usd', null)
      .rate('JPY', '100')
      .flow('j0', 'J', '2026-01-01', 10100, 10100)
      .row({
        id: 'jp',
        account: 'J',
        date: '2026-01-02',
        native: -10100,
        amount: -11000 + feeBase,
        isParent: true,
      })
      .row({
        id: 'jt',
        account: 'J',
        date: '2026-01-02',
        native: -10000,
        amount: -11000,
        parentId: 'jp',
        transferId: 'ut',
      })
      .row({
        id: 'jf',
        account: 'J',
        date: '2026-01-02',
        native: -100,
        amount: feeBase,
        parentId: 'jp',
      })
      .row({
        id: 'ut',
        account: 'usd',
        date: '2026-01-02',
        amount: 11000,
        transferId: 'jt',
      });

  it('R3 reports an unsafe fee base as unknown and keeps the fee native', () => {
    const result = e3(-(2 ** 53)).run({ endMonth: '2026-01' });
    expect(monthOf(result, '2026-01').exchanges[0].source).toMatchObject({
      native: -10000,
      fee: -100,
      feeBooked: null,
    });
    expect(monthOf(result, '2026-01').diagnostics.fees).toBeNull();
  });

  it.each([
    ['before', '2026-01-01'],
    ['after', '2026-01-05'],
  ])(
    'R5 keeps fee expense known beside a malformed ordinary amount %s the fee',
    (_when, date) => {
      const result = e3()
        .flow('m1', 'J', date, 1, 2 ** 53)
        .run();
      const january = accountOf(result, '2026-01', 'J');
      expect(january.feeExpense).toBe(-110);
      expect(january.closing.booked).toBeNull();
      expect(monthOf(result, '2026-01').total.feeExpense).toBe(-110);
      expect(accountOf(result, '2026-02', 'J').feeExpense).toBe(0);
    },
  );

  it('R5 leaves an unsafe actual fee unknown', () => {
    const result = e3(-(2 ** 53)).run();
    expect(accountOf(result, '2026-01', 'J').feeExpense).toBeNull();
    expect(monthOf(result, '2026-01').total.feeExpense).toBeNull();
  });

  // R4: an ordinary remainder beyond Number safety stays exact or becomes
  // explicitly incomplete; it never turns into zero.
  it('R4 keeps a large split remainder exact or explicitly incomplete', () => {
    const b = budget().rate('JPY', '100').account('A');
    for (const i of [1, 2, 3, 4]) b.account(`B${i}`);
    b.account('C').row({
      id: 'zz',
      account: 'A',
      date: '2026-01-01',
      native: MAX,
      amount: MAX,
      isParent: true,
    });
    for (const i of [1, 2, 3, 4]) {
      b.row({
        id: `a${i}`,
        account: 'A',
        date: '2026-01-01',
        native: -MAX,
        amount: -MAX,
        parentId: 'zz',
        transferId: `b${i}`,
      }).row({
        id: `b${i}`,
        account: `B${i}`,
        date: '2026-01-01',
        native: MAX,
        amount: MAX,
        transferId: `a${i}`,
      });
    }
    for (const i of [1, 2, 3, 4, 5]) {
      b.row({
        id: `o${i}`,
        account: 'A',
        date: '2026-01-01',
        native: MAX,
        amount: MAX,
        parentId: 'zz',
      });
    }
    b.transfer('2026-01-02', ['x', 'A', -100], ['y', 'C', 100], 200);
    const { events } = validateFxEvents(b.s);
    const net = events.find(e => e.id === 'zz');
    expect(net).toMatchObject({
      kind: 'flow',
      leg: { native: 11258999068426235n, base: 11258999068426235n },
    });
    const result = b.run({ endMonth: '2026-01' });
    expect(accountOf(result, '2026-01', 'A').closing.native).toBe(MAX - 100);
    expect(accountOf(result, '2026-01', 'A').reasons).toContainEqual({
      reason: 'amount-out-of-range',
      since: '2026-01-01',
    });
    expect(accountOf(result, '2026-01', 'C')).toMatchObject({
      reasons: [
        {
          reason: 'amount-out-of-range',
          since: '2026-01-02',
          fromAccountId: 'A',
        },
      ],
      closing: { native: 100, booked: 200, basis: null },
    });
  });
});

describe('Sol inspection round 2', () => {
  // F1: rejected transfer children move at their own pairs' canonical ids,
  // around a healthy C-to-A transfer that sorts between them.
  const siblings = (y1: number, z1: number) =>
    budget()
      .account('A')
      .account('B')
      .account('C')
      .account('D')
      .rate('JPY', '100')
      .flow('a0', 'A', '2026-01-01', 1000, 1000)
      .row({
        id: 'P',
        account: 'A',
        date: '2026-01-02',
        native: -2000 + y1,
        amount: -200 + y1 / 10,
        isParent: true,
      })
      .row({
        id: 'a1',
        account: 'A',
        date: '2026-01-02',
        native: -2000,
        amount: -200,
        parentId: 'P',
        transferId: 'b1',
      })
      .row({
        id: 'b1',
        account: 'B',
        date: '2026-01-02',
        native: 1000,
        amount: 200,
        transferId: 'a1',
      })
      .row({
        id: 'y1',
        account: 'A',
        date: '2026-01-02',
        native: y1,
        amount: y1 / 10,
        parentId: 'P',
        transferId: 'z1',
      })
      .row({
        id: 'z1',
        account: 'D',
        date: '2026-01-02',
        native: z1,
        amount: -y1 / 10,
        transferId: 'y1',
      })
      .transfer('2026-01-02', ['c1', 'C', -500], ['d1', 'A', 500], 50)
      .flow('c2', 'C', '2026-01-03', 500, 75);

  it.each([
    ['cancelling', 2000, -1000, 1500],
    ['non-cancelling', 3000, -1000, 2500],
  ])(
    'F1 keeps rejected %s siblings in their own chronology',
    (_name, y1, z1, closingA) => {
      for (const reversed of [false, true]) {
        for (const accountIds of [null, ['C']]) {
          const b = siblings(y1, z1);
          if (reversed) b.s.rows.reverse();
          const result = b.run({ endMonth: '2026-01', accountIds });
          expect(accountOf(result, '2026-01', 'C')).toMatchObject({
            realized: null,
            gap: -25,
            reasons: [
              {
                reason: 'transfer-quantity-mismatch',
                since: '2026-01-02',
                fromAccountId: 'A',
              },
            ],
            closing: { native: 0, booked: 25, basis: null, value: 0 },
          });
          if (accountIds === null) {
            expect(accountOf(result, '2026-01', 'A').closing.native).toBe(
              closingA,
            );
          }
        }
      }
      const { events } = validateFxEvents(siblings(y1, z1).s);
      expect(
        events.flatMap(e =>
          e.kind === 'position'
            ? [[e.id, e.leg.account, e.leg.native, e.leg.base]]
            : [],
        ),
      ).toEqual([
        ['a1', 'A', -2000n, -200n],
        ['a1', 'B', 1000n, 200n],
        ['y1', 'A', BigInt(y1), BigInt(y1 / 10)],
        ['y1', 'D', BigInt(z1), BigInt(-y1 / 10)],
      ]);
    },
  );

  it('F1 moves a broken child link at its own id, once', () => {
    const b = budget()
      .account('A')
      .account('C')
      .rate('JPY', '100')
      .flow('a0', 'A', '2026-01-01', 1000, 1000)
      .row({
        id: 'P',
        account: 'A',
        date: '2026-01-02',
        native: 1000,
        amount: 1000,
        isParent: true,
      })
      .row({
        id: 'a1',
        account: 'A',
        date: '2026-01-02',
        native: -2000,
        amount: -2000,
        parentId: 'P',
        transferId: 'gone',
      })
      .row({
        id: 'y1',
        account: 'A',
        date: '2026-01-02',
        native: 3000,
        amount: 3000,
        parentId: 'P',
        transferId: 'lost',
      })
      .transfer('2026-01-02', ['c1', 'C', -500], ['d1', 'A', 500], 500);
    const { events } = validateFxEvents(b.s);
    expect(
      events.flatMap(e =>
        e.kind === 'position' ? [[e.id, e.leg.account, e.leg.native]] : [],
      ),
    ).toEqual([
      ['a1', 'A', -2000n],
      ['y1', 'A', 3000n],
    ]);
    expect(
      accountOf(b.run({ endMonth: '2026-01' }), '2026-01', 'C').reasons,
    ).toEqual([
      {
        reason: 'transfer-link-broken',
        since: '2026-01-02',
        fromAccountId: 'A',
      },
    ]);
  });

  // F2: an ambiguous family's fee attribution is unknown for that exchange
  // and endpoint only.
  type Kid = [string, number, number];
  const family = (
    b: ReturnType<typeof budget>,
    owner: string,
    date: string,
    transfer: [string, number, number, string],
    others: Kid[],
    parentNative?: number,
  ) => {
    const kids = [transfer, ...others];
    const sum = (i: 1 | 2) => kids.reduce((total, kid) => total + kid[i], 0);
    b.row({
      id: `${owner}p${date}`,
      account: owner,
      date,
      native: owner === 'usd' ? null : (parentNative ?? sum(2)),
      amount: sum(1),
      isParent: true,
    });
    for (const [i, [id, base, native]] of kids.entries()) {
      b.row({
        id,
        account: owner,
        date,
        native: owner === 'usd' ? null : native,
        amount: base,
        parentId: `${owner}p${date}`,
        ...(i === 0 && { transferId: transfer[3] }),
      });
    }
    return b;
  };
  const healthy = () =>
    budget('2026-02-14')
      .account('A')
      .account('B')
      .account('usd', null)
      .rate('JPY', '100')
      .flow('b0', 'B', '2026-01-01', 1000, 1000);
  const exchangeOf = (result: FxImpactResult, month = '2026-01') =>
    monthOf(result, month).exchanges[0];

  it('F2 N8 on the source: unknown source fee, known everything else', () => {
    const b = healthy().row({
      id: 'u',
      account: 'usd',
      date: '2026-01-05',
      amount: 1000,
      transferId: 't',
    });
    family(
      b,
      'A',
      '2026-01-05',
      ['t', -1000, -1000, 'u'],
      [
        ['f1', -10, -10],
        ['f2', -10, -10],
      ],
    );
    for (const accountIds of [null, ['A'], ['usd']]) {
      const result = b.run({ accountIds });
      expect(exchangeOf(result)).toMatchObject({
        value: 1000,
        spread: 0,
        source: {
          accountId: 'A',
          native: -1000,
          fee: null,
          feeBooked: null,
          reasons: [
            { reason: 'exchange-family-ambiguous', since: '2026-01-05' },
          ],
        },
        destination: {
          accountId: 'usd',
          native: 1000,
          fee: 0,
          feeBooked: 0,
          reasons: [],
        },
      });
      expect(monthOf(result, '2026-01').diagnostics.fees).toBeNull();
      if (accountIds?.[0] === 'A') {
        expect(monthOf(result, '2026-01').total.feeExpense).toBeNull();
      }
      if (accountIds?.[0] === 'usd') {
        expect(monthOf(result, '2026-01').total.feeExpense).toBe(0);
      }
    }
    expect(accountOf(b.run(), '2026-01', 'B').reasons).toEqual([]);
  });

  it.each([
    ['N9 positive sibling', [['f1', 10, 10]] as Kid[], undefined],
    ['N11 unequal sums', [['f1', -10, -10]] as Kid[], -1500],
  ])('F2 %s leaves the source fee unknown', (_name, others, parentNative) => {
    const b = healthy().row({
      id: 'u',
      account: 'usd',
      date: '2026-01-05',
      amount: 1000,
      transferId: 't',
    });
    family(
      b,
      'A',
      '2026-01-05',
      ['t', -1000, -1000, 'u'],
      others,
      parentNative,
    );
    expect(exchangeOf(b.run())).toMatchObject({
      source: { fee: null, feeBooked: null },
      destination: { fee: 0, feeBooked: 0 },
    });
  });

  it('F2 N8 on the destination and on a budget-currency endpoint', () => {
    const destination = healthy().row({
      id: 'u',
      account: 'usd',
      date: '2026-01-05',
      amount: -1000,
      transferId: 't',
    });
    family(
      destination,
      'A',
      '2026-01-05',
      ['t', 1000, 1000, 'u'],
      [
        ['f1', -10, -10],
        ['f2', -10, -10],
      ],
    );
    expect(exchangeOf(destination.run())).toMatchObject({
      value: 1000,
      source: { accountId: 'usd', native: -1000, fee: 0, feeBooked: 0 },
      destination: { accountId: 'A', native: 1000, fee: null, feeBooked: null },
    });
    const budgetSide = healthy().row({
      id: 't',
      account: 'A',
      date: '2026-01-05',
      native: 1000,
      amount: 1000,
      transferId: 'u',
    });
    family(
      budgetSide,
      'usd',
      '2026-01-05',
      ['u', -1000, -1000, 't'],
      [
        ['f1', -10, -10],
        ['f2', -10, -10],
      ],
    );
    const result = budgetSide.run();
    expect(exchangeOf(result)).toMatchObject({
      source: { accountId: 'usd', native: -1000, fee: null, feeBooked: null },
      destination: { accountId: 'A', native: 1000, fee: 0, feeBooked: 0 },
      spread: 0,
    });
    expect(monthOf(result, '2026-01').diagnostics.fees).toBeNull();
  });

  it('F2 N10 fees on both ends leaves both fees unknown', () => {
    const b = healthy();
    family(b, 'A', '2026-01-05', ['t', -1000, -1000, 'u'], [['f1', -10, -10]]);
    family(b, 'usd', '2026-01-05', ['u', 1000, 1000, 't'], [['g1', -10, -10]]);
    expect(exchangeOf(b.run())).toMatchObject({
      source: { fee: null, feeBooked: null },
      destination: { fee: null, feeBooked: null },
    });
  });

  it('F2 keeps later and valid exchanges independent of an earlier ambiguity', () => {
    const b = healthy().flow('a0', 'A', '2026-01-01', 5000, 5000).row({
      id: 'u',
      account: 'usd',
      date: '2026-01-05',
      amount: 1000,
      transferId: 't',
    });
    family(
      b,
      'A',
      '2026-01-05',
      ['t', -1000, -1000, 'u'],
      [
        ['f1', -10, -10],
        ['f2', -10, -10],
      ],
    );
    // February: a fee-free exchange, then a valid source fee and a fee
    // rounded to zero, all on A after its January ambiguity.
    b.transfer('2026-02-02', ['t2', 'A', -1000], ['u2', 'usd', null], 1000)
      .row({
        id: 'u3',
        account: 'usd',
        date: '2026-02-03',
        amount: 1000,
        transferId: 't3',
      })
      .row({
        id: 'u4',
        account: 'usd',
        date: '2026-02-04',
        amount: 1000,
        transferId: 't4',
      });
    family(
      b,
      'A',
      '2026-02-03',
      ['t3', -1000, -1000, 'u3'],
      [['f3', -100, -100]],
    );
    family(b, 'A', '2026-02-04', ['t4', -1000, -1000, 'u4'], [['f4', 0, 0]]);
    const result = b.run();
    const february = monthOf(result, '2026-02');
    expect(
      february.exchanges.map(e => [e.id, e.source.fee, e.source.feeBooked]),
    ).toEqual([
      ['t2', 0, 0],
      ['t3', -100, -100],
      ['t4', 0, 0],
    ]);
    expect(february.diagnostics.fees).toBe(-100);
    // A's own cumulative fee expense stays unknown after January.
    expect(accountOf(result, '2026-02', 'A').feeExpense).toBeNull();
  });
});

describe('request validation', () => {
  it.each([
    { startMonth: '2026-13' },
    { startMonth: '2026-02', endMonth: '2026-01' },
    { startMonth: '2015-01', endMonth: '2026-01' },
    { accountIds: 'A' as never },
    { currencies: {} as never },
  ])('rejects %j', request => {
    expect(() => f1().run(request)).toThrow('fx-impact-request-invalid');
  });

  it('returns no months for a range after the current month', () => {
    expect(
      f1().run({ startMonth: '2026-03', endMonth: '2026-04' }).months,
    ).toEqual([]);
  });

  it('clamps the end month and lists unknown ids', () => {
    const result = f1().run({
      endMonth: '2026-06',
      accountIds: ['A', 'missing'],
    });
    expect(result.endMonth).toBe('2026-02');
    expect(result.unknownAccountIds).toEqual(['missing']);
  });
});
