import { AccountEntity } from 'loot-core/types/models';

import * as asyncStorage from '../../platform/server/asyncStorage';
import {
  EnableBankingBank,
  EnableBankingToken,
  ErrorResponse,
  isErrorResponse,
  EnableBankingStatusResponse,
  EnableBankingAuthenticationStartResponse,
} from '../../types/models/enablebanking';
import { createApp } from '../app';
import { BankSyncError } from '../errors';
import { get as _get, post as _post } from '../post';
import { getServer } from '../server-config';

async function post<T>(endpoint: string, data?: unknown) {
  const userToken = await asyncStorage.getItem('user-token');
  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error('Failed to get server config.');
  }

  const response = await _post(
    serverConfig.ENABLEBANKING_SERVER + endpoint,
    data,
    {
      'X-ACTUAL-TOKEN': userToken,
    },
  );

  if (isErrorResponse(response)) {
    throw new BankSyncError(
      response.error_type??response.error_code,
      response.error_code,
      response.error_code,
    );
  }

  return response as T;
}

async function getStatus(): Promise<EnableBankingStatusResponse> | never {
  const resp: EnableBankingStatusResponse = await post('/status');
  return resp;
}

async function getCountries(): Promise<{ countries: string[] }> | never {
  return await post('/countries');
}

async function getBanks(): Promise<EnableBankingBank[]> | never {
  const resp: EnableBankingBank[] = await post('/get_aspsps');
  return resp;
}

async function startAuth({
  country,
  aspsp,
}: {
  country: string;
  aspsp: string;
}): Promise<EnableBankingAuthenticationStartResponse> | never {
  const resp: EnableBankingAuthenticationStartResponse = await post(
    '/start_auth',
    { country, aspsp },
  );
  return resp;
}

let stopPolling = false;
async function pollAuth({ state }: { state: string }) {
  stopPolling = false;
  const startTime = Date.now();

  async function pollFunction(
    cb: (
      data:
        | { status: 'timeout' }
        | { status: 'unknown'; message?: string }
        | { status: 'success'; data: EnableBankingToken },
    ) => void,
  ) {
    if (stopPolling) {
      return;
    }

    if (Date.now() - startTime >= 1000 * 60 * 10) {
      cb({ status: 'timeout' });
      return;
    }

    try {
      const data: EnableBankingToken = await post('/get_session', { state });

      cb({ status: 'success', data });
    } catch (e) {
      if (e instanceof BankSyncError ) {
        if (e.code === 'NOT_READY'){
          setTimeout(() => pollFunction(cb), 3000);
          return
        }
        console.error('Failed linking Enable Banking account:', e.code);
        cb({status:'unknown', message:e.reason});
        return;
      }
      console.error('Failed linking Enable Banking account:', (e as Error).name);
      cb({ status: 'unknown', message: e instanceof Error ?  e.message: 'unknown' });
    }
  }
  return new Promise<EnableBankingToken | ErrorResponse>(resolve => {
    pollFunction(data => {
      if (data.status === 'success') {
        resolve(data.data);
        return;
      }

      if (data.status === 'timeout') {
        resolve({
          error_code: 'TIME_OUT',
          error_type: 'Time out has been reached',
        });
        return;
      }

      resolve({
        error_code: 'SERVER',
        error_type: data.message,
      });
    });
  });
}

async function stopAuthPoll() {
  stopPolling = true;
}

async function completeAuth({ state, code }: { state: string; code: string }) {
  //erro handling
  await post('/complete_auth', { state, code });
  return;
}

export async function downloadEnableBankingTransactions(
  acctId: AccountEntity['id'],
  since: string,
  bankId: string,
) {
  const userToken = await asyncStorage.getItem('user-token');
  if (!userToken) return;

  console.log(`Pulling transactions from enablebanking since ${since}`);

  const res = await post('/transactions', {
    account_id: acctId,
    startDate: since,
    bank_id: bankId,
  });
  console.log(res);
  return res;
}

export type AccountHandlers = {
  'enablebanking-status': typeof getStatus;
  'enablebanking-banks': typeof getBanks;
  'enablebanking-countries': typeof getCountries;
  'enablebanking-startauth': typeof startAuth;
  'enablebanking-pollauth': typeof pollAuth;
  'enablebanking-completeauth': typeof completeAuth;
  'enablebanking-stoppolling': typeof stopAuthPoll;
};

export const app = createApp<AccountHandlers>();
app.method('enablebanking-status', getStatus);
app.method('enablebanking-banks', getBanks);
app.method('enablebanking-countries', getCountries);
app.method('enablebanking-startauth', startAuth);
app.method('enablebanking-pollauth', pollAuth);
app.method('enablebanking-completeauth', completeAuth);
app.method('enablebanking-stoppolling', stopAuthPoll);
