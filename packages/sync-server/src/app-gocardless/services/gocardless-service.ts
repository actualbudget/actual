import { v4 as uuidv4 } from 'uuid';

import { BankFactory } from '#app-gocardless/bank-factory';
import type { IBank } from '#app-gocardless/banks/bank.interface';
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
} from '#app-gocardless/errors';
import type {
  Balance,
  GoCardlessAccountId,
  GoCardlessAccountMetadata,
  GoCardlessInstitutionId,
  GoCardlessRequisitionId,
  Institution,
  Requisition,
  Transaction,
} from '#app-gocardless/gocardless-node.types';
import type {
  CreateRequisitionParams,
  DetailedAccount,
  DetailedAccountWithInstitution,
  GetBalances,
  GetTransactionsParams,
  GetTransactionsResponse,
  NormalizedAccountDetails,
  TransactionWithBookedStatus,
} from '#app-gocardless/gocardless.types';
import { SecretName, secretsService } from '#services/secrets-service';

import type { AccountDetailsResponse, TokenResponse } from './gocardless-api';
import { GoCardlessApi, GoCardlessApiError } from './gocardless-api';

const clients = new Map<string, GoCardlessApi>();

type BankSyncFileOptions = {
  fileId: string;
};

function resolveFileId(options: BankSyncFileOptions): string {
  if (!options.fileId) {
    throw new Error('missing-file-id');
  }
  return options.fileId;
}

