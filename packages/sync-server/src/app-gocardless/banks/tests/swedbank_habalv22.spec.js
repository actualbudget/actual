import SwedbankHabaLV22 from '../swedbank_habalv22.js';

describe('#normalizeTransaction', () => {
  const bookedCardTransaction = {
    transactionId: '2024102900000000-1',
    bookingDate: '2024-10-29',
    valueDate: '2024-10-29',
    transactionAmount: {
      amount: '-22.99',
      currency: 'EUR',
    },
    creditorName: 'SOME CREDITOR NAME',
    remittanceInformationUnstructured:
      'PIRKUMS 424242******4242 28.10.2024 22.99 EUR (111111) SOME CREDITOR NAME',
    bankTransactionCode: 'PMNT-CCRD-POSD',
    internalTransactionId: 'fa000f86afb2cc7678bcff0000000000',
  };

  it('extracts card transaction date', () => {
    expect(
      SwedbankHabaLV22.normalizeTransaction(bookedCardTransaction, true)
        .bookingDate,
    ).toEqual('2024-10-28');

    expect(
      SwedbankHabaLV22.normalizeTransaction(bookedCardTransaction, true).date,
    ).toEqual('2024-10-28');
  });

  it.each([
    ['regular text', 'Some info'],
    ['partial card text', 'PIRKUMS xxx'],
    ['null value', null],
  ])('normalizes non-card transaction with %s', (_, remittanceInfo) => {
    const transaction = {
      ...bookedCardTransaction,
      remittanceInformationUnstructured: remittanceInfo,
    };
    const normalized = SwedbankHabaLV22.normalizeTransaction(transaction, true);

    expect(normalized.bookingDate).toEqual('2024-10-29');
    expect(normalized.date).toEqual('2024-10-29');
  });

  const pendingCardTransaction = {
    transactionId: '2024102900000000-1',
    valueDate: '2024-10-29',
    transactionAmount: {
      amount: '-22.99',
      currency: 'EUR',
    },
    remittanceInformationUnstructured:
      'PIRKUMS 424242******4242 28.10.24 13:37 22.99 EUR (111111) SOME CREDITOR NAME',
  };

  it('extracts pending card transaction creditor name', () => {
    expect(
      SwedbankHabaLV22.normalizeTransaction(pendingCardTransaction, false)
        .creditorName,
    ).toEqual('SOME CREDITOR NAME');
  });
});
