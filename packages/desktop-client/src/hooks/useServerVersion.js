import { useState, useEffect } from 'react';

import { send } from 'loot-core/src/platform/client/fetch';

function useServerVersion() {
  let [version, setVersion] = useState('');

  useEffect(() => {
    (async () => {
      const { error, version } = await send('get-server-version');

      if (error) {
        setVersion('');
      } else {
        setVersion(version);
      }
    })();
  }, []);

  return version ? `v${version}` : 'N/A';
}

export default useServerVersion;
