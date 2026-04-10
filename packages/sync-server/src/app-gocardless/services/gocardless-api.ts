import type {
  GoCardlessAccountDetails,
  GoCardlessAccountId,
  GoCardlessAccountMetadata,
  GoCardlessAgreementId,
  GoCardlessInstitutionId,
  GoCardlessRequisitionId,
  Institution,
  Requisition,
} from '../gocardless-node.types';
import type { GetBalances, GetTransactionsResponse } from '../gocardless.types';

const BASE_URL = 'https://bankaccountdata.gocardless.com/api/v2';
const ALLOWED_ORIGIN = new URL(BASE_URL).origin;

export type TokenResponse = {
  access: string;
  refresh: string;
  access_expires: number;
  refresh_expires: number;
};

type AgreementResponse = {
  id: GoCardlessAgreementId;
  created: string;
  max_historical_days: number;
  access_valid_for_days: number;
  access_scope: string[];
  accepted: string | null;
  institution_id: GoCardlessInstitutionId;
};

export type AccountDetailsResponse = {
  account: GoCardlessAccountDetails;
};

export class GoCardlessApiError extends Error {
  response: {
    status: number;
    headers: Record<string, string>;
    data?: unknown;
  };

  constructor(
    message: string,
    status: number,
    headers: Record<string, string>,
  ) {
    super(message);
    this.response = { status, headers };
  }
}

export class GoCardlessApi {
  #secretId: string | null;
  #secretKey: string | null;
  #token: string | null = null;

  constructor({
    secretId,
    secretKey,
  }: {
    secretId: string | null;
    secretKey: string | null;
  }) {
    this.#secretId = secretId;
    this.#secretKey = secretKey;
  }

  get secretId(): string | null {
    return this.#secretId;
  }

  get secretKey(): string | null {
    return this.#secretKey;
  }

  get token(): string | null {
    return this.#token;
  }

  set token(value: string | null) {
    this.#token = value;
  }

