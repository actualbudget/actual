import BankFactory from '../bank-factory.js';
import {
  RequisitionNotLinked,
  AccountNotLinedToRequisition,
  InvalidInputDataError,
  InvalidNordigenTokenError,
  AccessDeniedError,
  NotFoundError,
  ResourceSuspended,
  RateLimitError,
  UnknownError,
  ServiceError,
} from '../errors.js';
import * as nordigenNode from 'nordigen-node';
import * as uuid from 'uuid';
import config from '../../load-config.js';
import jwt from 'jws';

const NordigenClient = nordigenNode.default;
const nordigenClient = new NordigenClient({
  secretId: config.nordigen?.secretId,
  secretKey: config.nordigen?.secretKey,
});

export const handleNordigenError = (response) => {
  switch (response.status_code) {
    case 400:
      throw new InvalidInputDataError(response);
    case 401:
      throw new InvalidNordigenTokenError(response);
    case 403:
      throw new AccessDeniedError(response);
    case 404:
      throw new NotFoundError(response);
    case 409:
      throw new ResourceSuspended(response);
    case 429:
      throw new RateLimitError(response);
    case 500:
      throw new UnknownError(response);
    case 503:
      throw new ServiceError(response);
    default:
      return;
  }
};

export const nordigenService = {
  /**
   * Check if the Nordigen service is configured to be used.
   * @returns {boolean}
   */
  isConfigured: () => {
    return !!(nordigenClient.secretId && nordigenClient.secretKey);
  },

  /**
   *
   * @returns {Promise<void>}
   */
  setToken: async () => {
    const isExpiredJwtToken = (token) => {
      const decodedToken = jwt.decode(token);
      if (!decodedToken) {
        return true;
      }
      const payload = decodedToken.payload;
      const clockTimestamp = Math.floor(Date.now() / 1000);
      return clockTimestamp >= payload.exp;
    };

    if (isExpiredJwtToken(nordigenClient.token)) {
      // Generate new access token. Token is valid for 24 hours
      // Note: access_token is automatically injected to other requests after you successfully obtain it
      const tokenData = await client.generateToken();
      handleNordigenError(tokenData);
    }
  },

  /**
   *
   * @param requisitionId
   * @throws {RequisitionNotLinked} Will throw an error if requisition is not in Linked
   * @throws {InvalidInputDataError}
   * @throws {InvalidNordigenTokenError}
   * @throws {AccessDeniedError}
   * @throws {NotFoundError}
   * @throws {ResourceSuspended}
   * @throws {RateLimitError}
   * @throws {UnknownError}
   * @throws {ServiceError}
   * @returns {Promise<import('../nordigen-node.types.js').Requisition>}
   */
  getLinkedRequisition: async (requisitionId) => {
    const requisition = await nordigenService.getRequisition(requisitionId);

    const { status } = requisition;

    // Continue only if status of requisition is "LN" what does
    // mean that account has been successfully linked to requisition
    if (status !== 'LN') {
      throw new RequisitionNotLinked({ requisitionStatus: status });
    }

    return requisition;
  },

  /**
   * Returns requisition and all linked accounts in their Bank format.
   * Each account object is extended about details of the institution
   * @param requisitionId
   * @throws {RequisitionNotLinked} Will throw an error if requisition is not in Linked
   * @throws {InvalidInputDataError}
   * @throws {InvalidNordigenTokenError}
   * @throws {AccessDeniedError}
   * @throws {NotFoundError}
   * @throws {ResourceSuspended}
   * @throws {RateLimitError}
   * @throws {UnknownError}
   * @throws {ServiceError}
   * @returns {Promise<{requisition: import('../nordigen-node.types.js').Requisition, accounts: Array<import('../nordigen.types.js').NormalizedAccountDetails>}>}
   */
  getRequisitionWithAccounts: async (requisitionId) => {
    const requisition = await nordigenService.getLinkedRequisition(
      requisitionId,
    );

    let institutionIdSet = new Set();
    const detailedAccounts = await Promise.all(
      requisition.accounts.map(async (accountId) => {
        const account = await nordigenService.getDetailedAccount(accountId);
        institutionIdSet.add(account.institution_id);
        return account;
      }),
    );

    const institutions = await Promise.all(
      Array.from(institutionIdSet).map(async (institutionId) => {
        return await nordigenService.getInstitution(institutionId);
      }),
    );

    const extendedAccounts =
      await nordigenService.extendAccountsAboutInstitutions({
        accounts: detailedAccounts,
        institutions,
      });

    const normalizedAccounts = extendedAccounts.map((account) => {
      const bankAccount = BankFactory(account.institution_id);
      return bankAccount.normalizeAccount(account);
    });

    return { requisition, accounts: normalizedAccounts };
  },

  /**
   *
   * @param requisitionId
   * @param accountId
   * @param startDate
   * @param endDate
   * @throws {AccountNotLinedToRequisition} Will throw an error if requisition not includes provided account id
   * @throws {RequisitionNotLinked} Will throw an error if requisition is not in Linked
   * @throws {InvalidInputDataError}
   * @throws {InvalidNordigenTokenError}
   * @throws {AccessDeniedError}
   * @throws {NotFoundError}
   * @throws {ResourceSuspended}
   * @throws {RateLimitError}
   * @throws {UnknownError}
   * @throws {ServiceError}
   * @returns {Promise<{iban: string, balances: Array<import('../nordigen-node.types.js').Balance>, institutionId: string, transactions: {booked: Array<import('../nordigen-node.types.js').Transaction>, pending: Array<import('../nordigen-node.types.js').Transaction>}, startingBalance: number}>}
   */
  getTransactionsWithBalance: async (
    requisitionId,
    accountId,
    startDate,
    endDate,
  ) => {
    const { institution_id, accounts: accountIds } =
      await nordigenService.getLinkedRequisition(requisitionId);

    if (!accountIds.includes(accountId)) {
      throw new AccountNotLinedToRequisition(accountId, requisitionId);
    }

    const [accountMetadata, transactions, accountBalance] = await Promise.all([
      nordigenService.getAccountMetadata(accountId),
      nordigenService.getTransactions({
        accountId,
        startDate,
        endDate,
      }),
      nordigenService.getBalances(accountId),
    ]);

    const bank = BankFactory(institution_id);
    const sortedBookedTransactions = bank.sortTransactions(
      transactions.transactions?.booked,
    );
    const sortedPendingTransactions = bank.sortTransactions(
      transactions.transactions?.pending,
    );

    const startingBalance = bank.calculateStartingBalance(
      sortedBookedTransactions,
      accountBalance.balances,
    );

    return {
      iban: accountMetadata.iban,
      balances: accountBalance.balances,
      institutionId: institution_id,
      startingBalance,
      transactions: {
        booked: sortedBookedTransactions,
        pending: sortedPendingTransactions,
      },
    };
  },

  /**
   *
   * @param {import('../nordigen.types.js').CreateRequisitionParams} params
   * @throws {InvalidInputDataError}
   * @throws {InvalidNordigenTokenError}
   * @throws {AccessDeniedError}
   * @throws {NotFoundError}
   * @throws {ResourceSuspended}
   * @throws {RateLimitError}
   * @throws {UnknownError}
   * @throws {ServiceError}
   * @returns {Promise<{requisitionId, link}>}
   */
  createRequisition: async ({ institutionId, accessValidForDays, host }) => {
    await nordigenService.setToken();

    const response = await client.initSession({
      redirectUrl: host + '/nordigen/link',
      institutionId,
      referenceId: uuid.v4(),
      accessValidForDays,
      maxHistoricalDays: 90,
      userLanguage: 'en',
      ssn: null,
      redirectImmediate: false,
      accountSelection: false,
    });

    handleNordigenError(response);

    const { link, id: requisitionId } = response;

    return {
      link,
      requisitionId,
    };
  },

  /**
   * Deletes requisition by provided ID
   * @param requisitionId
   * @throws {InvalidInputDataError}
   * @throws {InvalidNordigenTokenError}
   * @throws {AccessDeniedError}
   * @throws {NotFoundError}
   * @throws {ResourceSuspended}
   * @throws {RateLimitError}
   * @throws {UnknownError}
   * @throws {ServiceError}
   * @returns {Promise<{summary: string, detail: string}>}
   */
  deleteRequisition: async (requisitionId) => {
    await nordigenService.getRequisition(requisitionId);
    const response = client.deleteRequisition(requisitionId);

    handleNordigenError(response);
    return response;
  },

  /**
   * Retrieve a requisition by ID
   * https://nordigen.com/en/docs/account-information/integration/parameters-and-responses/#/requisitions/requisition%20by%20id
   * @param { string } requisitionId
   * @throws {InvalidInputDataError}
   * @throws {InvalidNordigenTokenError}
   * @throws {AccessDeniedError}
   * @throws {NotFoundError}
   * @throws {ResourceSuspended}
   * @throws {RateLimitError}
   * @throws {UnknownError}
   * @throws {ServiceError}
   * @returns { Promise<import('../nordigen-node.types.js').Requisition> }
   */
  getRequisition: async (requisitionId) => {
    await nordigenService.setToken();

    const response = client.getRequisitionById(requisitionId);

    handleNordigenError(response);

    return response;
  },

  /**
   * Retrieve an detailed account by account id
   * @param accountId
   * @returns {Promise<import('../nordigen.types.js').DetailedAccount>}
   */
  getDetailedAccount: async (accountId) => {
    const [detailedAccount, metadataAccount] = await Promise.all([
      client.getDetails(accountId),
      client.getMetadata(accountId),
    ]);

    handleNordigenError(detailedAccount);
    handleNordigenError(metadataAccount);

    return {
      ...detailedAccount.account,
      ...metadataAccount,
    };
  },

  /**
   * Retrieve account metadata by account id
   *
   * Unlike getDetailedAccount, this method is not affected by institution rate-limits.
   *
   * @param accountId
   * @returns {Promise<import('../nordigen-node.types.js').NordigenAccountMetadata>}
   */
  getAccountMetadata: async (accountId) => {
    const response = await client.getMetadata(accountId);

    handleNordigenError(response);

    return response;
  },

  /**
   * Retrieve details about all Institutions in a specific country
   * @param country
   * @throws {InvalidInputDataError}
   * @throws {InvalidNordigenTokenError}
   * @throws {AccessDeniedError}
   * @throws {NotFoundError}
   * @throws {ResourceSuspended}
   * @throws {RateLimitError}
   * @throws {UnknownError}
   * @throws {ServiceError}
   * @returns {Promise<Array<import('../nordigen-node.types.js').Institution>>}
   */
  getInstitutions: async (country) => {
    const response = await client.getInstitutions(country);

    handleNordigenError(response);

    return response;
  },

  /**
   * Retrieve details about a specific Institution
   * @param institutionId
   * @throws {InvalidInputDataError}
   * @throws {InvalidNordigenTokenError}
   * @throws {AccessDeniedError}
   * @throws {NotFoundError}
   * @throws {ResourceSuspended}
   * @throws {RateLimitError}
   * @throws {UnknownError}
   * @throws {ServiceError}
   * @returns {Promise<import('../nordigen-node.types.js').Institution>}
   */
  getInstitution: async (institutionId) => {
    const response = await client.getInstitutionById(institutionId);

    handleNordigenError(response);

    return response;
  },

  /**
   * Extends provided accounts about details of their institution
   * @param {{accounts: Array<import('../nordigen.types.js').DetailedAccount>, institutions: Array<import('../nordigen-node.types.js').Institution>}} params
   * @returns {Promise<Array<import('../nordigen.types.js').DetailedAccount&{institution: import('../nordigen-node.types.js').Institution}>>}
   */
  extendAccountsAboutInstitutions: async ({ accounts, institutions }) => {
    const institutionsById = institutions.reduce((acc, institution) => {
      acc[institution.id] = institution;
      return acc;
    }, {});

    return accounts.map((account) => {
      const institution = institutionsById[account.institution_id] || null;
      return {
        ...account,
        institution,
      };
    });
  },

  /**
   * Returns account transaction in provided dates
   * @param {import('../nordigen.types.js').GetTransactionsParams} params
   * @throws {InvalidInputDataError}
   * @throws {InvalidNordigenTokenError}
   * @throws {AccessDeniedError}
   * @throws {NotFoundError}
   * @throws {ResourceSuspended}
   * @throws {RateLimitError}
   * @throws {UnknownError}
   * @throws {ServiceError}
   * @returns {Promise<import('../nordigen.types.js').GetTransactionsResponse>}
   */
  getTransactions: async ({ accountId, startDate, endDate }) => {
    const response = await client.getTransactions({
      accountId,
      dateFrom: startDate,
      dateTo: endDate,
    });

    handleNordigenError(response);

    return response;
  },

  /**
   * Returns account available balances
   * @param accountId
   * @throws {InvalidInputDataError}
   * @throws {InvalidNordigenTokenError}
   * @throws {AccessDeniedError}
   * @throws {NotFoundError}
   * @throws {ResourceSuspended}
   * @throws {RateLimitError}
   * @throws {UnknownError}
   * @throws {ServiceError}
   * @returns {Promise<import('../nordigen.types.js').GetBalances>}
   */
  getBalances: async (accountId) => {
    const response = await client.getBalances(accountId);

    handleNordigenError(response);

    return response;
  },
};

