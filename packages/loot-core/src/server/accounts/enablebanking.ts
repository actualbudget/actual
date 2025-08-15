import * as asyncStorage from '../../platform/server/asyncStorage';
import { createApp } from '../app';
import { get, post } from '../post';
import { getServer } from '../server-config';

export type AccountHandlers = {
  'enablebanking-status': typeof getStatus;
};

async function getStatus() {
    const userToken = await asyncStorage.getItem('user-token');
    const serverConfig = getServer();
    const res = await post(
          serverConfig.ENABLEBANKING_SERVER + '/status',
          {
            'X-ACTUAL-TOKEN': userToken,
          },
        )
    return res;
}

export const app = createApp<AccountHandlers>();
app.method('enablebanking-status',getStatus)
