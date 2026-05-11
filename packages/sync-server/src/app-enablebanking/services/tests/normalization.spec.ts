import { describe, expect, it } from 'vitest';

import {
  normalizeAccount,
  normalizeBalance,
  normalizeTransaction,
} from '#app-enablebanking/services/enablebanking-service';

import {
  mockBalance,
  mockCreditTransaction,
  mockDebitTransaction,
  mockNegativeBalance,
  mockPendingTransaction,
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

describe('normalizeBalance', () => {
  it('should convert string amount to integer cents', () => {
    const result = normalizeBalance(mockBalance);
    expect(result.balanceAmount.amount).toBe(123456);
    expect(result.balanceAmount.currency).toBe('EUR');
    expect(result.balanceType).toBe('CLAV');
    expect(result.referenceDate).toBe('2026-03-24');
  });

  it('should handle negative amounts', () => {
    const result = normalizeBalance(mockNegativeBalance);
    expect(result.balanceAmount.amount).toBe(-5075);
    expect(result.balanceType).toBe('XPCD');
  });

  it('should handle whole numbers', () => {
    const result = normalizeBalance({
      balance_amount: { currency: 'EUR', amount: '100' },
      balance_type: 'CLAV',
    });
    expect(result.balanceAmount.amount).toBe(10000);
  });
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
