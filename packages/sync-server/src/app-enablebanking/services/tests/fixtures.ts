export const mockAppId = 'test-app-id';

export const mockAspspsResponse = {
  aspsps: [
    { name: 'Nordea', logo: 'https://cdn.example.com/nordea.png' },
    { name: 'OP', logo: '' },
  ],
};

export const mockSessionResponse = {
  url: 'https://api.enablebanking.com/auth?session=abc123',
};

export const mockSessionsResponse = {
  session_id: 'sess-001',
};

export const mockAccountsResponse = {
  accounts: [
    {
      uid: 'acc-001',
      account_name: 'Checking',
      iban: 'FI2112345600000785',
      aspsp_name: 'Nordea',
    },
    {
      uid: 'acc-002',
      account_name: '',
      iban: 'FI2112345600000786',
      aspsp_name: 'Nordea',
    },
  ],
};

export const mockTransactionsPage1 = {
  transactions: [
    {
      entry_reference: 'tx-001',
      transaction_amount: { amount: '-12.50', currency: 'EUR' },
      booking_date: '2024-01-15',
      creditor_name: 'Supermarket',
      remittance_information: ['groceries'],
      entry_status: 'BOOK',
    },
    {
      entry_reference: 'tx-002',
      transaction_amount: { amount: '1000.00', currency: 'EUR' },
      booking_date: '2024-01-14',
      debtor_name: 'Employer',
      remittance_information: ['salary'],
      entry_status: 'BOOK',
    },
  ],
  continuation_key: 'page2-key',
};

export const mockTransactionsPage2 = {
  transactions: [
    {
      entry_reference: 'tx-003',
      transaction_amount: { amount: '-5.00', currency: 'EUR' },
      booking_date: '2024-01-10',
      entry_status: 'PENDING',
      remittance_information: [],
    },
  ],
  continuation_key: null,
};

export const mockBalancesResponse = {
  balances: [
    {
      balance_amount: { amount: '2345.67', currency: 'EUR' },
      balance_type: 'expected',
      reference_date: '2024-01-15',
    },
  ],
};

export const mockBalancesResponseClosingBooked = {
  balances: [
    {
      balance_amount: { amount: '1000.00', currency: 'EUR' },
      balance_type: 'closingBooked',
      reference_date: '2024-01-15',
    },
  ],
};
