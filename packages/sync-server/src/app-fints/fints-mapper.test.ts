import type { Statement, Transaction } from 'lib-fints';

import {
  buildAccountId,
  classifyBankAnswers,
  mapStatements,
  parseAccountId,
} from './fints-mapper';

function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    valueDate: new Date(2026, 9, 1),
    entryDate: new Date(2026, 9, 1),
    fundsCode: '',
    amount: -12.34,
    transactionType: 'N',
    customerReference: 'NONREF',
    bankReference: 'NONREF',
    bookingText: 'Kartenzahlung',
    purpose: 'Bäckerei Müller  Filiale 3',
    remoteName: 'Bäckerei Müller',
    remoteAccountNumber: 'DE02120300000000202051',
    ...overrides,
  };
}

function statement(
  transactions: Transaction[],
  closing?: Statement['closingBalance'],
): Statement {
  return {
    openingBalance: {
      date: new Date(2026, 8, 30),
      currency: 'EUR',
      value: 100,
    },
    closingBalance: closing as Statement['closingBalance'],
    transactions,
  };
}

describe('account ids', () => {
  it('round-trips connection, account and sub-account', () => {
    const id = buildAccountId('conn-1', {
      accountNumber: '1234567',
      subAccountId: '01',
    });

    expect(id).toBe('conn-1|1234567|01');
    expect(parseAccountId(id)).toEqual({
      connectionId: 'conn-1',
      accountNumber: '1234567',
      subAccountId: '01',
    });
  });

  it('omits an empty sub-account', () => {
    const id = buildAccountId('conn-1', { accountNumber: '1234567' });

    expect(id).toBe('conn-1|1234567');
    expect(parseAccountId(id)?.subAccountId).toBeUndefined();
  });

  it('rejects malformed ids', () => {
    expect(parseAccountId('conn-1')).toBeNull();
    expect(parseAccountId('a|b|c|d')).toBeNull();
  });
});

describe('mapStatements', () => {
  it('maps a booking to the shared bank sync shape', () => {
    const result = mapStatements(
      'acct',
      [statement([transaction()])],
      '2026-09-01',
      'EUR',
    );

    expect(result.transactions.all).toHaveLength(1);
    expect(result.transactions.pending).toEqual([]);
    expect(result.transactions.all[0]).toMatchObject({
      booked: true,
      date: '2026-10-01',
      payeeName: 'Bäckerei Müller',
      notes: 'Bäckerei Müller Filiale 3',
      creditorName: 'Bäckerei Müller',
      transactionAmount: { amount: -12.34, currency: 'EUR' },
    });
  });

  it('falls back to the booking text when there is no counterparty', () => {
    const result = mapStatements(
      'acct',
      [statement([transaction({ remoteName: undefined, amount: 5 })])],
      '2026-09-01',
      'EUR',
    );

    expect(result.transactions.all[0].payeeName).toBe('Kartenzahlung');
  });

  it('generates the same ids on every sync', () => {
    const first = mapStatements(
      'acct',
      [statement([transaction(), transaction({ amount: -1 })])],
      '2026-09-01',
      'EUR',
    );
    const second = mapStatements(
      'acct',
      [statement([transaction({ amount: -1 }), transaction()])],
      '2026-09-01',
      'EUR',
    );

    const ids = (result: typeof first) =>
      result.transactions.all.map(t => t.transactionId).sort();
    expect(ids(first)).toEqual(ids(second));
  });

  it('keeps identical bookings apart', () => {
    const result = mapStatements(
      'acct',
      [statement([transaction(), transaction()])],
      '2026-09-01',
      'EUR',
    );

    const [a, b] = result.transactions.all;
    expect(a.transactionId).not.toBe(b.transactionId);
  });

  it('separates the same booking on different accounts', () => {
    const one = mapStatements(
      'a',
      [statement([transaction()])],
      '2026-01-01',
      'EUR',
    );
    const two = mapStatements(
      'b',
      [statement([transaction()])],
      '2026-01-01',
      'EUR',
    );

    expect(one.transactions.all[0].transactionId).not.toBe(
      two.transactions.all[0].transactionId,
    );
  });

  it('drops bookings before the start date and sorts newest first', () => {
    const result = mapStatements(
      'acct',
      [
        statement([
          transaction({ entryDate: new Date(2026, 7, 31) }),
          transaction({ entryDate: new Date(2026, 8, 2), amount: -2 }),
          transaction({ entryDate: new Date(2026, 8, 5), amount: -3 }),
        ]),
      ],
      '2026-09-01',
      'EUR',
    );

    expect(result.transactions.all.map(t => t.date)).toEqual([
      '2026-09-05',
      '2026-09-02',
    ]);
  });

  it('uses the latest closing balance as the current balance', () => {
    const result = mapStatements(
      'acct',
      [
        statement([], {
          date: new Date(2026, 8, 1),
          currency: 'EUR',
          value: 50,
        }),
        statement([], {
          date: new Date(2026, 8, 2),
          currency: 'EUR',
          value: -20.5,
        }),
      ],
      '2026-09-01',
      'EUR',
    );

    expect(result.startingBalance).toBe(-2050);
    expect(result.balances[0]).toEqual({
      balanceAmount: { amount: '-20.50', currency: 'EUR' },
      balanceType: 'closingBooked',
      referenceDate: '2026-09-02',
    });
  });

  it('uses a separately fetched balance when there are no statements', () => {
    const result = mapStatements('acct', [], '2026-09-01', 'EUR', {
      date: new Date(2026, 9, 14),
      currency: 'EUR',
      balance: 1234.56,
      availableAmount: 2000,
    });

    expect(result.startingBalance).toBe(123456);
    expect(result.balances.map(b => b.balanceType)).toEqual([
      'closingBooked',
      'interimAvailable',
    ]);
  });
});

describe('classifyBankAnswers', () => {
  it('recognises a rejected PIN', () => {
    expect(
      classifyBankAnswers([
        { code: 3076, text: 'Keine starke Authentifizierung erforderlich' },
        { code: 9942, text: 'PIN falsch' },
      ]),
    ).toBe('credentials-rejected');
  });

  it('recognises a rejected TAN', () => {
    expect(classifyBankAnswers([{ code: 9941, text: 'TAN ungültig' }])).toBe(
      'tan-rejected',
    );
  });

  it('treats everything else as a general error', () => {
    expect(classifyBankAnswers([{ code: 9050, text: 'Fehler' }])).toBe('other');
  });
});
