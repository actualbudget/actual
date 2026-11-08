import { describe, expect, it } from 'vitest';

import type { EnableBankingTransaction } from '#app-enablebanking/services/enablebanking-service';
import {
  isImportableTransaction,
  normalizeAccount,
  normalizeBalance,
  normalizeTransaction,
  normalizeTransactions,
} from '#app-enablebanking/services/enablebanking-service';

import {
  mockBalance,
  mockCreditTransaction,
  mockDebitTransaction,
  mockNegativeBalance,
  mockPendingTransaction,
  mockPendingTransactionNoDate,
  mockSessionAccount,
  mockSessionAccountMinimal,
  mockSessionAccountNoName,
  mockTransactionMinimal,
  mockTransactionNoPayee,
} from './fixtures';

describe('normalizeTransaction', () => {
  it('should use debtor name for CRDT transactions', () => {
    const result = normalizeTransaction(mockCreditTransaction);
    expect(result.payeeName).toBe('My Employer');
    expect(result.booked).toBe(true);
    expect(result.transactionId).toBe('ref-001');
    expect(result.bookingDate).toBe('2026-03-01');
    expect(result.valueDate).toBe('2026-03-01');
    expect(result.transactionAmount).toEqual({
      amount: '100.50',
      currency: 'EUR',
    });
  });

  it('should use creditor name for DBIT transactions', () => {
    const result = normalizeTransaction(mockDebitTransaction);
    expect(result.payeeName).toBe('Grocery Store');
    expect(result.booked).toBe(true);
    expect(result.transactionId).toBe('ref-002');
    expect(result.transactionAmount.amount).toBe('-25.99');
  });

  // GH #9165: a missing counterparty must not select the account holder.
  it('should not use the account holder as payee for DBIT when creditor is missing', () => {
    const result = normalizeTransaction({
      ...mockDebitTransaction,
      creditor: null,
      debtor: { name: 'Account Holder' },
      transaction_amount: { currency: 'EUR', amount: '-21.58' },
      booking_date: '2026-10-02',
      remittance_information: ['Card purchase at Example Merchant'],
    });

    expect(result).toMatchObject({
      transactionAmount: { amount: '-21.58', currency: 'EUR' },
      bookingDate: '2026-10-02',
      notes: 'Card purchase at Example Merchant',
    });
    expect(result.payeeName).toBe('Card purchase at Example Merchant');
  });

  it('should not use the account holder as payee for CRDT when debtor is missing', () => {
    const result = normalizeTransaction({
      ...mockCreditTransaction,
      debtor: undefined,
      creditor: { name: 'Account Holder' },
    });

    expect(result.payeeName).toBe('Monthly salary');
  });

  it.each(['DBIT', 'CRDT'] as const)(
    'should use cleaned remittance for %s with an empty counterparty name',
    credit_debit_indicator => {
      const result = normalizeTransaction({
        ...mockDebitTransaction,
        credit_debit_indicator,
        creditor: {
          name: credit_debit_indicator === 'DBIT' ? '' : 'Account Holder',
        },
        debtor: {
          name: credit_debit_indicator === 'CRDT' ? null : 'Account Holder',
        },
        remittance_information: [
          'EREF+',
          'SVWZ+Merchant description',
          'Extra notes',
        ],
      });

      expect(result.payeeName).toBe('Merchant description');
      expect(result.notes).toBe('Merchant description Extra notes');
    },
  );

  it.each(['DBIT', 'CRDT'] as const)(
    'should leave payee empty for %s when counterparty and usable remittance are absent',
    credit_debit_indicator => {
      const result = normalizeTransaction({
        ...mockDebitTransaction,
        credit_debit_indicator,
        creditor:
          credit_debit_indicator === 'DBIT'
            ? undefined
            : { name: 'Account Holder' },
        debtor:
          credit_debit_indicator === 'CRDT' ? null : { name: 'Account Holder' },
        remittance_information: ['EREF+', ' '],
      });

      expect(result.payeeName).toBe('');
      expect(result.notes).toBeUndefined();
    },
  );

  it.each([
    {
      creditor: { name: 'Creditor' },
      debtor: { name: 'Debtor' },
      expected: 'Creditor',
    },
    { creditor: null, debtor: { name: 'Debtor' }, expected: 'Debtor' },
  ])(
    'should preserve party fallback without a direction: $expected',
    ({ creditor, debtor, expected }) => {
      const result = normalizeTransaction({
        ...mockDebitTransaction,
        credit_debit_indicator: undefined,
        creditor,
        debtor,
      });

      expect(result.payeeName).toBe(expected);
      expect(result.transactionAmount.amount).toBe('-25.99');
    },
  );

  it('keeps the balance after a transaction in the shared shape', () => {
    const result = normalizeTransaction({
      ...mockDebitTransaction,
      balance_after_transaction: { currency: 'JPY', amount: '6000' },
    });
    expect(result.balanceAfterTransaction).toEqual({
      balanceType: 'interimBooked',
      balanceAmount: { currency: 'JPY', amount: '6000' },
    });
    expect(
      normalizeTransaction(mockDebitTransaction).balanceAfterTransaction,
    ).toBeUndefined();
  });

  it('should mark PDNG transactions as not booked', () => {
    const result = normalizeTransaction(mockPendingTransaction);
    expect(result.booked).toBe(false);
    expect(result.transactionId).toBe('tx-003');
  });

  it('should preserve original sign when credit_debit_indicator is absent', () => {
    const result = normalizeTransaction(mockPendingTransaction);
    expect(result.transactionAmount.amount).toBe('-10.00');
  });

  it('should fall back to remittance_information for payee when no creditor/debtor', () => {
    const result = normalizeTransaction(mockTransactionNoPayee);
    expect(result.payeeName).toBe('Transfer from savings');
  });

  it('should join remittance_information with space', () => {
    const result = normalizeTransaction(mockCreditTransaction);
    expect(result.remittanceInformationUnstructured).toBe(
      'Monthly salary March 2026',
    );
  });

  it('should handle minimal transaction with empty payee', () => {
    const result = normalizeTransaction(mockTransactionMinimal);
    expect(result.payeeName).toBe('');
    expect(result.transactionId).toBe('');
    expect(result.bookingDate).toBe('');
    expect(result.booked).toBe(true);
  });

  it('should prefer entry_reference over transaction_id', () => {
    const result = normalizeTransaction(mockCreditTransaction);
    expect(result.transactionId).toBe('ref-001');
  });

  it('should fall back booking_date to value_date then transaction_date', () => {
    const noBookingDate = {
      ...mockCreditTransaction,
      booking_date: undefined,
    };
    expect(normalizeTransaction(noBookingDate).bookingDate).toBe('2026-03-01'); // falls back to value_date

    const noBookingOrValueDate = {
      ...mockCreditTransaction,
      booking_date: undefined,
      value_date: undefined,
      transaction_date: '2026-02-28',
    };
    expect(normalizeTransaction(noBookingOrValueDate).bookingDate).toBe(
      '2026-02-28',
    );
  });
});

