/** @type {{balances: import('../../gocardless-node.types.js').Balance[]}} */
export const mockedBalances = {
  balances: [
    {
      balanceAmount: {
        amount: '657.49',
        currency: 'string',
      },
      balanceType: 'interimAvailable',
      referenceDate: '2021-11-22',
    },
    {
      balanceAmount: {
        amount: '185.67',
        currency: 'string',
      },
      balanceType: 'interimAvailable',
      referenceDate: '2021-11-19',
    },
  ],
};

/** @type {{transactions: import('../../gocardless-node.types.js').Transactions}} */
export const mockTransactions = {
  transactions: {
    booked: [
      {
        transactionId: 'string',
        debtorName: 'string',
        debtorAccount: {
          iban: 'string',
        },
        transactionAmount: {
          currency: 'EUR',
          amount: '328.18',
        },
        bankTransactionCode: 'string',
        bookingDate: 'date',
        valueDate: 'date',
      },
      {
        transactionId: 'string',
        transactionAmount: {
          currency: 'EUR',
          amount: '947.26',
        },
        bankTransactionCode: 'string',
        bookingDate: 'date',
        valueDate: 'date',
      },
    ],
    pending: [
      {
        transactionAmount: {
          currency: 'EUR',
          amount: '947.26',
        },
        valueDate: 'date',
      },
    ],
  },
};

export const mockUnknownError = {
  summary: "Couldn't update account balances",
  detail: 'Request to Institution returned an error',
  type: 'UnknownRequestError',
  status_code: 500,
};

/** @type {{account: import('../../gocardless-node.types.js').GoCardlessAccountDetails}} */
export const mockAccountDetails = {
  account: {
    resourceId: 'PL00000000000000000987654321',
    iban: 'PL00000000000000000987654321',
    currency: 'PLN',
    ownerName: 'JOHN EXAMPLE',
    product: 'Savings Account for Individuals (Retail)',
    bic: 'INGBPLPW',
    ownerAddressUnstructured: ['EXAMPLE STREET 100/001', '00-000 EXAMPLE CITY'],
  },
};

/** @type {import('../../gocardless-node.types.js').GoCardlessAccountMetadata} */
export const mockAccountMetaData = {
  id: 'f0e49aa6-f6db-48fc-94ca-4a62372fadf4',
  created: '2022-07-24T20:45:47.847062Z',
  last_accessed: '2023-01-25T22:12:27.814618Z',
  iban: 'PL00000000000000000987654321',
  institution_id: 'SANDBOXFINANCE_SFIN0000',
  status: 'READY',
  owner_name: 'JOHN EXAMPLE',
};

/** @type {import('../../gocardless.types.js').DetailedAccount} */
export const mockDetailedAccount = {
  ...mockAccountDetails.account,
  ...mockAccountMetaData,
};

/** @type {import('../../gocardless-node.types.js').Institution} */
export const mockInstitution = {
  id: 'N26_NTSBDEB1',
  name: 'N26 Bank',
  bic: 'NTSBDEB1',
  transaction_total_days: '90',
  max_access_valid_for_days: '90',
  countries: ['GB', 'NO', 'SE'],
  logo: 'https://cdn.nordigen.com/ais/N26_SANDBOX_NTSBDEB1.png',
};

/** @type {import('../../gocardless-node.types.js').Requisition} */
export const mockRequisition = {
  id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  created: '2023-01-31T18:15:50.172Z',
  redirect: 'string',
  status: 'LN',
  institution_id: 'string',
  agreement: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  reference: 'string',
  accounts: ['f0e49aa6-f6db-48fc-94ca-4a62372fadf4'],
  user_language: 'string',
  link: 'https://ob.nordigen.com/psd2/start/3fa85f64-5717-4562-b3fc-2c963f66afa6/{$INSTITUTION_ID}',
  ssn: 'string',
  account_selection: false,
  redirect_immediate: false,
};

export const mockDeleteRequisition = {
  summary: 'Requisition deleted',
  detail:
    "Requisition '$REQUISITION_ID' deleted with all its End User Agreements",
};

export const mockCreateRequisition = {
  id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  created: '2023-02-01T15:53:29.481Z',
  redirect: 'string',
  status: 'CR',
  institution_id: 'string',
  agreement: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  reference: 'string',
  accounts: [],
  user_language: 'string',
  link: 'https://ob.nordigen.com/psd2/start/3fa85f64-5717-4562-b3fc-2c963f66afa6/{$INSTITUTION_ID}',
  ssn: 'string',
  account_selection: false,
  redirect_immediate: false,
};

/** @type {import('../../gocardless.types.js').DetailedAccount} */
export const mockDetailedAccountExample1 = {
  ...mockDetailedAccount,
  name: 'account-example-one',
};

/** @type {import('../../gocardless.types.js').DetailedAccount} */
export const mockDetailedAccountExample2 = {
  ...mockDetailedAccount,
  name: 'account-example-two',
};

/** @type {import('../../gocardless.types.js').DetailedAccountWithInstitution[]} */
export const mockExtendAccountsAboutInstitutions = [
  {
    ...mockDetailedAccountExample1,
    institution: mockInstitution,
  },
  {
    ...mockDetailedAccountExample2,
    institution: mockInstitution,
  },
];

export const mockRequisitionWithExampleAccounts = {
  ...mockRequisition,

  accounts: [mockDetailedAccountExample1.id, mockDetailedAccountExample2.id],
};

export const mockTransactionAmount = { amount: '100', currency: 'EUR' };
