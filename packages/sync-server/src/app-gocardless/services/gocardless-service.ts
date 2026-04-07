import { v4 as uuidv4 } from 'uuid';

import { SecretName, secretsService } from '../../services/secrets-service';
import { BankFactory, isSpecialContinuousAccessBank } from '../bank-factory';
import type { IBank } from '../banks/bank.interface';
import {
  AccessDeniedError,
  AccountNotLinkedToRequisition,
  GenericGoCardlessError,
  InvalidGoCardlessTokenError,
  InvalidInputDataError,
  NotFoundError,
  RateLimitError,
  RequisitionNotLinked,
  ResourceSuspended,
  ServiceError,
  UnknownError,
} from '../errors';
import type {
  Balance,
  GoCardlessAccountId,
  GoCardlessAccountMetadata,
  GoCardlessInstitutionId,
  GoCardlessRequisitionId,
  Institution,
  Requisition,
  Transaction,
} from '../gocardless-node.types';
import type {
  CreateRequisitionParams,
  DetailedAccount,
  DetailedAccountWithInstitution,
  GetBalances,
  GetTransactionsParams,
  GetTransactionsResponse,
  NormalizedAccountDetails,
  TransactionWithBookedStatus,
} from '../gocardless.types';

import type { AccountDetailsResponse, TokenResponse } from './gocardless-api';
import { GoCardlessApi, GoCardlessApiError } from './gocardless-api';

const clients = new Map<string, GoCardlessApi>();

const getGocardlessClient = (): GoCardlessApi => {
  const secrets = {
    secretId: secretsService.get(SecretName.gocardless_secretId),
    secretKey: secretsService.get(SecretName.gocardless_secretKey),
  };

  const hash = JSON.stringify(secrets);

  let client = clients.get(hash);
  if (!client) {
    client = new GoCardlessApi(secrets);
    clients.set(hash, client);
  }

  return client;
};

export const handleGoCardlessError = (error: unknown): never => {
  const status =
    error instanceof GoCardlessApiError ? error.response.status : undefined;

  switch (status) {
    case 400:
      throw new InvalidInputDataError(error);
    case 401:
      throw new InvalidGoCardlessTokenError(error);
    case 403:
      throw new AccessDeniedError(error);
    case 404:
      throw new NotFoundError(error);
    case 409:
      throw new ResourceSuspended(error);
    case 429:
      throw new RateLimitError(error);
    case 500:
      throw new UnknownError(error);
    case 503:
      throw new ServiceError(error);
    default:
      throw new GenericGoCardlessError(error);
  }
};