describe('isImportableTransaction', () => {
  it('accepts a normal booked transaction (ISO date + numeric amount)', () => {
    expect(
      isImportableTransaction(normalizeTransaction(mockCreditTransaction)),
    ).toBe(true);
  });

  it('accepts a pending transaction that carries a date (no regression)', () => {
    expect(
      isImportableTransaction(normalizeTransaction(mockPendingTransaction)),
    ).toBe(true);
  });

  it('rejects a pending transaction with no date (the case that aborts the sync)', () => {
    const normalized = normalizeTransaction(mockPendingTransactionNoDate);
    expect(normalized.date).toBe('');
    expect(normalized.booked).toBe(false);
    expect(isImportableTransaction(normalized)).toBe(false);
  });

  it('rejects a non-ISO date', () => {
    const normalized = normalizeTransaction({
      ...mockCreditTransaction,
      booking_date: '03/01/2026',
      value_date: undefined,
      transaction_date: undefined,
    });
    expect(isImportableTransaction(normalized)).toBe(false);
  });

  it('rejects a non-numeric amount', () => {
    const normalized = normalizeTransaction({
      ...mockCreditTransaction,
      transaction_amount: { currency: 'EUR', amount: 'n/a' },
    });
    expect(isImportableTransaction(normalized)).toBe(false);
  });

  it('rejects an empty amount (Number("") would coerce to 0)', () => {
    const normalized = normalizeTransaction({
      ...mockCreditTransaction,
      transaction_amount: { currency: 'EUR', amount: '' },
    });
    expect(normalized.transactionAmount.amount).toBe('');
    expect(isImportableTransaction(normalized)).toBe(false);
  });
});

