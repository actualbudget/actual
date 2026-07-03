import { describe, expect, it, vi } from 'vitest';

// The service statically imports the SDK; stub it so the module resolves
// without the (uninstalled) package. These tests exercise pure normalization
// helpers only, so the client is never invoked.
vi.mock('@open-banking-io/client', () => ({
  OpenBankingClient: { fromBundle: vi.fn() },
}));

const {
  isImportableTransaction,
  normalizeAccount,
  normalizeBalance,
  normalizeTransaction,
} = await import('../openbankingio-service');

const {
  mockAccount,
  mockAccountMinimal,
  mockAccountNoDisplayName,
  mockBalance,
  mockCreditTransaction,
  mockDebitTransaction,
  mockNegativeBalance,
  mockPendingTransaction,
  mockPendingTransactionNoDate,
  mockTransactionMinimal,
  mockTransactionNoPayee,
} = await import('./fixtures');

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

  it('should use creditor name for DBIT transactions and sign the amount negative', () => {
    const result = normalizeTransaction(mockDebitTransaction);
    expect(result.payeeName).toBe('Grocery Store');
    expect(result.booked).toBe(true);
    expect(result.transactionId).toBe('ref-002');
    // magnitude was unsigned '25.99' -> DBIT makes it negative
    expect(result.transactionAmount.amount).toBe('-25.99');
  });

  it('should sign CRDT magnitude positive', () => {
    const result = normalizeTransaction(mockCreditTransaction);
    expect(result.transactionAmount.amount).toBe('100.50');
  });

  it('should mark pending transactions as not booked', () => {
    const result = normalizeTransaction(mockPendingTransaction);
    expect(result.booked).toBe(false);
    expect(result.transactionId).toBe('tx-003');
    // DBIT indicator still applies to pending
    expect(result.transactionAmount.amount).toBe('-10.00');
  });

  it('treats the Berlin Group status verbatim: only PDNG is unbooked', () => {
    // The SDK forwards the raw Berlin Group status ('BOOK'/'PDNG'). Guard
    // against regressing to a lowercase compare, which marks pending booked.
    expect(
      normalizeTransaction({ ...mockDebitTransaction, status: 'PDNG' }).booked,
    ).toBe(false);
    expect(
      normalizeTransaction({ ...mockDebitTransaction, status: 'BOOK' }).booked,
    ).toBe(true);
    // Anything that isn't PDNG (incl. a missing status) is treated as booked.
    expect(
      normalizeTransaction({ ...mockDebitTransaction, status: undefined })
        .booked,
    ).toBe(true);
  });

  it('does not leak the SDK unsigned `amount`, so loot-core sees the signed value', () => {
    // loot-core does `if (!trans.amount) trans.amount = trans.transactionAmount.amount`
    // then decides payment/deposit via `trans.amount <= 0`. If we leaked the raw
    // unsigned magnitude as `amount`, every DBIT would import as a positive deposit.
    const debit = normalizeTransaction(mockDebitTransaction);
    expect(debit.amount).toBeUndefined();
    const asLootCoreSeesIt = debit.amount ?? debit.transactionAmount.amount;
    expect(Number(asLootCoreSeesIt)).toBeLessThan(0); // DBIT → payment

    const credit = normalizeTransaction(mockCreditTransaction);
    expect(credit.amount).toBeUndefined();
    expect(
      Number(credit.amount ?? credit.transactionAmount.amount),
    ).toBeGreaterThan(0); // CRDT → deposit
  });

  it('should fall back to remittanceInformation for payee when no creditor/debtor', () => {
    const result = normalizeTransaction(mockTransactionNoPayee);
    // No creditor/debtor names -> first cleaned remittance line is the payee
    expect(result.payeeName).toBe('Transfer from savings');
  });

  it('should join remittanceInformation with a space', () => {
    const result = normalizeTransaction(mockCreditTransaction);
    expect(result.remittanceInformationUnstructured).toBe(
      'Monthly salary March 2026',
    );
  });

  it('should handle minimal transaction with empty payee/id/date', () => {
    const result = normalizeTransaction(mockTransactionMinimal);
    expect(result.payeeName).toBe('');
    expect(result.transactionId).toBe('');
    expect(result.bookingDate).toBe('');
    expect(result.booked).toBe(true);
  });

  it('should fall back bookingDate to valueDate then transactionDate', () => {
    const noBookingDate = { ...mockCreditTransaction, bookingDate: undefined };
    expect(normalizeTransaction(noBookingDate).bookingDate).toBe('2026-03-01');

    const noBookingOrValueDate = {
      ...mockCreditTransaction,
      bookingDate: undefined,
      valueDate: undefined,
      transactionDate: '2026-02-28',
    };
    expect(normalizeTransaction(noBookingOrValueDate).bookingDate).toBe(
      '2026-02-28',
    );
  });

  it('should strip existing sign from the magnitude before applying indicator', () => {
    const result = normalizeTransaction({
      ...mockDebitTransaction,
      amount: '-25.99',
    });
    expect(result.transactionAmount.amount).toBe('-25.99');
  });

  it('should fall back notes to the SDK note field when remittance is empty', () => {
    const result = normalizeTransaction({
      ...mockCreditTransaction,
      remittanceInformation: undefined,
      note: 'a plain note',
    });
    expect(result.remittanceInformationUnstructured).toBeUndefined();
    expect(result.notes).toBe('a plain note');
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

  it('rejects a transaction with no clear credit/debit direction', () => {
    const normalized = normalizeTransaction({
      ...mockCreditTransaction,
      creditDebitIndicator: undefined,
    });
    // date + amount are fine; only the missing direction should drop it.
    expect(isImportableTransaction(normalized)).toBe(false);
  });

  it('rejects a non-ISO date', () => {
    const normalized = normalizeTransaction({
      ...mockCreditTransaction,
      bookingDate: '03/01/2026',
      valueDate: undefined,
      transactionDate: undefined,
    });
    expect(isImportableTransaction(normalized)).toBe(false);
  });

  it('rejects a non-numeric amount', () => {
    const normalized = normalizeTransaction({
      ...mockCreditTransaction,
      amount: 'n/a',
    });
    expect(isImportableTransaction(normalized)).toBe(false);
  });

  it('rejects an empty amount (Number("") would coerce to 0)', () => {
    const normalized = normalizeTransaction({
      ...mockCreditTransaction,
      amount: '',
    });
    expect(normalized.transactionAmount.amount).toBe('');
    expect(isImportableTransaction(normalized)).toBe(false);
  });
});

