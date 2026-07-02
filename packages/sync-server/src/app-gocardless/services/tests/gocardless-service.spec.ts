import type { MockInstance } from 'vitest';

import {
  AccessDeniedError,
  AccountNotLinkedToRequisition,
  EndUserAgreementExpiredError,
  GenericGoCardlessError,
  InvalidGoCardlessTokenError,
  InvalidInputDataError,
  NotFoundError,
  RateLimitError,
  RequisitionNotLinked,
  ResourceSuspended,
  ServiceError,
  UnknownError,
} from '#app-gocardless/errors';
import type {
  GoCardlessAccountId,
  GoCardlessInstitutionId,
  GoCardlessRequisitionId,
} from '#app-gocardless/gocardless-node.types';
import { GoCardlessApiError } from '#app-gocardless/services/gocardless-api';
import {
  client,
  goCardlessService,
  handleGoCardlessError,
} from '#app-gocardless/services/gocardless-service';

import {
  mockAccountDetails,
  mockAccountMetaData,
  mockCreateRequisition,
  mockDeleteRequisition,
  mockDetailedAccount,
  mockDetailedAccountExample1,
  mockDetailedAccountExample2,
  mockedBalances,
  mockExtendAccountsAboutInstitutions,
  mockInstitution,
  mockRequisition,
  mockRequisitionWithExampleAccounts,
  mockTransactions,
} from './fixtures';