describe('SEPA prefix stripping', () => {
  it('strips EREF+ from a single line', () => {
    const tx = {
      transaction_id: 'tx-prefix-1',
      transaction_amount: { currency: 'EUR', amount: '10.00' },
      credit_debit_indicator: 'CRDT' as const,
      status: 'BOOK' as const,
      booking_date: '2026-04-01',
      remittance_information: ['EREF+invoice-42', 'thanks'],
    };
    const out = normalizeTransaction(tx);
    expect(out.payeeName).toBe('invoice-42');
    expect(out.remittanceInformationUnstructured).toBe('invoice-42 thanks');
  });

  it('drops empty entries after stripping', () => {
    const tx = {
      transaction_id: 'tx-prefix-2',
      transaction_amount: { currency: 'EUR', amount: '5.00' },
      credit_debit_indicator: 'CRDT' as const,
      status: 'BOOK' as const,
      booking_date: '2026-04-02',
      remittance_information: ['EREF+', 'paid'],
    };
    const out = normalizeTransaction(tx);
    expect(out.remittanceInformationUnstructured).toBe('paid');
  });

  it('returns undefined when stripping leaves nothing', () => {
    const tx = {
      transaction_id: 'tx-prefix-3',
      transaction_amount: { currency: 'EUR', amount: '5.00' },
      credit_debit_indicator: 'CRDT' as const,
      status: 'BOOK' as const,
      booking_date: '2026-04-02',
      remittance_information: ['EREF+'],
    };
    const out = normalizeTransaction(tx);
    expect(out.remittanceInformationUnstructured).toBeUndefined();
  });

  it('preserves merchant tokens that look like prefixes but are not on the allowlist', () => {
    const tx = {
      transaction_id: 'tx-prefix-4',
      transaction_amount: { currency: 'EUR', amount: '99.00' },
      credit_debit_indicator: 'DBIT' as const,
      status: 'BOOK' as const,
      booking_date: '2026-04-04',
      remittance_information: [
        'BMW+ Service Vertrag',
        'USB+HDMI Kabel',
        'COVID+ Test Apotheke',
      ],
    };
    const out = normalizeTransaction(tx);
    expect(out.remittanceInformationUnstructured).toBe(
      'BMW+ Service Vertrag USB+HDMI Kabel COVID+ Test Apotheke',
    );
    expect(out.payeeName).toBe('BMW+ Service Vertrag');
  });
});

describe('normalizeTransaction shape for bank-sync mapping', () => {
  it('exposes notes equal to remittanceInformationUnstructured', () => {
    const tx = {
      transaction_id: 'tx-notes-1',
      transaction_amount: { currency: 'EUR', amount: '12.34' },
      credit_debit_indicator: 'CRDT' as const,
      status: 'BOOK' as const,
      booking_date: '2026-04-03',
      remittance_information: ['hello world'],
    };
    const out = normalizeTransaction(tx);
    expect(out.notes).toBe('hello world');
    expect(out.notes).toBe(out.remittanceInformationUnstructured);
  });

  it('spreads the raw fields onto the normalized object', () => {
    const tx = {
      entry_reference: 'ref-raw-1',
      transaction_id: 'tx-raw-1',
      transaction_amount: { currency: 'EUR', amount: '12.34' },
      creditor: { name: 'Acme' },
      credit_debit_indicator: 'DBIT' as const,
      status: 'BOOK' as const,
      booking_date: '2026-04-03',
    };
    const out = normalizeTransaction(tx);
    expect(out.entry_reference).toBe('ref-raw-1');
    expect(out.creditor).toEqual({ name: 'Acme' });
    expect(out.credit_debit_indicator).toBe('DBIT');
  });
});