  async #request<T>(
    endpoint: string,
    {
      method = 'GET',
      body,
    }: {
      method?: 'GET' | 'POST' | 'DELETE';
      body?: Record<string, unknown>;
    } = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      accept: 'application/json',
      'Content-Type': 'application/json',
    };

    if (this.#token) {
      headers.Authorization = `Bearer ${this.#token}`;
    }

    const url = new URL(`${BASE_URL}${endpoint}`);
    if (url.origin !== ALLOWED_ORIGIN || !url.pathname.startsWith('/api/v2/')) {
      throw new Error(`Invalid GoCardless API endpoint: ${endpoint}`);
    }

    const response = await fetch(url, {
      method,
      headers,
      signal: AbortSignal.timeout(20000),
      ...(body
        ? {
            body: JSON.stringify(
              Object.fromEntries(
                Object.entries(body).filter(([, v]) => v != null),
              ),
            ),
          }
        : {}),
    });

    if (!response.ok) {
      const error = new GoCardlessApiError(
        `GoCardless API error: ${response.status}`,
        response.status,
        Object.fromEntries(response.headers.entries()),
      );
      try {
        error.response.data = await response.json();
      } catch {}
      console.log(
        `GoCardless ${method} ${endpoint} ${response.status}`,
        error.response.data ? JSON.stringify(error.response.data) : '(no body)',
      );
      throw error;
    }

    return response.json() as Promise<T>;
  }

  async generateToken(): Promise<TokenResponse> {
    const data = await this.#request<TokenResponse>('/token/new/', {
      method: 'POST',
      body: {
        secret_id: this.#secretId,
        secret_key: this.#secretKey,
      },
    });
    this.#token = data.access;
    return data;
  }

  async exchangeToken({
    refreshToken,
  }: {
    refreshToken: string;
  }): Promise<TokenResponse> {
    const data = await this.#request<TokenResponse>('/token/refresh/', {
      method: 'POST',
      body: { refresh: refreshToken },
    });
    this.#token = data.access;
    return data;
  }

  async getInstitutions({
    country,
  }: {
    country: string;
  }): Promise<Institution[]> {
    return this.#request<Institution[]>(`/institutions/?country=${country}`);
  }

  async getInstitutionById(id: GoCardlessInstitutionId): Promise<Institution> {
    return this.#request<Institution>(`/institutions/${id}/`);
  }

  async createRequisition({
    redirectUrl,
    institutionId,
    agreement,
    userLanguage,
    reference,
    ssn,
    redirectImmediate,
    accountSelection,
  }: {
    redirectUrl: string;
    institutionId: GoCardlessInstitutionId;
    agreement: GoCardlessAgreementId;
    userLanguage: string;
    reference: string | null;
    ssn: string | null;
    redirectImmediate: boolean;
    accountSelection: boolean;
  }): Promise<Requisition> {
    return this.#request<Requisition>('/requisitions/', {
      method: 'POST',
      body: {
        redirect: redirectUrl,
        institution_id: institutionId,
        agreement,
        user_language: userLanguage,
        reference,
        ssn,
        redirect_immediate: redirectImmediate,
        account_selection: accountSelection,
      },
    });
  }

  async getRequisitionById(
    requisitionId: GoCardlessRequisitionId,
  ): Promise<Requisition> {
    return this.#request<Requisition>(`/requisitions/${requisitionId}/`);
  }

  async deleteRequisition(
    requisitionId: GoCardlessRequisitionId,
  ): Promise<{ summary: string; detail: string }> {
    return this.#request(`/requisitions/${requisitionId}/`, {
      method: 'DELETE',
    });
  }

  async createAgreement({
    institutionId,
    maxHistoricalDays = 90,
    accessValidForDays = 90,
    accessScope = ['balances', 'details', 'transactions'],
  }: {
    institutionId: GoCardlessInstitutionId;
    maxHistoricalDays?: number;
    accessValidForDays?: number;
    accessScope?: string[];
  }): Promise<AgreementResponse> {
    return this.#request<AgreementResponse>('/agreements/enduser/', {
      method: 'POST',
      body: {
        institution_id: institutionId,
        max_historical_days: maxHistoricalDays,
        access_valid_for_days: accessValidForDays,
        access_scope: accessScope,
      },
    });
  }

  async getAccountMetadata(
    accountId: GoCardlessAccountId,
  ): Promise<GoCardlessAccountMetadata> {
    return this.#request<GoCardlessAccountMetadata>(`/accounts/${accountId}/`);
  }

  async getAccountDetails(
    accountId: GoCardlessAccountId,
  ): Promise<AccountDetailsResponse> {
    return this.#request<AccountDetailsResponse>(
      `/accounts/${accountId}/details/`,
    );
  }

  async getAccountBalances(
    accountId: GoCardlessAccountId,
  ): Promise<GetBalances> {
    return this.#request<GetBalances>(`/accounts/${accountId}/balances/`);
  }

  async getAccountTransactions({
    accountId,
    dateFrom,
    dateTo,
  }: {
    accountId: GoCardlessAccountId;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<GetTransactionsResponse> {
    const params = new URLSearchParams();
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    const query = params.toString();
    return this.#request<GetTransactionsResponse>(
      `/accounts/${accountId}/transactions/${query ? `?${query}` : ''}`,
    );
  }

  async initSession({
    redirectUrl,
    institutionId,
    maxHistoricalDays = 90,
    accessValidForDays = 90,
    userLanguage = 'en',
    referenceId = null,
    ssn = null,
    redirectImmediate = false,
    accountSelection = false,
  }: {
    redirectUrl: string;
    institutionId: GoCardlessInstitutionId;
    maxHistoricalDays?: number | string;
    accessValidForDays?: number | string;
    userLanguage?: string;
    referenceId?: string | null;
    ssn?: string | null;
    redirectImmediate?: boolean;
    accountSelection?: boolean;
  }): Promise<Requisition> {
    const agreement = await this.createAgreement({
      institutionId,
      maxHistoricalDays: Number(maxHistoricalDays),
      accessValidForDays: Number(accessValidForDays),
    });

    return this.createRequisition({
      redirectUrl,
      institutionId,
      agreement: agreement.id,
      userLanguage,
      reference: referenceId,
      ssn,
      redirectImmediate,
      accountSelection,
    });
  }
}
