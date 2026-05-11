import type { EnableBankingTransaction } from '#app-enablebanking/services/enablebanking-service';

export const mockAspsp = {
  name: 'Nordea',
  country: 'FI',
  logo: 'https://enablebanking.com/brands/FI/Nordea/',
  psu_types: ['personal'],
  beta: false,
};

export const mockAspspList = [
  mockAspsp,
  {
    name: 'OP Financial Group',
    country: 'FI',
    logo: null,
    psu_types: ['personal'],
    beta: false,
  },
  {
    name: 'Revolut',
    country: 'FI',
    logo: null,
    psu_types: ['personal'],
    beta: true,
  },
];

export const mockSessionAccount = {
  account_id: { iban: 'FI0455231152453547' },
  account_servicer: { bic_fi: 'NDEAFIHH', name: 'Nordea' },
  name: 'Current Account',
  currency: 'EUR',
  uid: '07cc67f4-45d6-494b-adac-09b5cbc7e2b5',
  identification_hash: 'abc123',
};

export const mockSessionAccountNoName = {
  account_id: { iban: 'FI9876543210000001' },
  account_servicer: { bic_fi: 'OKOYFIHH', name: 'OP' },
  currency: 'EUR',
  uid: '12345678-1234-1234-1234-123456789abc',
};

export const mockSessionAccountMinimal = {
  account_id: {},
  uid: 'aaaabbbb-cccc-dddd-eeee-ffff00001111',
};

export const mockSession = {
  session_id: 'test-session-id',
  accounts: [mockSessionAccount],
  aspsp: { name: 'Nordea', country: 'FI' },
  access: {
    valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
};

export const mockAuthResponse = {
  url: 'https://enablebanking.com/auth/redirect?session=abc',
  authorization_id: 'auth-id-123',
};

export const mockCreditTransaction = {
  entry_reference: 'ref-001',
  transaction_id: 'tx-001',
  transaction_amount: { currency: 'EUR', amount: '100.50' },
  creditor: { name: 'Salary Inc' },
  debtor: { name: 'My Employer' },
  credit_debit_indicator: 'CRDT',
  status: 'BOOK',
  booking_date: '2026-03-01',
  value_date: '2026-03-01',
  remittance_information: ['Monthly salary', 'March 2026'],
} satisfies EnableBankingTransaction;

export const mockDebitTransaction = {
  entry_reference: 'ref-002',
  transaction_amount: { currency: 'EUR', amount: '-25.99' },
  creditor: { name: 'Grocery Store' },
  debtor: { name: 'My Account' },
  credit_debit_indicator: 'DBIT',
  status: 'BOOK',
  booking_date: '2026-03-02',
  value_date: '2026-03-02',
  remittance_information: ['Groceries purchase'],
} satisfies EnableBankingTransaction;

export const mockPendingTransaction = {
  transaction_id: 'tx-003',
  transaction_amount: { currency: 'EUR', amount: '-10.00' },
  status: 'PDNG',
  value_date: '2026-03-03',
  remittance_information: ['Card payment'],
} satisfies EnableBankingTransaction;

export const mockTransactionNoPayee = {
  entry_reference: 'ref-004',
  transaction_amount: { currency: 'EUR', amount: '5.00' },
  status: 'BOOK',
  booking_date: '2026-03-04',
  remittance_information: ['Transfer from savings'],
} satisfies EnableBankingTransaction;

export const mockTransactionMinimal = {
  transaction_amount: { currency: 'EUR', amount: '1.23' },
  status: 'BOOK',
} satisfies EnableBankingTransaction;

export const mockBalance = {
  balance_amount: { currency: 'EUR', amount: '1234.56' },
  balance_type: 'CLAV',
  reference_date: '2026-03-24',
};

export const mockNegativeBalance = {
  balance_amount: { currency: 'EUR', amount: '-50.75' },
  balance_type: 'XPCD',
  reference_date: '2026-03-24',
};