describe('normalizeTransactions without a bank-provided id', () => {
  // Shape reported for an ABN AMRO fee: an empty entry_reference and no
  // transaction_id.
  const feeWithoutId = {
    entry_reference: '',
    transaction_amount: { currency: 'EUR', amount: '8.35' },
    creditor: { name: 'ABN AMRO Bank N.V.' },
    credit_debit_indicator: 'DBIT' as const,
    status: 'BOOK' as const,
    booking_date: '2026-08-26',
    remittance_information: ['BasisPakket Betalen 4,30', 'Betaalpas 1,50'],
  };

  const idOf = (tx: EnableBankingTransaction) =>
    normalizeTransactions([tx])[0].transactionId;

  it('derives an id instead of leaving it empty', () => {
    expect(idOf(feeWithoutId)).toMatch(/^derived-[0-9a-f]+$/);
  });

  it('derives the same id for the same transaction on a later sync', () => {
    expect(idOf(feeWithoutId)).toBe(idOf({ ...feeWithoutId }));
  });

  it.each([
    ['date', { booking_date: '2026-08-27' }],
    ['amount', { transaction_amount: { currency: 'EUR', amount: '8.36' } }],
    ['direction', { credit_debit_indicator: 'CRDT' as const }],
    ['counterparty', { creditor: { name: 'Another Bank' } }],
    ['remittance text', { remittance_information: ['Something else'] }],
  ])('derives a different id when the %s differs', (_field, change) => {
    expect(idOf({ ...feeWithoutId, ...change })).not.toBe(idOf(feeWithoutId));
  });

  it('keeps the id when a pending transaction becomes booked', () => {
    expect(idOf({ ...feeWithoutId, status: 'PDNG' })).toBe(idOf(feeWithoutId));
  });

  it('keeps the id when a pending transaction is booked on a later date', () => {
    // While pending there is no booking date yet; the date of the purchase
    // itself is the one that stays the same.
    const pending = {
      ...feeWithoutId,
      status: 'PDNG' as const,
      booking_date: undefined,
      transaction_date: '2026-08-25',
    };
    const booked = {
      ...feeWithoutId,
      booking_date: '2026-08-26',
      transaction_date: '2026-08-25',
    };

    expect(idOf(pending)).toBe(idOf(booked));
  });

  it('keeps the id when a pending transaction with only a value date is booked on a later date', () => {
    // Some banks send no transaction_date at all. The value date is then the
    // only date the pending entry has, and it stays the same once booked.
    const pending = {
      ...feeWithoutId,
      status: 'PDNG' as const,
      booking_date: undefined,
      value_date: '2026-08-25',
    };
    const booked = {
      ...feeWithoutId,
      booking_date: '2026-08-26',
      value_date: '2026-08-25',
    };

    expect(idOf(pending)).toBe(idOf(booked));
  });

  it('gives identical transactions in one response distinct, repeatable ids', () => {
    // Two genuinely separate postings (e.g. two identical tolls on one day).
    const sync = () =>
      normalizeTransactions([feeWithoutId, feeWithoutId]).map(
        tx => tx.transactionId,
      );

    const [first, second] = sync();
    expect(first).not.toBe(second);
    expect(sync()).toEqual([first, second]);
  });

  it('numbers a booked transaction before an identical pending one', () => {
    // A pending entry can still disappear or be booked. Numbering it first
    // would hand its id to the booked entry afterwards, and the sync would
    // then update the wrong transaction.
    const pending = { ...feeWithoutId, status: 'PDNG' as const };

    const [pendingId, bookedId] = normalizeTransactions([
      pending,
      feeWithoutId,
    ]).map(tx => tx.transactionId);
    const [bookedAloneId] = normalizeTransactions([feeWithoutId]).map(
      tx => tx.transactionId,
    );

    expect(bookedId).toBe(bookedAloneId);
    expect(pendingId).not.toBe(bookedId);
  });

  it('does not let a transaction that cannot be imported take a number', () => {
    // The first entry is dropped later for its unusable date. If it took the
    // first number, the valid entry would change id once it is gone.
    const valid = { ...feeWithoutId, transaction_date: '2026-08-25' };
    const unimportable = { ...valid, booking_date: '26/08/2026' };

    const [unimportableId, validId] = normalizeTransactions([
      unimportable,
      valid,
    ]).map(tx => tx.transactionId);

    expect(validId).toBe(idOf(valid));
    expect(unimportableId).toBe('');
  });

  it('keeps transactions in the order the bank sent them', () => {
    const pending = { ...feeWithoutId, status: 'PDNG' as const };

    expect(
      normalizeTransactions([pending, feeWithoutId]).map(tx => tx.booked),
    ).toEqual([false, true]);
  });
});