describe('goCardlessService', () => {
  const accountId = mockAccountMetaData.id;
  const requisitionId = mockRequisition.id;

  let getBalancesSpy: MockInstance;
  let getTransactionsSpy: MockInstance;
  let getDetailsSpy: MockInstance;
  let getMetadataSpy: MockInstance;
  let getInstitutionsSpy: MockInstance;
  let getInstitutionSpy: MockInstance;
  let getRequisitionsSpy: MockInstance;
  let deleteRequisitionsSpy: MockInstance;
  let createRequisitionSpy: MockInstance;
  let setTokenSpy: MockInstance;

  beforeEach(() => {
    getInstitutionsSpy = vi.spyOn(client, 'getInstitutions');
    getInstitutionSpy = vi.spyOn(client, 'getInstitutionById');
    getRequisitionsSpy = vi.spyOn(client, 'getRequisitionById');
    deleteRequisitionsSpy = vi.spyOn(client, 'deleteRequisition');
    createRequisitionSpy = vi.spyOn(client, 'initSession');
    getBalancesSpy = vi.spyOn(client, 'getBalances');
    getTransactionsSpy = vi.spyOn(client, 'getTransactions');
    getDetailsSpy = vi.spyOn(client, 'getDetails');
    getMetadataSpy = vi.spyOn(client, 'getMetadata');
    setTokenSpy = vi.spyOn(goCardlessService, 'setToken');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('#getLinkedRequisition', () => {
    it('returns requisition', async () => {
      setTokenSpy.mockResolvedValue(undefined);

      vi.spyOn(goCardlessService, 'getRequisition').mockResolvedValue(
        mockRequisition,
      );

      expect(
        await goCardlessService.getLinkedRequisition(requisitionId),
      ).toEqual(mockRequisition);
    });

    it('throws RequisitionNotLinked error if requisition status is different than LN', async () => {
      setTokenSpy.mockResolvedValue(undefined);

      vi.spyOn(goCardlessService, 'getRequisition').mockResolvedValue({
        ...mockRequisition,
        status: 'ER',
      });

      await expect(() =>
        goCardlessService.getLinkedRequisition(requisitionId),
      ).rejects.toThrow(RequisitionNotLinked);
    });
  });

  describe('#getRequisitionWithAccounts', () => {
    it('returns combined data', async () => {
      vi.spyOn(goCardlessService, 'getRequisition').mockResolvedValue(
        mockRequisitionWithExampleAccounts,
      );
      vi.spyOn(goCardlessService, 'getDetailedAccount').mockResolvedValueOnce(
        mockDetailedAccountExample1,
      );
      vi.spyOn(goCardlessService, 'getDetailedAccount').mockResolvedValueOnce(
        mockDetailedAccountExample2,
      );
      vi.spyOn(goCardlessService, 'getInstitution').mockResolvedValue(
        mockInstitution,
      );
      vi.spyOn(
        goCardlessService,
        'extendAccountsAboutInstitutions',
      ).mockResolvedValue([
        {
          ...mockExtendAccountsAboutInstitutions[0],
          institution_id: 'NEWONE' as GoCardlessInstitutionId,
        },
        {
          ...mockExtendAccountsAboutInstitutions[1],
          institution_id: 'NEWONE' as GoCardlessInstitutionId,
        },
      ]);

      const response = await goCardlessService.getRequisitionWithAccounts(
        mockRequisitionWithExampleAccounts.id,
      );

      expect(response.accounts.length).toEqual(2);
      expect(response.accounts).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            account_id: mockDetailedAccountExample1.id,
            institution: mockInstitution,
            official_name: 'Savings Account for Individuals (Retail)',
          }),
          expect.objectContaining({
            account_id: mockDetailedAccountExample2.id,
            institution: mockInstitution,
            official_name: 'Savings Account for Individuals (Retail)',
          }),
        ]),
      );
      expect(response.requisition).toEqual(mockRequisitionWithExampleAccounts);
    });
  });

  describe('#getTransactionsWithBalance', () => {
    const requisitionId = mockRequisition.id;
    it('returns transaction with starting balance', async () => {
      vi.spyOn(goCardlessService, 'getLinkedRequisition').mockResolvedValue(
        mockRequisition,
      );
      vi.spyOn(goCardlessService, 'getAccountMetadata').mockResolvedValue(
        mockAccountMetaData,
      );
      vi.spyOn(goCardlessService, 'getTransactions').mockResolvedValue(
        mockTransactions,
      );
      vi.spyOn(goCardlessService, 'getBalances').mockResolvedValue(
        mockedBalances,
      );

      expect(
        await goCardlessService.getTransactionsWithBalance(
          requisitionId,
          accountId,
          undefined,
          undefined,
        ),
      ).toEqual(
        expect.objectContaining({
          balances: mockedBalances.balances,
          institutionId: mockRequisition.institution_id,
          startingBalance: expect.any(Number),
          transactions: {
            all: expect.arrayContaining([
              expect.objectContaining({
                bookingDate: expect.any(String),
                transactionAmount: {
                  amount: expect.any(String),
                  currency: 'EUR',
                },
                transactionId: expect.any(String),
                valueDate: expect.any(String),
              }),
              expect.objectContaining({
                transactionAmount: {
                  amount: expect.any(String),
                  currency: 'EUR',
                },
                valueDate: expect.any(String),
              }),
            ]),
            booked: expect.arrayContaining([
              expect.objectContaining({
                bookingDate: expect.any(String),
                transactionAmount: {
                  amount: expect.any(String),
                  currency: 'EUR',
                },
                transactionId: expect.any(String),
                valueDate: expect.any(String),
              }),
            ]),
            pending: expect.arrayContaining([
              expect.objectContaining({
                transactionAmount: {
                  amount: expect.any(String),
                  currency: 'EUR',
                },
                valueDate: expect.any(String),
              }),
            ]),
          },
        }),
      );
    });

    it('throws AccountNotLinkedToRequisition error if requisition accounts not includes requested account', async () => {
      vi.spyOn(goCardlessService, 'getLinkedRequisition').mockResolvedValue(
        mockRequisition,
      );

      await expect(() =>
        goCardlessService.getTransactionsWithBalance(
          requisitionId,
          'some-unknown-account-id' as GoCardlessAccountId,
          undefined,
          undefined,
        ),
      ).rejects.toThrow(AccountNotLinkedToRequisition);
    });
  });

  describe('#createRequisition', () => {
    const institutionId = 'some-institution-id' as GoCardlessInstitutionId;
    const params = {
      host: 'https://exemple.com',
      institutionId,
      accessValidForDays: 90,
    };

    it('calls goCardlessClient and delete requisition', async () => {
      setTokenSpy.mockResolvedValue(undefined);
      getInstitutionSpy.mockResolvedValue(mockInstitution);

      createRequisitionSpy.mockResolvedValue(mockCreateRequisition);

      expect(await goCardlessService.createRequisition(params)).toEqual({
        link: expect.any(String),
        requisitionId: expect.any(String),
      });

      expect(createRequisitionSpy).toBeCalledTimes(1);
    });

    it('uses institution transaction_total_days for maxHistoricalDays by default', async () => {
      setTokenSpy.mockResolvedValue(undefined);
      getInstitutionSpy.mockResolvedValue({
        ...mockInstitution,
        transaction_total_days: '730',
      });
      createRequisitionSpy.mockResolvedValue(mockCreateRequisition);

      await goCardlessService.createRequisition(params);

      expect(createRequisitionSpy).toHaveBeenCalledWith(
        expect.objectContaining({ maxHistoricalDays: '730' }),
      );
    });

    it('caps maxHistoricalDays at 90 for banks with separate_continuous_history_consent', async () => {
      setTokenSpy.mockResolvedValue(undefined);
      getInstitutionSpy.mockResolvedValue({
        ...mockInstitution,
        transaction_total_days: '730',
        supported_features: ['separate_continuous_history_consent'],
      });
      createRequisitionSpy.mockResolvedValue(mockCreateRequisition);

      await goCardlessService.createRequisition(params);

      expect(createRequisitionSpy).toHaveBeenCalledWith(
        expect.objectContaining({ maxHistoricalDays: 90 }),
      );
    });
  });

  describe('#deleteRequisition', () => {
    const requisitionId = 'some-requisition-id' as GoCardlessRequisitionId;

    it('calls goCardlessClient and delete requisition', async () => {
      setTokenSpy.mockResolvedValue(undefined);

      getRequisitionsSpy.mockResolvedValue(mockRequisition);
      deleteRequisitionsSpy.mockResolvedValue(mockDeleteRequisition);

      expect(await goCardlessService.deleteRequisition(requisitionId)).toEqual(
        mockDeleteRequisition,
      );

      expect(getRequisitionsSpy).toBeCalledTimes(1);
      expect(deleteRequisitionsSpy).toBeCalledTimes(1);
    });
  });

  describe('#getRequisition', () => {
    const requisitionId = 'some-requisition-id' as GoCardlessRequisitionId;

    it('calls goCardlessClient and fetch requisition', async () => {
      setTokenSpy.mockResolvedValue(undefined);
      getRequisitionsSpy.mockResolvedValue(mockRequisition);

      expect(await goCardlessService.getRequisition(requisitionId)).toEqual(
        mockRequisition,
      );

      expect(setTokenSpy).toBeCalledTimes(1);
      expect(getRequisitionsSpy).toBeCalledTimes(1);
    });
  });

  describe('#getDetailedAccount', () => {
    it('returns merged object', async () => {
      getDetailsSpy.mockResolvedValue(mockAccountDetails);
      getMetadataSpy.mockResolvedValue(mockAccountMetaData);

      expect(await goCardlessService.getDetailedAccount(accountId)).toEqual({
        ...mockAccountMetaData,
        ...mockAccountDetails.account,
      });
      expect(getDetailsSpy).toBeCalledTimes(1);
      expect(getMetadataSpy).toBeCalledTimes(1);
    });

    it('metadata does not overwrite values from details with empty values', async () => {
      getDetailsSpy.mockResolvedValue({
        ...mockAccountDetails,
        account: {
          ...mockAccountDetails.account,
          name: 'An Actual Account Name',
        },
      });

      getMetadataSpy.mockResolvedValue({
        ...mockAccountMetaData,
        name: '',
      });

      expect(await goCardlessService.getDetailedAccount(accountId)).toEqual({
        ...mockAccountMetaData,
        ...mockAccountDetails.account,
        name: 'An Actual Account Name',
      });
    });
  });

  describe('#getInstitutions', () => {
    const country = 'IE';
    it('calls goCardlessClient and fetch institution details', async () => {
      getInstitutionsSpy.mockResolvedValue([mockInstitution]);

      expect(await goCardlessService.getInstitutions(country)).toEqual([
        mockInstitution,
      ]);
      expect(getInstitutionsSpy).toBeCalledTimes(1);
    });
  });

  describe('#getInstitution', () => {
    const institutionId = 'fake-institution-id' as GoCardlessInstitutionId;
    it('calls goCardlessClient and fetch institution details', async () => {
      getInstitutionSpy.mockResolvedValue(mockInstitution);

      expect(await goCardlessService.getInstitution(institutionId)).toEqual(
        mockInstitution,
      );
      expect(getInstitutionSpy).toBeCalledTimes(1);
    });
  });

  describe('#extendAccountsAboutInstitutions', () => {
    it('extends accounts with the corresponding institution', async () => {
      const institutionA = {
        ...mockInstitution,
        id: 'INSTITUTION_A' as GoCardlessInstitutionId,
      };
      const institutionB = {
        ...mockInstitution,
        id: 'INSTITUTION_B' as GoCardlessInstitutionId,
      };
      const accountAA = {
        ...mockDetailedAccount,
        id: 'AA' as GoCardlessAccountId,
        institution_id: 'INSTITUTION_A' as GoCardlessInstitutionId,
      };
      const accountBB = {
        ...mockDetailedAccount,
        id: 'BB' as GoCardlessAccountId,
        institution_id: 'INSTITUTION_B' as GoCardlessInstitutionId,
      };

      const accounts = [accountAA, accountBB];
      const institutions = [institutionA, institutionB];

      const expected = [
        {
          ...accountAA,
          institution: institutionA,
        },
        {
          ...accountBB,
          institution: institutionB,
        },
      ];

      const result = await goCardlessService.extendAccountsAboutInstitutions({
        accounts,
        institutions,
      });

      expect(result).toEqual(expected);
    });

    it('returns accounts with missing institutions as null', async () => {
      const accountAA = {
        ...mockDetailedAccount,
        id: 'AA' as GoCardlessAccountId,
        institution_id: 'INSTITUTION_A' as GoCardlessInstitutionId,
      };
      const accountBB = {
        ...mockDetailedAccount,
        id: 'BB' as GoCardlessAccountId,
        institution_id: 'INSTITUTION_B' as GoCardlessInstitutionId,
      };

      const accounts = [accountAA, accountBB];

      const institutionA = {
        ...mockInstitution,
        id: 'INSTITUTION_A' as GoCardlessInstitutionId,
      };
      const institutions = [institutionA];

      const expected = [
        {
          ...accountAA,
          institution: institutionA,
        },
        {
          ...accountBB,
          institution: null,
        },
      ];

      const result = await goCardlessService.extendAccountsAboutInstitutions({
        accounts,
        institutions,
      });

      expect(result).toEqual(expected);
    });
  });

  describe('#getTransactions', () => {
    it('calls goCardlessClient and fetch transactions for provided accountId', async () => {
      getTransactionsSpy.mockResolvedValue(mockTransactions);

      expect(
        await goCardlessService.getTransactions({
          institutionId: 'SANDBOXFINANCE_SFIN0000' as GoCardlessInstitutionId,
          accountId,
          startDate: '',
          endDate: '',
        }),
      ).toMatchInlineSnapshot(`
        {
          "transactions": {
            "booked": [
              {
                "bankTransactionCode": "string",
                "bookingDate": "2000-01-01",
                "date": "2000-01-01",
                "debtorAccount": {
                  "iban": "string",
                },
                "debtorName": "string",
                "notes": "",
                "payeeName": "String (stri XXX ring)",
                "remittanceInformationStructuredArrayString": undefined,
                "remittanceInformationUnstructuredArrayString": undefined,
                "transactionAmount": {
                  "amount": "328.18",
                  "currency": "EUR",
                },
                "transactionId": "string",
                "valueDate": "2000-01-01",
              },
              {
                "bankTransactionCode": "string",
                "bookingDate": "2000-01-01",
                "date": "2000-01-01",
                "notes": "",
                "payeeName": "",
                "remittanceInformationStructuredArrayString": undefined,
                "remittanceInformationUnstructuredArrayString": undefined,
                "transactionAmount": {
                  "amount": "947.26",
                  "currency": "EUR",
                },
                "transactionId": "string",
                "valueDate": "2000-01-01",
              },
            ],
            "pending": [
              {
                "date": "2000-01-01",
                "notes": "",
                "payeeName": "",
                "remittanceInformationStructuredArrayString": undefined,
                "remittanceInformationUnstructuredArrayString": undefined,
                "transactionAmount": {
                  "amount": "947.26",
                  "currency": "EUR",
                },
                "valueDate": "2000-01-01",
              },
            ],
          },
        }
      `);
      expect(getTransactionsSpy).toBeCalledTimes(1);
    });
  });

  describe('#getBalances', () => {
    it('calls goCardlessClient and fetch balances for provided accountId', async () => {
      getBalancesSpy.mockResolvedValue(mockedBalances);

      expect(await goCardlessService.getBalances(accountId)).toEqual(
        mockedBalances,
      );
      expect(getBalancesSpy).toBeCalledTimes(1);
    });
  });
});

