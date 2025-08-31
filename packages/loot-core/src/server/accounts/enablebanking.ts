import { AccountEntity } from 'loot-core/types/models';

import * as asyncStorage from '../../platform/server/asyncStorage';
import {
  EnableBankingEndpoints,
  EnableBankingResponse,
} from '../../types/models/enablebanking';
import { createApp } from '../app';
import { BankSyncError } from '../errors';
import { get as _get, post as _post } from '../post';
import { getServer } from '../server-config';

type EBE = EnableBankingEndpoints;

type KeysRequiringBody = {
  [K in keyof EBE]: [EBE[K]['body']] extends [undefined] ? never : K;
}[keyof EBE];

type KeysWithoutBody = {
  [K in keyof EBE]: [EBE[K]['body']] extends [undefined] ? K : never;
}[keyof EBE];

function post<T extends KeysRequiringBody>(
  path: T,
  body: EBE[T]['body'],
): Promise<EnableBankingResponse<T>>;
function post<T extends KeysWithoutBody>(
  path: T,
): Promise<EnableBankingResponse<T>>;

async function post(path: keyof EBE, body?: unknown) {
  const userToken = await asyncStorage.getItem('user-token');
  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error('Failed to get server config.');
  }

  return await _post(serverConfig.ENABLEBANKING_SERVER + path, body, {
    'X-ACTUAL-TOKEN': userToken,
  });
}

async function configure({
  secret,
  applicationId,
}: {
  secret: string | null;
  applicationId: string | null;
}) {
  return await post('/configure', {
    secret,
    applicationId,
  });
}

async function getStatus() {
  return await post('/status');
}

async function getCountries() {
  return await post('/countries');
}

async function getBanks(body: { country?: string }) {
  const { country } = body || {};
  return await post('/get_aspsps', { country });
}

async function startAuth({
  country,
  aspsp,
}: {
  country: string;
  aspsp: string;
}) {
  return await post('/start_auth', { country, aspsp });
}

let stopPolling = false;

async function pollAuth({
  state,
}: {
  state: string;
}): Promise<EnableBankingResponse<'/get_session'>> {
  stopPolling = false;
  const startTime = Date.now();
  console.log('starting poll');
  while (!stopPolling) {
    const resp = await post('/get_session', { state });
    console.log('poll response', resp);
    if (resp.data || resp.error.error_code !== 'NOT_READY') {
      console.log('returning');
      return resp;
    }
    if (Date.now() - startTime >= 1000 * 60 * 10) {
      console.log('Time out reached after 10 minutes');
      return {
        error: {
          error_code: 'TIME_OUT',
          error_type: 'Time out has been reached',
        },
      };
    }
    console.log('waiting');
    await new Promise(r => setTimeout(r, 1000));
  }

  return {
    error: {
      error_code: 'TIME_OUT',
      error_type: 'Polling was stopped',
    },
  };
}

async function stopAuthPoll() {
  stopPolling = true;
}

async function completeAuth({ state, code }: { state: string; code: string }) {
  return await post('/complete_auth', { state, code });
}

export async function downloadEnableBankingTransactions(
  acctId: AccountEntity['id'],
  startDate: string,
  bankId: string,
) {
  const userToken = await asyncStorage.getItem('user-token');
  if (!userToken) return;

  console.log(`Pulling transactions from enablebanking since ${startDate}`);

  const { error, data } = await post('/transactions', {
    account_id: acctId,
    startDate,
    bank_id: bankId,
  });
  if (error) {
    console.log('got error', error);
    throw new BankSyncError(
      error.error_type,
      error.error_code,
      error.error_code,
    );
  }
  return data;
}

export type AccountHandlers = {
  'enablebanking-configure': typeof configure;
  'enablebanking-status': typeof getStatus;
  'enablebanking-banks': typeof getBanks;
  'enablebanking-countries': typeof getCountries;
  'enablebanking-startauth': typeof startAuth;
  'enablebanking-pollauth': typeof pollAuth;
  'enablebanking-completeauth': typeof completeAuth;
  'enablebanking-stoppolling': typeof stopAuthPoll;
};

export const app = createApp<AccountHandlers>();
app.method('enablebanking-configure', configure);
app.method('enablebanking-status', getStatus);
app.method('enablebanking-banks', getBanks);
app.method('enablebanking-countries', getCountries);
app.method('enablebanking-startauth', startAuth);
app.method('enablebanking-pollauth', pollAuth);
app.method('enablebanking-completeauth', completeAuth);
app.method('enablebanking-stoppolling', stopAuthPoll);