const getGocardlessClient = (options: BankSyncFileOptions): GoCardlessApi => {
  const fileId = resolveFileId(options);
  const secrets = {
    secretId: secretsService.get(SecretName.gocardless_secretId, { fileId }),
    secretKey: secretsService.get(SecretName.gocardless_secretKey, { fileId }),
  };

  let client = clients.get(fileId);
  if (!client) {
    client = new GoCardlessApi(secrets);
    clients.set(fileId, client);
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
  isConfigured: (options: BankSyncFileOptions): boolean => {
    return !!(
      getGocardlessClient(options).secretId &&
      getGocardlessClient(options).secretKey
    );
  },

  setToken: async (options: BankSyncFileOptions): Promise<void> => {
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

    if (isExpiredJwtToken(getGocardlessClient(options).token)) {
      await client.generateToken(options).catch(handleGoCardlessError);
    }
  },

  getLinkedRequisition: async (
    requisitionId: GoCardlessRequisitionId,
    options: BankSyncFileOptions,
  ): Promise<Requisition> => {
    const requisition = await goCardlessService.getRequisition(
      requisitionId,
      options,
    );

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
    options: BankSyncFileOptions,
  ): Promise<{
    requisition: Requisition;
    accounts: NormalizedAccountDetails[];
  }> => {
    const requisition = await goCardlessService.getLinkedRequisition(
      requisitionId,
      options,
    );

    console.log('GoCardless requisition linked:', {
      institutionId: requisition.institution_id,
      requisitionId,
      agreementId: requisition.agreement,
      accountIds: requisition.accounts,
    });

    const institutionIdSet = new Set<GoCardlessInstitutionId>();
    const detailedAccounts = await Promise.all(
      requisition.accounts.map(async (accountId: GoCardlessAccountId) => {
        const account = await goCardlessService.getDetailedAccount(
          accountId,
          options,
        );
        institutionIdSet.add(account.institution_id);
        return account;
      }),
    );

    const institutions = await Promise.all(
      Array.from(institutionIdSet).map(
        async (institutionId: GoCardlessInstitutionId) => {
          return await goCardlessService.getInstitution(institutionId, options);
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
    startDate: string | undefined,
    endDate: string | undefined,
    options: BankSyncFileOptions,
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
      await goCardlessService.getLinkedRequisition(requisitionId, options);

    if (!accountIds.includes(accountId)) {
      throw new AccountNotLinkedToRequisition(accountId, requisitionId);
    }

    const [normalizedTransactions, accountBalance] = await Promise.all([
      goCardlessService.getNormalizedTransactions(
        requisitionId,
        accountId,
        startDate,
        endDate,
        options,
      ),
      goCardlessService.getBalances(accountId, options),
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
    startDate: string | undefined,
    endDate: string | undefined,
    options: BankSyncFileOptions,
  ): Promise<{
    institutionId: GoCardlessInstitutionId;
    transactions: {
      booked: Transaction[];
      pending: Transaction[];
      all: TransactionWithBookedStatus[];
    };
  }> => {
    const { institution_id, accounts: accountIds } =
      await goCardlessService.getLinkedRequisition(requisitionId, options);

    if (!accountIds.includes(accountId)) {
      throw new AccountNotLinkedToRequisition(accountId, requisitionId);
    }

    const transactions = await goCardlessService.getTransactions({
      institutionId: institution_id,
      accountId,
      startDate,
      endDate,
      options,
    });

    const bank: IBank = BankFactory(institution_id);
    const sortedBookedTransactions = bank.sortTransactions(
      transactions.transactions.booked,
    );
    const sortedPendingTransactions = bank.sortTransactions(
      transactions.transactions.pending,
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

  createRequisition: async (
    { institutionId, host }: CreateRequisitionParams,
    options: BankSyncFileOptions,
  ): Promise<{
    link: string;
    requisitionId: GoCardlessRequisitionId;
  }> => {
    await goCardlessService.setToken(options);

    const institution = await goCardlessService.getInstitution(
      institutionId,
      options,
    );
    const accountSelection =
      institution.supported_features?.includes('account_selection') ?? false;
    const separateContinuousHistoryConsent =
      institution.supported_features?.includes(
        'separate_continuous_history_consent',
      ) ?? false;

    const body = {
      redirectUrl: host + '/gocardless/link',
      institutionId,
      referenceId: uuidv4(),
      accessValidForDays: institution.max_access_valid_for_days,
      maxHistoricalDays: separateContinuousHistoryConsent
        ? 90
        : institution.transaction_total_days,
      userLanguage: 'en',
      ssn: null,
      redirectImmediate: false,
      accountSelection,
    };

    console.log('GoCardless requisition request:', {
      institutionId,
      accessValidForDays: body.accessValidForDays,
      maxHistoricalDays: body.maxHistoricalDays,
      transactionTotalDays: institution.transaction_total_days,
      separateContinuousHistoryConsent,
      accountSelection,
      supportedFeatures: institution.supported_features,
    });

    const response = await client.initSession(body, options).catch(async () => {
      console.log('Failed to link using:');
      console.log(body);
      console.log(
        'Falling back to accessValidForDays = 90 ' +
          'and maxHistoricalDays = 89',
      );

      return await client
        .initSession(
          {
            ...body,
            accessValidForDays: 90,
            maxHistoricalDays: 89,
          },
          options,
        )
        .catch(handleGoCardlessError);
    });

    const { link, id: requisitionId } = response;

    console.log('GoCardless requisition created:', {
      institutionId,
      requisitionId,
      agreementId: response.agreement,
    });

    return {
      link,
      requisitionId,
    };
  },

  deleteRequisition: async (
    requisitionId: GoCardlessRequisitionId,
    options: BankSyncFileOptions,
  ): Promise<{ summary: string; detail: string }> => {
    await goCardlessService.getRequisition(requisitionId, options);
    return client
      .deleteRequisition(requisitionId, options)
      .catch(handleGoCardlessError);
  },

  getRequisition: async (
    requisitionId: GoCardlessRequisitionId,
    options: BankSyncFileOptions,
  ): Promise<Requisition> => {
    await goCardlessService.setToken(options);
    return client
      .getRequisitionById(requisitionId, options)
      .catch(handleGoCardlessError);
  },

  getDetailedAccount: async (
    accountId: GoCardlessAccountId,
    options: BankSyncFileOptions,
  ): Promise<DetailedAccount> => {
    const [detailedAccount, metadataAccount] = await Promise.all([
      client.getDetails(accountId, options),
      client.getMetadata(accountId, options),
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
    options: BankSyncFileOptions,
  ): Promise<GoCardlessAccountMetadata> =>
    client.getMetadata(accountId, options).catch(handleGoCardlessError),

  getInstitutions: async (
    country: string,
    options: BankSyncFileOptions,
  ): Promise<Institution[]> =>
    client.getInstitutions(country, options).catch(handleGoCardlessError),

  getInstitution: async (
    institutionId: GoCardlessInstitutionId,
    options: BankSyncFileOptions,
  ): Promise<Institution> =>
    client
      .getInstitutionById(institutionId, options)
      .catch(handleGoCardlessError),

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
    options,
  }: GetTransactionsParams & {
    options: BankSyncFileOptions;
  }): Promise<GetTransactionsResponse> => {
    const response = await client
      .getTransactions(
        {
          accountId,
          dateFrom: startDate,
          dateTo: endDate,
        },
        options,
      )
      .catch(handleGoCardlessError);

    const bank: IBank = BankFactory(institutionId);
    response.transactions.booked = response.transactions.booked
      .map(transaction => bank.normalizeTransaction(transaction, true))
      .filter(t => t != null);
    response.transactions.pending = response.transactions.pending
      .map(transaction => bank.normalizeTransaction(transaction, false))
      .filter(t => t != null);

    return response;
  },

  getBalances: async (
    accountId: GoCardlessAccountId,
    options: BankSyncFileOptions,
  ): Promise<GetBalances> =>
    client.getBalances(accountId, options).catch(handleGoCardlessError),
};

// All GoCardless API calls go through this object so tests can mock it easily.
export const client = {
  getBalances: async (
    accountId: GoCardlessAccountId,
    options: BankSyncFileOptions,
  ): Promise<GetBalances> =>
    await getGocardlessClient(options).getAccountBalances(accountId),
  getTransactions: async (
    {
      accountId,
      dateFrom,
      dateTo,
    }: {
      accountId: GoCardlessAccountId;
      dateFrom?: string;
      dateTo?: string;
    },
    options: BankSyncFileOptions,
  ): Promise<GetTransactionsResponse> =>
    await getGocardlessClient(options).getAccountTransactions({
      accountId,
      dateFrom,
      dateTo,
    }),
  getInstitutions: async (
    country: string,
    options: BankSyncFileOptions,
  ): Promise<Institution[]> =>
    await getGocardlessClient(options).getInstitutions({ country }),
  getInstitutionById: async (
    institutionId: GoCardlessInstitutionId,
    options: BankSyncFileOptions,
  ): Promise<Institution> =>
    await getGocardlessClient(options).getInstitutionById(institutionId),
  getDetails: async (
    accountId: GoCardlessAccountId,
    options: BankSyncFileOptions,
  ): Promise<AccountDetailsResponse> =>
    await getGocardlessClient(options).getAccountDetails(accountId),
  getMetadata: async (
    accountId: GoCardlessAccountId,
    options: BankSyncFileOptions,
  ): Promise<GoCardlessAccountMetadata> =>
    await getGocardlessClient(options).getAccountMetadata(accountId),
  getRequisitionById: async (
    requisitionId: GoCardlessRequisitionId,
    options: BankSyncFileOptions,
  ): Promise<Requisition> =>
    await getGocardlessClient(options).getRequisitionById(requisitionId),
  deleteRequisition: async (
    requisitionId: GoCardlessRequisitionId,
    options: BankSyncFileOptions,
  ): Promise<{ summary: string; detail: string }> =>
    await getGocardlessClient(options).deleteRequisition(requisitionId),
  initSession: async (
    {
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
    },
    options: BankSyncFileOptions,
  ): Promise<Requisition> =>
    await getGocardlessClient(options).initSession({
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
  generateToken: async (options: BankSyncFileOptions): Promise<TokenResponse> =>
    await getGocardlessClient(options).generateToken(),
  exchangeToken: async (
    {
      refreshToken,
    }: {
      refreshToken: string;
    },
    options: BankSyncFileOptions,
  ): Promise<TokenResponse> =>
    await getGocardlessClient(options).exchangeToken({ refreshToken }),
};