describe('#handleGoCardlessError', () => {
  const apiError = (status: number) =>
    new GoCardlessApiError(`error: ${status}`, status, {});

  it('throws InvalidInputDataError for status code 400', () => {
    expect(() => handleGoCardlessError(apiError(400))).toThrow(
      InvalidInputDataError,
    );
  });

  it('throws InvalidGoCardlessTokenError for status code 401', () => {
    expect(() => handleGoCardlessError(apiError(401))).toThrow(
      InvalidGoCardlessTokenError,
    );
  });

  it('throws EndUserAgreementExpiredError for status code 401 with an expired EUA', () => {
    const error = apiError(401);
    error.response.data = {
      summary:
        'End User Agreement (EUA) 76c790ff-274b-46cc-8c5e-1aefb2bee25f has expired',
      detail:
        'EUA was valid for 90 days and it expired at 2026-06-30 15:57:27.203016+00:00. The end user must connect the account once more with new EUA and Requisition',
      status_code: 401,
    };

    expect(() => handleGoCardlessError(error)).toThrow(
      EndUserAgreementExpiredError,
    );
  });

  it('throws InvalidGoCardlessTokenError for status code 401 with an unrelated body', () => {
    const error = apiError(401);
    error.response.data = {
      summary: 'Authentication credentials were not provided.',
      status_code: 401,
    };

    expect(() => handleGoCardlessError(error)).toThrow(
      InvalidGoCardlessTokenError,
    );
  });

  it('throws AccessDeniedError for status code 403', () => {
    expect(() => handleGoCardlessError(apiError(403))).toThrow(
      AccessDeniedError,
    );
  });

  it('throws NotFoundError for status code 404', () => {
    expect(() => handleGoCardlessError(apiError(404))).toThrow(NotFoundError);
  });

  it('throws ResourceSuspended for status code 409', () => {
    expect(() => handleGoCardlessError(apiError(409))).toThrow(
      ResourceSuspended,
    );
  });

  it('throws RateLimitError for status code 429', () => {
    expect(() => handleGoCardlessError(apiError(429))).toThrow(RateLimitError);
  });

  it('throws UnknownError for status code 500', () => {
    expect(() => handleGoCardlessError(apiError(500))).toThrow(UnknownError);
  });

  it('throws ServiceError for status code 503', () => {
    expect(() => handleGoCardlessError(apiError(503))).toThrow(ServiceError);
  });

  it('throws GenericGoCardlessError for unrecognised status codes', () => {
    expect(() => handleGoCardlessError(apiError(0))).toThrow(
      GenericGoCardlessError,
    );
  });

  it('throws GenericGoCardlessError for non-API errors', () => {
    expect(() => handleGoCardlessError(new Error('network down'))).toThrow(
      GenericGoCardlessError,
    );
  });
});
