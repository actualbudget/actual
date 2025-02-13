import LhvLhvbee22 from '../lhv-lhvbee22.js';

describe('#normalizeTransaction', () => {
  const bookedCardTransaction = {
    transactionId: '2025010300000000-1',
    bookingDate: '2025-01-03',
    valueDate: '2025-01-03',
    transactionAmount: {
      amount: '-22.99',
      currency: 'EUR',
    },
    creditorName: null,
    remittanceInformationUnstructured:
      '(..1234) 2025-01-02 09:32 CrustumOU\\Poordi 3\\Tallinn\\10156     ESTEST',
    bankTransactionCode: 'PMNT-CCRD-POSD',
    internalTransactionId: 'fa000f86afb2cc7678bcff0000000000',
  };

  it('extracts booked card transaction creditor name', () => {
    expect(
      LhvLhvbee22.normalizeTransaction(bookedCardTransaction, true)
        .creditorName,
    ).toEqual('CrustumOU');
  });

  it('extracts booked card transaction date', () => {
    expect(
      LhvLhvbee22.normalizeTransaction(bookedCardTransaction, true).bookingDate,
    ).toEqual('2025-01-02');

    expect(
      LhvLhvbee22.normalizeTransaction(bookedCardTransaction, true).date,
    ).toEqual('2025-01-02');
  });

  it.each([
    ['regular text', 'Some info'],
    ['partial card text', 'PIRKUMS xxx'],
    ['null value', null],
    ['invalid date', '(..1234) 2025-13-45 09:32 Merchant\\Address'],
  ])('normalizes non-card transaction with %s', (_, remittanceInfo) => {
    const transaction = {
      ...bookedCardTransaction,
      remittanceInformationUnstructured: remittanceInfo,
    };
    const normalized = LhvLhvbee22.normalizeTransaction(transaction, true);

    expect(normalized.bookingDate).toEqual('2025-01-03');
    expect(normalized.date).toEqual('2025-01-03');
  });

  const pendingCardTransaction = {
    transactionId: '2025010300000000-1',
    valueDate: '2025-01-03',
    transactionAmount: {
      amount: '-22.99',
      currency: 'EUR',
    },
    remittanceInformationUnstructured:
      '(..1234) 2025-01-02 09:32 CrustumOU\\Poordi 3\\Tallinn\\10156     ESTEST',
  };

  it('extracts pending card transaction creditor name', () => {
    expect(
      LhvLhvbee22.normalizeTransaction(pendingCardTransaction, false)
        .creditorName,
    ).toEqual('CrustumOU');
  });

  it('extracts pending card transaction date', () => {
    expect(
      LhvLhvbee22.normalizeTransaction(pendingCardTransaction, false)
        .bookingDate,
    ).toEqual(undefined);

    expect(
      LhvLhvbee22.normalizeTransaction(pendingCardTransaction, false).date,
    ).toEqual('2025-01-03');
  });
});
