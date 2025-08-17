import { EnableBankingBank, EnableBankingToken, ErrorResponse, isErrorResponse } from '../../types/models/enablebanking';
import * as asyncStorage from '../../platform/server/asyncStorage';
import { createApp } from '../app';
import { get as _get, post as _post } from '../post';
import { getServer } from '../server-config';
import { start } from 'repl';

async function post(endpoint:string, data?:unknown){
  const userToken = await asyncStorage.getItem('user-token');
  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error('Failed to get server config.');
  }

  return await _post(
        serverConfig.ENABLEBANKING_SERVER + endpoint,
        data,
        {
          'X-ACTUAL-TOKEN': userToken,
        },
      )
}

async function getStatus():Promise<{configured:boolean}> | never {
  const resp = await post("/status")
  return resp;
}

async function getCountries():Promise<{countries:string[]}> | never {
  return await post("/countries");
}

async function getBanks():Promise<EnableBankingBank[]>|never{
  const resp = await post("/get_aspsps");
  return resp;

}

async function startAuth({country, aspsp}:{country:string, aspsp:string}){
  const resp = await post("/start_auth",{country,aspsp});
  return resp;
}

let stopPolling = false;
async function pollAuth({state}:{state:string}){
  stopPolling = false;
  const startTime = Date.now();


    async function pollFunction(
      cb: (
        data:
          | { status: 'timeout' }
          | { status: 'unknown'; message?: string }
          | { status: 'success'; data: EnableBankingToken},
      ) => void,
    ) {
      if (stopPolling) {
        return;
      }
  
      if (Date.now() - startTime >= 1000 * 60 * 10) {
        cb({ status: 'timeout' });
        return;
      }
  
      const data:EnableBankingToken|ErrorResponse = await post("/get_session",{state});
  
      if (data) {
        if (isErrorResponse(data)) {
          console.error('Failed linking Enable Banking account:', data);
          cb({ status: 'unknown', message: data.error_type });
        } else {
          cb({ status: 'success', data });
        }
      } else {
        setTimeout(() => pollFunction(cb), 3000);
      }
    }
    return new Promise<EnableBankingToken|ErrorResponse>(resolve => {
      pollFunction(data => {
        if (data.status === 'success') {
          resolve(data.data);
          return;
        }
  
        if (data.status === 'timeout') {
          resolve({ error_code: "timeout", error_type: "Time out has been reached"});
          return;
        }
  
        resolve({
          error_code: "unknown",
          error_type: data.message,
        });
      });
    });

}

async function stopAuthPoll() {
  stopPolling = true;
  
}

async function completeAuth({state, code}:{state:string, code:string}){
  const resp = await post("/complete_auth", {state,code});
  return resp;
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
app.method('enablebanking-status',getStatus);
app.method('enablebanking-banks', getBanks);
app.method('enablebanking-countries', getCountries);
app.method('enablebanking-startauth', startAuth);
app.method('enablebanking-pollauth', pollAuth);
app.method('enablebanking-completeauth', completeAuth);
app.method('enablebanking-stoppolling', stopAuthPoll);