describe('SEPA prefix stripping', () => {
  it('strips EREF+ from a single line and from the payee fallback', () => {
    const tx = {
      id: 'tx-prefix-1',
      amount: '10.00',
      currency: 'EUR',
      creditDebitIndicator: 'CRDT',
      status: 'BOOK',
      bookingDate: '2026-04-01',
      remittanceInformation: ['EREF+invoice-42', 'thanks'],
    };
    const out = normalizeTransaction(tx);
    expect(out.payeeName).toBe('invoice-42');
    expect(out.remittanceInformationUnstructured).toBe('invoice-42 thanks');
  });

  it('accepts a remittanceInformation string (not just an array)', () => {
    const tx = {
      id: 'tx-prefix-str',
      amount: '10.00',
      currency: 'EUR',
      creditDebitIndicator: 'CRDT',
      status: 'BOOK',
      bookingDate: '2026-04-01',
      remittanceInformation: 'EREF+invoice-99',
    };
    const out = normalizeTransaction(tx);
    expect(out.remittanceInformationUnstructured).toBe('invoice-99');
    expect(out.payeeName).toBe('invoice-99');
  });

  it('preserves merchant tokens that look like prefixes but are not on the allowlist', () => {
    const tx = {
      id: 'tx-prefix-4',
      amount: '99.00',
      currency: 'EUR',
      creditDebitIndicator: 'DBIT',
      status: 'BOOK',
      bookingDate: '2026-04-04',
      remittanceInformation: [
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

describe('normalizeBalance', () => {
  it('should convert string amount to integer cents using the account currency', () => {
    const result = normalizeBalance(mockBalance, 'EUR');
    expect(result.balanceAmount.amount).toBe(123456);
    expect(result.balanceAmount.currency).toBe('EUR');
    expect(result.balanceType).toBe('ITBD');
  });

  it('should handle negative amounts', () => {
    const result = normalizeBalance(mockNegativeBalance, 'EUR');
    expect(result.balanceAmount.amount).toBe(-5075);
    expect(result.balanceType).toBe('XPCD');
  });

  it('should handle whole numbers', () => {
    const result = normalizeBalance({ type: 'ITBD', amount: '100' }, 'USD');
    expect(result.balanceAmount.amount).toBe(10000);
    expect(result.balanceAmount.currency).toBe('USD');
  });
});

describe('normalizeAccount', () => {
  it('maps id, prefers displayName, aspspName, and ITBD balance (cents)', () => {
    const result = normalizeAccount(mockAccount);
    expect(result).toEqual({
      account_id: '07cc67f4-45d6-494b-adac-09b5cbc7e2b5',
      name: 'Current Account',
      institution: 'Nordea',
      balance: 123456,
    });
  });

  it('falls back name to accountName when displayName is missing', () => {
    const result = normalizeAccount(mockAccountNoDisplayName);
    expect(result.name).toBe('Savings');
    expect(result.balance).toBe(50000);
  });

  it('falls back to id for name, Unknown for institution, and 0 balance when minimal', () => {
    const result = normalizeAccount(mockAccountMinimal);
    expect(result.name).toBe('aaaabbbb-cccc-dddd-eeee-ffff00001111');
    expect(result.institution).toBe('Unknown');
    expect(result.balance).toBe(0);
  });
});