export const goCardlessService = {
  isConfigured: (): boolean => {
    return !!(
      getGocardlessClient().secretId && getGocardlessClient().secretKey
    );
  },

  setToken: async (): Promise<void> => {
    const isExpiredJwtToken = (token: string | null): boolean => {
      if (!token) return true;
      try {
        const payload = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64url').toString(),
        );
        const clockTimestamp = Math.floor(Date.now() / 1000);
        return clockTimestamp >= payload.exp;
      } catch {
        return true;
      }
    };

    if (isExpiredJwtToken(getGocardlessClient().token)) {
      await client.generateToken().catch(handleGoCardlessError);
    }
  },

  getLinkedRequisition: async (
    requisitionId: GoCardlessRequisitionId,
  ): Promise<Requisition> => {
    const requisition = await goCardlessService.getRequisition(requisitionId);

    const { status } = requisition;

    // Continue only if status of requisition is "LN" which
    // means the account has been successfully linked to the requisition
    if (status !== 'LN') {
      throw new RequisitionNotLinked({ requisitionStatus: status });
    }

    return requisition;
  },

  getRequisitionWithAccounts: async (
    requisitionId: GoCardlessRequisitionId,
  ): Promise<{
    requisition: Requisition;
    accounts: NormalizedAccountDetails[];
  }> => {
    const requisition =
      await goCardlessService.getLinkedRequisition(requisitionId);

    const institutionIdSet = new Set<GoCardlessInstitutionId>();
    const detailedAccounts = await Promise.all(
      requisition.accounts.map(async (accountId: GoCardlessAccountId) => {
        const account = await goCardlessService.getDetailedAccount(accountId);
        institutionIdSet.add(account.institution_id);
        return account;
      }),
    );

    const institutions = await Promise.all(
      Array.from(institutionIdSet).map(
        async (institutionId: GoCardlessInstitutionId) => {
          return await goCardlessService.getInstitution(institutionId);
        },
      ),
    );

    const extendedAccounts =
      await goCardlessService.extendAccountsAboutInstitutions({
        accounts: detailedAccounts,
        institutions,
      });

    const normalizedAccounts = extendedAccounts.map(account => {
      const bank: IBank = BankFactory(account.institution_id);
      return bank.normalizeAccount(account);
    });

    return { requisition, accounts: normalizedAccounts };
  },

  getTransactionsWithBalance: async (
    requisitionId: GoCardlessRequisitionId,
    accountId: GoCardlessAccountId,
    startDate: string,
    endDate: string,
  ): Promise<{
    balances: Balance[];
    institutionId: GoCardlessInstitutionId;
    startingBalance: number;
    transactions: {
      booked: Transaction[];
      pending: Transaction[];
      all: TransactionWithBookedStatus[];
    };
  }> => {
    const { institution_id, accounts: accountIds } =
      await goCardlessService.getLinkedRequisition(requisitionId);

    if (!accountIds.includes(accountId)) {
      throw new AccountNotLinkedToRequisition(accountId, requisitionId);
    }

    const [normalizedTransactions, accountBalance] = await Promise.all([
      goCardlessService.getNormalizedTransactions(
        requisitionId,
        accountId,
        startDate,
        endDate,
      ),
      goCardlessService.getBalances(accountId),
    ]);

    const transactions = normalizedTransactions.transactions;

    const bank: IBank = BankFactory(institution_id);

    const startingBalance = bank.calculateStartingBalance(
      transactions.booked,
      accountBalance.balances,
    );

    return {
      balances: accountBalance.balances,
      institutionId: institution_id,
      startingBalance,
      transactions,
    };
  },

  getNormalizedTransactions: async (
    requisitionId: GoCardlessRequisitionId,
    accountId: GoCardlessAccountId,
    startDate: string,
    endDate: string,
  ): Promise<{
    institutionId: GoCardlessInstitutionId;
    transactions: {
      booked: Transaction[];
      pending: Transaction[];
      all: TransactionWithBookedStatus[];
    };
  }> => {
    const { institution_id, accounts: accountIds } =
      await goCardlessService.getLinkedRequisition(requisitionId);

    if (!accountIds.includes(accountId)) {
      throw new AccountNotLinkedToRequisition(accountId, requisitionId);
    }

    const transactions = await goCardlessService.getTransactions({
      institutionId: institution_id,
      accountId,
      startDate,
      endDate,
    });

    const bank: IBank = BankFactory(institution_id);
    const sortedBookedTransactions = bank.sortTransactions(
      transactions.transactions?.booked,
    );
    const sortedPendingTransactions = bank.sortTransactions(
      transactions.transactions?.pending,
    );
    const allTransactions: TransactionWithBookedStatus[] =
      sortedBookedTransactions.map(t => ({
        ...t,
        booked: true,
      }));
    sortedPendingTransactions.forEach(t =>
      allTransactions.push({ ...t, booked: false }),
    );
    const sortedAllTransactions = bank.sortTransactions(allTransactions);

    return {
      institutionId: institution_id,
      transactions: {
        booked: sortedBookedTransactions,
        pending: sortedPendingTransactions,
        all: sortedAllTransactions,
      },
    };
  },

  createRequisition: async ({
    institutionId,
    host,
  }: CreateRequisitionParams): Promise<{
    link: string;
    requisitionId: GoCardlessRequisitionId;
  }> => {
    await goCardlessService.setToken();

    const institution = await goCardlessService.getInstitution(institutionId);
    const accountSelection =
      institution.supported_features?.includes('account_selection') ?? false;

    const body = {
      redirectUrl: host + '/gocardless/link',
      institutionId,
      referenceId: uuidv4(),
      accessValidForDays: institution.max_access_valid_for_days,
      maxHistoricalDays: isSpecialContinuousAccessBank(institutionId)
        ? 90
        : institution.transaction_total_days,
      userLanguage: 'en',
      ssn: null,
      redirectImmediate: false,
      accountSelection,
    };

    const response = await client.initSession(body).catch(async () => {
      console.log('Failed to link using:');
      console.log(body);
      console.log(
        'Falling back to accessValidForDays = 90 ' +
          'and maxHistoricalDays = 89',
      );

      return await client
        .initSession({
          ...body,
          accessValidForDays: 90,
          maxHistoricalDays: 89,
        })
        .catch(handleGoCardlessError);
    });

    const { link, id: requisitionId } = response;

    return {
      link,
      requisitionId,
    };
  },

  deleteRequisition: async (
    requisitionId: GoCardlessRequisitionId,
  ): Promise<{ summary: string; detail: string }> => {
    await goCardlessService.getRequisition(requisitionId);
    return client.deleteRequisition(requisitionId).catch(handleGoCardlessError);
  },

  getRequisition: async (
    requisitionId: GoCardlessRequisitionId,
  ): Promise<Requisition> => {
    await goCardlessService.setToken();
    return client
      .getRequisitionById(requisitionId)
      .catch(handleGoCardlessError);
  },

  getDetailedAccount: async (
    accountId: GoCardlessAccountId,
  ): Promise<DetailedAccount> => {
    const [detailedAccount, metadataAccount] = await Promise.all([
      client.getDetails(accountId),
      client.getMetadata(accountId),
    ]).catch(handleGoCardlessError);

    const accountDetails = detailedAccount.account ?? {};
    const metadata = metadataAccount ?? {};

    // Some banks provide additional data in both fields, but can do yucky things like have an empty
    // string in one place but not the other. We'll fix this by merging the two objects, but preferring truthy values
    // from the metadata object over the details object.
    const truthyMetadata = Object.fromEntries(
      Object.entries(metadata).filter(([, v]) => v),
    );
    return {
      ...accountDetails,
      ...truthyMetadata,
    } as unknown as DetailedAccount;
  },

  getAccountMetadata: async (
    accountId: GoCardlessAccountId,
  ): Promise<GoCardlessAccountMetadata> =>
    client.getMetadata(accountId).catch(handleGoCardlessError),

  getInstitutions: async (country: string): Promise<Institution[]> =>
    client.getInstitutions(country).catch(handleGoCardlessError),

  getInstitution: async (
    institutionId: GoCardlessInstitutionId,
  ): Promise<Institution> =>
    client.getInstitutionById(institutionId).catch(handleGoCardlessError),

  extendAccountsAboutInstitutions: async ({
    accounts,
    institutions,
  }: {
    accounts: DetailedAccount[];
    institutions: Institution[];
  }): Promise<DetailedAccountWithInstitution[]> => {
    const institutionsById = institutions.reduce<Record<string, Institution>>(
      (acc, institution) => {
        acc[institution.id] = institution;
        return acc;
      },
      {},
    );

    return accounts.map(account => {
      const institution = institutionsById[account.institution_id] ?? null;
      return {
        ...account,
        institution,
      };
    });
  },

  getTransactions: async ({
    institutionId,
    accountId,
    startDate,
    endDate,
  }: GetTransactionsParams): Promise<GetTransactionsResponse> => {
    const response = await client
      .getTransactions({
        accountId,
        dateFrom: startDate,
        dateTo: endDate,
      })
      .catch(handleGoCardlessError);

    const bank: IBank = BankFactory(institutionId);
    response.transactions.booked = response.transactions.booked
      .map(transaction => bank.normalizeTransaction(transaction, true))
      .filter((t): t is Transaction => t != null);
    response.transactions.pending = response.transactions.pending
      .map(transaction => bank.normalizeTransaction(transaction, false))
      .filter((t): t is Transaction => t != null);

    return response;
  },

  getBalances: async (accountId: GoCardlessAccountId): Promise<GetBalances> =>
    client.getBalances(accountId).catch(handleGoCardlessError),
};

