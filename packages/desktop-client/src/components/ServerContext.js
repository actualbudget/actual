import React, {
  createContext,
  useState,
  useCallback,
  useEffect,
  useContext,
} from 'react';

import { send } from 'loot-core/src/platform/client/fetch';

let ServerContext = createContext({});

export let useServerURL = () => useContext(ServerContext).url;
export let useServerVersion = () => useContext(ServerContext).version;
export let useSetServerURL = () => useContext(ServerContext).setURL;

async function getServerVersion() {
  let { error, version } = await send('get-server-version');
  if (error) {
    return '';
  }
  return version;
}

export function ServerProvider({ children }) {
  const [serverURL, setServerURL] = useState('');
  const [version, setVersion] = useState('');

  useEffect(() => {
    async function run() {
      setServerURL(await send('get-server-url'));
      setVersion(await getServerVersion());
    }
    run();
  }, []);

  let setURL = useCallback(
    async (url, opts = {}) => {
      let { error } = await send('set-server-url', { ...opts, url });
      if (!error) {
        setServerURL(await send('get-server-url'));
        setVersion(await getServerVersion());
      }
      return { error };
    },
    [setServerURL],
  );

  return (
    <ServerContext.Provider
      value={{
        url: serverURL,
        setURL,
        version: version ? `v${version}` : 'N/A',
      }}
    >
      {children}
    </ServerContext.Provider>
  );
}