/**
 * All executions of nordigenClient should be here for testing purposes,
 * as the nordigen-node library is not written in a way that is conducive to testing.
 * In that way we can mock the `client` const instead of nordigen library
 */
export const client = {
  getBalances: async (accountId) =>
    await nordigenClient.account(accountId).getBalances(),
  getTransactions: async ({ accountId, dateFrom, dateTo }) =>
    await nordigenClient.account(accountId).getTransactions({
      dateFrom,
      dateTo,
      country: undefined,
    }),
  getInstitutions: async (country) =>
    await nordigenClient.institution.getInstitutions({ country }),
  getInstitutionById: async (institutionId) =>
    await nordigenClient.institution.getInstitutionById(institutionId),
  getDetails: async (accountId) =>
    await nordigenClient.account(accountId).getDetails(),
  getMetadata: async (accountId) =>
    await nordigenClient.account(accountId).getMetadata(),
  getRequisitionById: async (requisitionId) =>
    await nordigenClient.requisition.getRequisitionById(requisitionId),
  deleteRequisition: async (requisitionId) =>
    await nordigenClient.requisition.deleteRequisition(requisitionId),
  initSession: async ({
    redirectUrl,
    institutionId,
    referenceId,
    accessValidForDays,
    maxHistoricalDays,
    userLanguage,
    ssn,
    redirectImmediate,
    accountSelection,
  }) =>
    await nordigenClient.initSession({
      redirectUrl,
      institutionId,
      referenceId,
      accessValidForDays,
      maxHistoricalDays,
      userLanguage,
      ssn,
      redirectImmediate,
      accountSelection,
    }),
  generateToken: async () => await nordigenClient.generateToken(),
  exchangeToken: async ({ refreshToken }) =>
    await nordigenClient.exchangeToken({ refreshToken }),
};
