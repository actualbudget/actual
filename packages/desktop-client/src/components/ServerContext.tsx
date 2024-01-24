// @ts-strict-ignore
import React, {
  createContext,
  useState,
  useCallback,
  useEffect,
  useContext,
  type ReactNode,
} from 'react';

import { send } from 'loot-core/src/platform/client/fetch';

type ServerContextValue = {
  url: string | null;
  version: string;
  setURL: (
    url: string,
    opts?: { validate?: boolean },
  ) => Promise<{ error?: string }>;
};

const ServerContext = createContext<ServerContextValue>({
  url: null,
  version: '',
  setURL: () => Promise.reject(new Error('ServerContext not initialized')),
});

export const useServerURL = () => useContext(ServerContext).url;
export const useServerVersion = () => useContext(ServerContext).version;
export const useSetServerURL = () => useContext(ServerContext).setURL;

async function getServerVersion() {
  const result = await send('get-server-version');
  if ('version' in result) {
    return result.version;
  }
  return '';
}

export function ServerProvider({ children }: { children: ReactNode }) {
  const [serverURL, setServerURL] = useState('');
  const [version, setVersion] = useState('');

  useEffect(() => {
    async function run() {
      setServerURL(await send('get-server-url'));
      setVersion(await getServerVersion());
    }
    run();
  }, []);

  const setURL = useCallback(
    async (url: string, opts: { validate?: boolean } = {}) => {
      const { error } = await send('set-server-url', { ...opts, url });
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
