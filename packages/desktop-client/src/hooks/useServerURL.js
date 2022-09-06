import { useState, useEffect } from 'react';

import { send } from 'loot-core/src/platform/client/fetch';

export function useServerURL() {
  let [url, setUrl] = useState('');
  useEffect(() => {
    async function run() {
      let url = (await send('get-server-url')) || '';
      if (url === 'https://not-configured/') {
        url = '';
      }
      setUrl(url);
    }
    run();
  }, []);
  return url;
}
