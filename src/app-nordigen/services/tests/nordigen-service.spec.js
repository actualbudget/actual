import { jest } from '@jest/globals';
import {
  InvalidInputDataError,
  InvalidNordigenTokenError,
  AccessDeniedError,
  NotFoundError,
  ResourceSuspended,
  RateLimitError,
  UnknownError,
  ServiceError,
  RequisitionNotLinked,
  AccountNotLinedToRequisition,
} from '../../errors.js';

import {
  mockedBalances,
  mockUnknownError,
  mockTransactions,
  mockDetailedAccount,
  mockInstitution,
  mockAccountMetaData,
  mockAccountDetails,
  mockRequisition,
  mockDeleteRequisition,
  mockCreateRequisition,
  mockRequisitionWithExampleAccounts,
  mockDetailedAccountExample1,
  mockDetailedAccountExample2,
  mockExtendAccountsAboutInstitutions,
} from './fixtures.js';

import {
  nordigenService,
  handleNordigenError,
  client,
} from '../nordigen-service.js';

describe('nordigenService', () => {
  const accountId = mockAccountMetaData.id;
  const requisitionId = mockRequisition.id;

  let getBalancesSpy;
  let getTransactionsSpy;
  let getDetailsSpy;
  let getMetadataSpy;
  let getInstitutionsSpy;
  let getInstitutionSpy;
  let getRequisitionsSpy;
  let deleteRequisitionsSpy;
  let createRequisitionSpy;
  let setTokenSpy;

  beforeEach(() => {
    getInstitutionsSpy = jest.spyOn(client, 'getInstitutions');
    getInstitutionSpy = jest.spyOn(client, 'getInstitutionById');
    getRequisitionsSpy = jest.spyOn(client, 'getRequisitionById');
    deleteRequisitionsSpy = jest.spyOn(client, 'deleteRequisition');
    createRequisitionSpy = jest.spyOn(client, 'initSession');
    getBalancesSpy = jest.spyOn(client, 'getBalances');
    getTransactionsSpy = jest.spyOn(client, 'getTransactions');
    getDetailsSpy = jest.spyOn(client, 'getDetails');
    getMetadataSpy = jest.spyOn(client, 'getMetadata');
    setTokenSpy = jest.spyOn(nordigenService, 'setToken');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('#getLinkedRequisition', () => {
    it('returns requisition', async () => {
      setTokenSpy.mockResolvedValue();

      jest
        .spyOn(nordigenService, 'getRequisition')
        .mockResolvedValue(mockRequisition);

      expect(await nordigenService.getLinkedRequisition(requisitionId)).toEqual(
        mockRequisition,
      );
    });

    it('throws RequisitionNotLinked error if requisition status is different than LN', async () => {
      setTokenSpy.mockResolvedValue();

      jest
        .spyOn(nordigenService, 'getRequisition')
        .mockResolvedValue({ ...mockRequisition, status: 'ER' });

      await expect(() =>
        nordigenService.getLinkedRequisition(requisitionId),
      ).rejects.toThrow(RequisitionNotLinked);
    });
  });

  describe('#getRequisitionWithAccounts', () => {
    it('returns combined data', async () => {
      jest
        .spyOn(nordigenService, 'getRequisition')
        .mockResolvedValue(mockRequisitionWithExampleAccounts);
      jest
        .spyOn(nordigenService, 'getDetailedAccount')
        .mockResolvedValueOnce(mockDetailedAccountExample1);
      jest
        .spyOn(nordigenService, 'getDetailedAccount')
        .mockResolvedValueOnce(mockDetailedAccountExample2);
      jest
        .spyOn(nordigenService, 'getInstitution')
        .mockResolvedValue(mockInstitution);
      jest
        .spyOn(nordigenService, 'extendAccountsAboutInstitutions')
        .mockResolvedValue([
          {
            ...mockExtendAccountsAboutInstitutions[0],
            institution_id: 'NEWONE',
          },
          {
            ...mockExtendAccountsAboutInstitutions[1],
            institution_id: 'NEWONE',
          },
        ]);

      const response = await nordigenService.getRequisitionWithAccounts(
        mockRequisitionWithExampleAccounts.id,
      );

      expect(response.accounts.length).toEqual(2);
      expect(response.accounts).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            account_id: mockDetailedAccountExample1.id,
            institution: mockInstitution,
            official_name: expect.stringContaining('integration-'), // It comes from IntegrationBank
          }),
          expect.objectContaining({
            account_id: mockDetailedAccountExample2.id,
            institution: mockInstitution,
            official_name: expect.stringContaining('integration-'), // It comes from IntegrationBank
          }),
        ]),
      );
      expect(response.requisition).toEqual(mockRequisitionWithExampleAccounts);
    });
  });

  describe('#getTransactionsWithBalance', () => {
    const requisitionId = mockRequisition.id;
    it('returns transaction with starting balance', async () => {
      jest
        .spyOn(nordigenService, 'getLinkedRequisition')
        .mockResolvedValue(mockRequisition);
      jest
        .spyOn(nordigenService, 'getAccountMetadata')
        .mockResolvedValue(mockAccountMetaData);
      jest
        .spyOn(nordigenService, 'getTransactions')
        .mockResolvedValue(mockTransactions);
      jest
        .spyOn(nordigenService, 'getBalances')
        .mockResolvedValue(mockedBalances);

      expect(
        await nordigenService.getTransactionsWithBalance(
          requisitionId,
          accountId,
          undefined,
          undefined,
        ),
      ).toEqual(
        expect.objectContaining({
          iban: mockAccountMetaData.iban,
          balances: mockedBalances.balances,
          institutionId: mockRequisition.institution_id,
          startingBalance: expect.any(Number),
          transactions: {
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

    it('throws AccountNotLinedToRequisition error if requisition accounts not includes requested account', async () => {
      jest
        .spyOn(nordigenService, 'getLinkedRequisition')
        .mockResolvedValue(mockRequisition);

      await expect(() =>
        nordigenService.getTransactionsWithBalance({
          requisitionId,
          accountId: 'some-unknown-account-id',
          startDate: undefined,
          endDate: undefined,
        }),
      ).rejects.toThrow(AccountNotLinedToRequisition);
    });
  });

  describe('#createRequisition', () => {
    const institutionId = 'some-institution-id';
    const params = {
      host: 'https://exemple.com',
      institutionId,
      accessValidForDays: 90,
    };

    it('calls nordigenClient and delete requisition', async () => {
      setTokenSpy.mockResolvedValue();

      createRequisitionSpy.mockResolvedValue(mockCreateRequisition);

      expect(await nordigenService.createRequisition(params)).toEqual({
        link: expect.any(String),
        requisitionId: expect.any(String),
      });

      expect(createRequisitionSpy).toBeCalledTimes(1);
    });

    it('handle error if status_code present in the response', async () => {
      setTokenSpy.mockResolvedValue();

      createRequisitionSpy.mockResolvedValue(mockUnknownError);

      await expect(() =>
        nordigenService.createRequisition(params),
      ).rejects.toThrow(UnknownError);
    });
  });

  describe('#deleteRequisition', () => {
    const requisitionId = 'some-requisition-id';

    it('calls nordigenClient and delete requisition', async () => {
      setTokenSpy.mockResolvedValue();

      getRequisitionsSpy.mockResolvedValue(mockRequisition);
      deleteRequisitionsSpy.mockResolvedValue(mockDeleteRequisition);

      expect(await nordigenService.deleteRequisition(requisitionId)).toEqual(
        mockDeleteRequisition,
      );

      expect(getRequisitionsSpy).toBeCalledTimes(1);
      expect(deleteRequisitionsSpy).toBeCalledTimes(1);
    });

    it('handle error if status_code present in the response', async () => {
      setTokenSpy.mockResolvedValue();

      getRequisitionsSpy.mockResolvedValue(mockRequisition);
      deleteRequisitionsSpy.mockReturnValue(mockUnknownError);

      await expect(() =>
        nordigenService.deleteRequisition(requisitionId),
      ).rejects.toThrow(UnknownError);
    });
  });

  describe('#getRequisition', () => {
    const requisitionId = 'some-requisition-id';

    it('calls nordigenClient and fetch requisition', async () => {
      setTokenSpy.mockResolvedValue();
      getRequisitionsSpy.mockResolvedValue(mockRequisition);

      expect(await nordigenService.getRequisition(requisitionId)).toEqual(
        mockRequisition,
      );

      expect(setTokenSpy).toBeCalledTimes(1);
      expect(getRequisitionsSpy).toBeCalledTimes(1);
    });

    it('handle error if status_code present in the response', async () => {
      setTokenSpy.mockResolvedValue();

      getRequisitionsSpy.mockReturnValue(mockUnknownError);

      await expect(() =>
        nordigenService.getRequisition(requisitionId),
      ).rejects.toThrow(UnknownError);
    });
  });

  describe('#getDetailedAccount', () => {
    it('returns merged object', async () => {
      getDetailsSpy.mockResolvedValue(mockAccountDetails);
      getMetadataSpy.mockResolvedValue(mockAccountMetaData);

      expect(await nordigenService.getDetailedAccount(accountId)).toEqual({
        ...mockAccountMetaData,
        ...mockAccountDetails.account,
      });
      expect(getDetailsSpy).toBeCalledTimes(1);
      expect(getMetadataSpy).toBeCalledTimes(1);
    });

    it('handle error if status_code present in the detailedAccount response', async () => {
      getDetailsSpy.mockResolvedValue(mockUnknownError);
      getMetadataSpy.mockResolvedValue(mockAccountMetaData);

      await expect(() =>
        nordigenService.getDetailedAccount(accountId),
      ).rejects.toThrow(UnknownError);

      expect(getDetailsSpy).toBeCalledTimes(1);
      expect(getMetadataSpy).toBeCalledTimes(1);
    });

    it('handle error if status_code present in the metadataAccount response', async () => {
      getDetailsSpy.mockResolvedValue(mockAccountDetails);
      getMetadataSpy.mockResolvedValue(mockUnknownError);

      await expect(() =>
        nordigenService.getDetailedAccount(accountId),
      ).rejects.toThrow(UnknownError);

      expect(getDetailsSpy).toBeCalledTimes(1);
      expect(getMetadataSpy).toBeCalledTimes(1);
    });
  });

  describe('#getInstitutions', () => {
    const country = 'IE';
    it('calls nordigenClient and fetch institution details', async () => {
      getInstitutionsSpy.mockResolvedValue([mockInstitution]);

      expect(await nordigenService.getInstitutions({ country })).toEqual([
        mockInstitution,
      ]);
      expect(getInstitutionsSpy).toBeCalledTimes(1);
    });

    it('handle error if status_code present in the response', async () => {
      getInstitutionsSpy.mockResolvedValue(mockUnknownError);

      await expect(() =>
        nordigenService.getInstitutions({ country }),
      ).rejects.toThrow(UnknownError);
    });
  });

  describe('#getInstitution', () => {
    const institutionId = 'fake-institution-id';
    it('calls nordigenClient and fetch institution details', async () => {
      getInstitutionSpy.mockResolvedValue(mockInstitution);

      expect(await nordigenService.getInstitution(institutionId)).toEqual(
        mockInstitution,
      );
      expect(getInstitutionSpy).toBeCalledTimes(1);
    });

    it('handle error if status_code present in the response', async () => {
      getInstitutionSpy.mockResolvedValue(mockUnknownError);

      await expect(() =>
        nordigenService.getInstitution(institutionId),
      ).rejects.toThrow(UnknownError);
    });
  });

  describe('#extendAccountsAboutInstitutions', () => {
    it('extends accounts with the corresponding institution', async () => {
      const institutionA = { ...mockInstitution, id: 'INSTITUTION_A' };
      const institutionB = { ...mockInstitution, id: 'INSTITUTION_B' };
      const accountAA = {
        ...mockDetailedAccount,
        id: 'AA',
        institution_id: 'INSTITUTION_A',
      };
      const accountBB = {
        ...mockDetailedAccount,
        id: 'BB',
        institution_id: 'INSTITUTION_B',
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

      const result = await nordigenService.extendAccountsAboutInstitutions({
        accounts,
        institutions,
      });

      expect(result).toEqual(expected);
    });

    it('returns accounts with missing institutions as null', async () => {
      const accountAA = {
        ...mockDetailedAccount,
        id: 'AA',
        institution_id: 'INSTITUTION_A',
      };
      const accountBB = {
        ...mockDetailedAccount,
        id: 'BB',
        institution_id: 'INSTITUTION_B',
      };

      const accounts = [accountAA, accountBB];

      const institutionA = { ...mockInstitution, id: 'INSTITUTION_A' };
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

      const result = await nordigenService.extendAccountsAboutInstitutions({
        accounts,
        institutions,
      });

      expect(result).toEqual(expected);
    });
  });

  describe('#getTransactions', () => {
    it('calls nordigenClient and fetch transactions for provided accountId', async () => {
      getTransactionsSpy.mockResolvedValue(mockTransactions);

      expect(
        await nordigenService.getTransactions({
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
                "bookingDate": "date",
                "debtorAccount": {
                  "iban": "string",
                },
                "debtorName": "string",
                "transactionAmount": {
                  "amount": "328.18",
                  "currency": "EUR",
                },
                "transactionId": "string",
                "valueDate": "date",
              },
              {
                "bankTransactionCode": "string",
                "bookingDate": "date",
                "transactionAmount": {
                  "amount": "947.26",
                  "currency": "EUR",
                },
                "transactionId": "string",
                "valueDate": "date",
              },
            ],
            "pending": [
              {
                "transactionAmount": {
                  "amount": "947.26",
                  "currency": "EUR",
                },
                "valueDate": "date",
              },
            ],
          },
        }
      `);
      expect(getTransactionsSpy).toBeCalledTimes(1);
    });

    it('handle error if status_code present in the response', async () => {
      getTransactionsSpy.mockResolvedValue(mockUnknownError);

      await expect(() =>
        nordigenService.getTransactions({
          accountId,
          startDate: '',
          endDate: '',
        }),
      ).rejects.toThrow(UnknownError);
    });
  });

  describe('#getBalances', () => {
    it('calls nordigenClient and fetch balances for provided accountId', async () => {
      getBalancesSpy.mockResolvedValue(mockedBalances);

      expect(await nordigenService.getBalances(accountId)).toEqual(
        mockedBalances,
      );
      expect(getBalancesSpy).toBeCalledTimes(1);
    });

    it('handle error if status_code present in the response', async () => {
      getBalancesSpy.mockResolvedValue(mockUnknownError);

      await expect(() =>
        nordigenService.getBalances(accountId),
      ).rejects.toThrow(UnknownError);
    });
  });
});

describe('#handleNordigenError', () => {
  it('throws InvalidInputDataError for status code 400', () => {
    const response = { status_code: 400 };
    expect(() => handleNordigenError(response)).toThrow(InvalidInputDataError);
  });

  it('throws InvalidNordigenTokenError for status code 401', () => {
    const response = { status_code: 401 };
    expect(() => handleNordigenError(response)).toThrow(
      InvalidNordigenTokenError,
    );
  });

  it('throws AccessDeniedError for status code 403', () => {
    const response = { status_code: 403 };
    expect(() => handleNordigenError(response)).toThrow(AccessDeniedError);
  });

  it('throws NotFoundError for status code 404', () => {
    const response = { status_code: 404 };
    expect(() => handleNordigenError(response)).toThrow(NotFoundError);
  });

  it('throws ResourceSuspended for status code 409', () => {
    const response = { status_code: 409 };
    expect(() => handleNordigenError(response)).toThrow(ResourceSuspended);
  });

  it('throws RateLimitError for status code 429', () => {
    const response = { status_code: 429 };
    expect(() => handleNordigenError(response)).toThrow(RateLimitError);
  });

  it('throws UnknownError for status code 500', () => {
    const response = { status_code: 500 };
    expect(() => handleNordigenError(response)).toThrow(UnknownError);
  });

  it('throws ServiceError for status code 503', () => {
    const response = { status_code: 503 };
    expect(() => handleNordigenError(response)).toThrow(ServiceError);
  });

  it('does not throw an error for status code 200', () => {
    const response = { status_code: 200 };
    expect(() => handleNordigenError(response)).not.toThrow();
  });

  it('does not throw an error when status code is not present', () => {
    const response = { foo: 'bar' };
    expect(() => handleNordigenError(response)).not.toThrow();
  });
});
