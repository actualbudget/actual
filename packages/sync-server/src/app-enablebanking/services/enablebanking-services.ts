import { SecretName, secretsService } from '../../services/secrets-service.js';
import {
  Account,
  AccountResource,
  AuthenticationStartResponse,
  EnableBankingToken,
  GetApplicationResponse,
  GetAspspsResponse,
  GetSessionResponse,
  HalBalances,
  StartAuthorizationResponse,
} from '../models/models-enablebanking.js';
import {
  handleEnableBankingError,
  EnableBankingSetupError,
} from '../utils/errors.js';
import { getJWT } from '../utils/jwt.js';

export const enableBankingservice = {
  HOSTNAME: 'https://api.enablebanking.com/',
  _activeAuths: new Map<string, string>(),
  setupSecrets: async (applicationId: string, secretKey: string) => {
    // Check if we can get a jwt with provided data.
    let jwt: string;
    try {
      jwt = getJWT(applicationId, secretKey);
    } catch (error) {
      // TODO: The only expected error is if the secretKey is not in the right format. Others should be
      // reported to dev. Pointing to internal server error.
      return false;
    }

    // Check if jwt is recognized by Enable Banking
    const responseData: GetApplicationResponse = await enableBankingservice.get(
      'application',
      jwt,
    );
    if (!responseData.active) {
      return false;
    }
    secretsService.set(SecretName.enablebanking_applicationId, applicationId);
    secretsService.set(SecretName.enablebaanking_secret, secretKey);
    return true;
  },
  secretsAreSetup: () => {
    const applicationId = secretsService.get(
      SecretName.enablebanking_applicationId,
    );
    const secret = secretsService.get(SecretName.enablebaanking_secret);
    return !(applicationId == null || secret == null);
  },
  isConfigured: async () => {
    if (!enableBankingservice.secretsAreSetup()) {
      return false;
    }
    const responseData = await enableBankingservice.getApplication();
    return responseData.active;
  },

  getJWT: () => {
    const applicationId = secretsService.get(
      SecretName.enablebanking_applicationId,
    );
    const secretKey = secretsService.get(SecretName.enablebaanking_secret);
    if (!applicationId || !secretKey) {
      throw new EnableBankingSetupError();
    }
    return getJWT(applicationId, secretKey);
  },

  get: async <T>(endpoint: string, jwt?: string): Promise<T> | never => {
    const baseHeaders = {
      Authorization: `Bearer ${jwt ? jwt : enableBankingservice.getJWT()}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(
      `${enableBankingservice.HOSTNAME}${endpoint}`,
      {
        headers: baseHeaders,
      },
    );
    return (await handleEnableBankingError(response)) as T;
  },
  post: async <T>(
    endpoint: string,
    payload: unknown,
    jwt?: string,
  ): Promise<T> | never => {
    const baseHeaders = {
      Authorization: `Bearer ${jwt ? jwt : enableBankingservice.getJWT()}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(
      `${enableBankingservice.HOSTNAME}${endpoint}`,
      {
        headers: baseHeaders,
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
    return (await handleEnableBankingError(response)) as T;
  },

  getApplication: async (): Promise<GetApplicationResponse> | never => {
    return await enableBankingservice.get('application');
  },
  getASPSPs: async (country?: string): Promise<GetAspspsResponse> | never => {
    const params: string[] = ['service=AIS'];
    if (country) {
      params.push(`country=${country}`);
    }
    return await enableBankingservice.get(`aspsps?${params.join('&')}`);
  },

  startAuth: async (
    country: string,
    aspsp: string,
    host: string,
    exp: number,
  ): Promise<AuthenticationStartResponse> | never => {
    const valid_until = new Date();
    valid_until.setSeconds(valid_until.getSeconds() + exp);

    const state = crypto.randomUUID();

    const body = {
      access: {
        valid_until: valid_until.toISOString(),
      },
      aspsp: {
        name: aspsp,
        country,
      },
      state,
      redirect_url: `${host.replace('http', 'https')}/enablebanking/auth_callback`,
    };

    const resp: StartAuthorizationResponse = await enableBankingservice.post(
      'auth',
      body,
    );

    return {
      redirect_url: resp['url'],
      state,
    };
  },

  authorizeSession: async (state: string, code: string) => {
    const { session_id } = await enableBankingservice.post<{
      session_id: string;
    }>('sessions', { code });
    enableBankingservice._activeAuths.set(state, session_id);
    return session_id;
  },

  getSessionIdFromState: (state: string): string | undefined => {
    return enableBankingservice._activeAuths.get(state);
  },

  getAccounts: async (
    session_id: string,
  ): Promise<EnableBankingToken> | never => {
    const session_response: GetSessionResponse = await enableBankingservice.get(
      `/sessions/${session_id}`,
    );
    const bank_id = [
      session_response.aspsp.country,
      session_response.aspsp.name,
    ].join('_');
    const accounts: Account[] = [];
    for (const account_id of session_response.accounts) {
      const account: AccountResource = await enableBankingservice.get(
        `/accounts/${account_id}/details`,
      );
      const balance: HalBalances = await enableBankingservice.get(
        `/accounts/${account_id}/balances`,
      );
      const name = account.account_id
        ? (account.account_id.iban ?? 'unknown')
        : 'unknown';

      accounts.push({
        account_id,
        name,
        balance: parseFloat(balance.balances[0].balance_amount.amount),
        institution: session_response.aspsp.name,
      });
    }
    return {
      session_id,
      bank_id,
      accounts,
    };
  },
};
