import { useState, useEffect } from 'react';

import { send } from 'loot-core/src/platform/client/fetch';

export function useServerURL() {
  let [serverUrl, setServerUrl] = useState('');
  useEffect(() => {
    async function run() {
      let url = (await send('get-server-url')) || '';
      if (url === 'https://not-configured/') {
        url = '';
      }
      setServerUrl(url);
    }
    run();
  }, []);
  return serverUrl;
}
