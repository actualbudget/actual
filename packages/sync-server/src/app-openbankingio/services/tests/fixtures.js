// Fixtures mirror the shapes returned by the @open-banking-io/client SDK.

export const mockCreditTransaction = {
  id: 'ref-001',
  amount: '100.50',
  currency: 'EUR',
  creditDebitIndicator: 'CRDT',
  status: 'BOOK',
  bookingDate: '2026-03-01',
  valueDate: '2026-03-01',
  transactionDate: '2026-03-01',
  creditorName: 'Salary Inc',
  debtorName: 'My Employer',
  remittanceInformation: ['Monthly salary', 'March 2026'],
  note: 'salary note',
};

export const mockDebitTransaction = {
  id: 'ref-002',
  amount: '25.99',
  currency: 'EUR',
  creditDebitIndicator: 'DBIT',
  status: 'BOOK',
  bookingDate: '2026-03-02',
  valueDate: '2026-03-02',
  transactionDate: '2026-03-02',
  creditorName: 'Grocery Store',
  debtorName: 'My Account',
  remittanceInformation: ['Groceries purchase'],
};

export const mockPendingTransaction = {
  id: 'tx-003',
  amount: '10.00',
  currency: 'EUR',
  status: 'PDNG',
  creditDebitIndicator: 'DBIT',
  valueDate: '2026-03-03',
  transactionDate: '2026-03-03',
  remittanceInformation: ['Card payment'],
};

export const mockTransactionNoPayee = {
  id: 'ref-004',
  amount: '5.00',
  currency: 'EUR',
  creditDebitIndicator: 'CRDT',
  status: 'BOOK',
  bookingDate: '2026-03-04',
  remittanceInformation: ['Transfer from savings'],
};

export const mockTransactionMinimal = {
  amount: '1.23',
  currency: 'EUR',
  status: 'BOOK',
};

// A pending transaction with no booking/value/transaction date. Some ASPSPs
// return these; normalizeTransaction maps it to date: '', which Actual's client
// cannot insert.
export const mockPendingTransactionNoDate = {
  id: 'tx-no-date',
  amount: '7.50',
  currency: 'EUR',
  creditDebitIndicator: 'DBIT',
  status: 'PDNG',
  remittanceInformation: ['Card payment, not yet booked'],
};

export const mockBalance = {
  type: 'ITBD',
  amount: '1234.56',
};

export const mockNegativeBalance = {
  type: 'XPCD',
  amount: '-50.75',
};

export const mockAccount = {
  id: '07cc67f4-45d6-494b-adac-09b5cbc7e2b5',
  displayName: 'Current Account',
  accountName: 'Checking',
  ownerName: 'Jane Doe',
  iban: 'FI0455231152453547',
  aspspName: 'Nordea',
  currency: 'EUR',
  balances: [
    { type: 'ITBD', amount: '1234.56' },
    { type: 'XPCD', amount: '1200.00' },
  ],
};

export const mockAccountNoDisplayName = {
  id: '12345678-1234-1234-1234-123456789abc',
  accountName: 'Savings',
  ownerName: 'Jane Doe',
  iban: 'FI9876543210000001',
  aspspName: 'OP',
  currency: 'EUR',
  balances: [{ type: 'ITBD', amount: '500.00' }],
};

export const mockAccountMinimal = {
  id: 'aaaabbbb-cccc-dddd-eeee-ffff00001111',
  currency: 'EUR',
  balances: [],
};