describe('normalizeBalance', () => {
  it('preserves the decimal amount string', () => {
    const result = normalizeBalance(mockBalance);
    expect(result.balanceAmount.amount).toBe('1234.56');
    expect(result.balanceAmount.currency).toBe('EUR');
    expect(result.balanceType).toBe('CLAV');
    expect(result.referenceDate).toBe('2026-03-24');
  });

  it('should handle negative amounts', () => {
    const result = normalizeBalance(mockNegativeBalance);
    expect(result.balanceAmount.amount).toBe('-50.75');
    expect(result.balanceType).toBe('XPCD');
  });

  it('should handle whole numbers', () => {
    const result = normalizeBalance({
      balance_amount: { currency: 'EUR', amount: '100' },
      balance_type: 'CLAV',
    });
    expect(result.balanceAmount.amount).toBe('100');
  });

  it('keeps a third decimal place', () => {
    const result = normalizeBalance({
      balance_amount: { currency: 'KWD', amount: '1.234' },
      balance_type: 'CLAV',
    });
    expect(result.balanceAmount.amount).toBe('1.234');
  });

  it.each(['', '1e3', '1.2.3', ' 1.00', 'NaN'])(
    'rejects invalid balance %s',
    amount => {
      expect(() =>
        normalizeBalance({
          balance_amount: { currency: 'EUR', amount },
          balance_type: 'CLAV',
        }),
      ).toThrow('Invalid Enable Banking balance');
    },
  );
});

describe('normalizeAccount', () => {
  it('should use uid as account_id', () => {
    const result = normalizeAccount(mockSessionAccount);
    expect(result.account_id).toBe('07cc67f4-45d6-494b-adac-09b5cbc7e2b5');
  });

  it('should use name when available and aspsp name for institution', () => {
    const result = normalizeAccount(mockSessionAccount, { name: 'Nordea' });
    expect(result.name).toBe('Current Account');
    expect(result.institution).toBe('Nordea');
  });

  it('should fall back to iban when name is missing', () => {
    const result = normalizeAccount(mockSessionAccountNoName);
    expect(result.name).toBe('FI9876543210000001');
  });

  it('should fall back to uid when both name and iban are missing', () => {
    const result = normalizeAccount(mockSessionAccountMinimal);
    expect(result.name).toBe('aaaabbbb-cccc-dddd-eeee-ffff00001111');
  });

  it('should fall back to account_servicer name for institution', () => {
    const result = normalizeAccount(mockSessionAccount);
    expect(result.institution).toBe('Nordea'); // from account_servicer
  });

  it('should use Unknown when no institution info available', () => {
    const result = normalizeAccount(mockSessionAccountMinimal);
    expect(result.institution).toBe('Unknown');
  });
});
