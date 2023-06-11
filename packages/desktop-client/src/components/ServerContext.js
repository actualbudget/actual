import React, {
  createContext,
  useState,
  useCallback,
  useEffect,
  useContext,
} from 'react';

import { send } from 'loot-core/src/platform/client/fetch';

const ServerContext = createContext({});

export const useServerURL = () => useContext(ServerContext).url;
export const useServerVersion = () => useContext(ServerContext).version;
export const useSetServerURL = () => useContext(ServerContext).setURL;

async function getServerVersion() {
  let { error, version } = await send('get-server-version');
  if (error) {
    return '';
  }
  return version;
}

export function ServerProvider({ children }) {
  let [serverURL, setServerURL] = useState('');
  let [version, setVersion] = useState('');

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