// All GoCardless API calls go through this object so tests can mock it easily.
export const client = {
  getBalances: async (accountId: GoCardlessAccountId): Promise<GetBalances> =>
    await getGocardlessClient().getAccountBalances(accountId),
  getTransactions: async ({
    accountId,
    dateFrom,
    dateTo,
  }: {
    accountId: GoCardlessAccountId;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<GetTransactionsResponse> =>
    await getGocardlessClient().getAccountTransactions({
      accountId,
      dateFrom,
      dateTo,
    }),
  getInstitutions: async (country: string): Promise<Institution[]> =>
    await getGocardlessClient().getInstitutions({ country }),
  getInstitutionById: async (
    institutionId: GoCardlessInstitutionId,
  ): Promise<Institution> =>
    await getGocardlessClient().getInstitutionById(institutionId),
  getDetails: async (
    accountId: GoCardlessAccountId,
  ): Promise<AccountDetailsResponse> =>
    await getGocardlessClient().getAccountDetails(accountId),
  getMetadata: async (
    accountId: GoCardlessAccountId,
  ): Promise<GoCardlessAccountMetadata> =>
    await getGocardlessClient().getAccountMetadata(accountId),
  getRequisitionById: async (
    requisitionId: GoCardlessRequisitionId,
  ): Promise<Requisition> =>
    await getGocardlessClient().getRequisitionById(requisitionId),
  deleteRequisition: async (
    requisitionId: GoCardlessRequisitionId,
  ): Promise<{ summary: string; detail: string }> =>
    await getGocardlessClient().deleteRequisition(requisitionId),
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
  }: {
    redirectUrl: string;
    institutionId: GoCardlessInstitutionId;
    referenceId: string | null;
    accessValidForDays: number | string;
    maxHistoricalDays: number | string;
    userLanguage: string;
    ssn: string | null;
    redirectImmediate: boolean;
    accountSelection: boolean;
  }): Promise<Requisition> =>
    await getGocardlessClient().initSession({
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
  generateToken: async (): Promise<TokenResponse> =>
    await getGocardlessClient().generateToken(),
  exchangeToken: async ({
    refreshToken,
  }: {
    refreshToken: string;
  }): Promise<TokenResponse> =>
    await getGocardlessClient().exchangeToken({ refreshToken }),
};
