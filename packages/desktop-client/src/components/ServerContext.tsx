import React, {
  createContext,
  useState,
  useCallback,
  useEffect,
  useContext,
  type ReactNode,
} from 'react';

import { send } from 'loot-core/src/platform/client/fetch';

type LoginMethods = {
  method: string;
  displayName: string;
  active: boolean;
};

type ServerContextValue = {
  url: string | null;
  version: string;
  multiuserEnabled: boolean;
  availableLoginMethods: LoginMethods[];
  setURL: (
    url: string,
    opts?: { validate?: boolean },
  ) => Promise<{ error?: string }>;
  refreshLoginMethods: () => Promise<void>;
};

const ServerContext = createContext<ServerContextValue>({
  url: null,
  version: '',
  multiuserEnabled: false,
  availableLoginMethods: [],
  setURL: () => Promise.reject(new Error('ServerContext not initialized')),
  refreshLoginMethods: () =>
    Promise.reject(new Error('ServerContext not initialized')),
});

export const useServerURL = () => useContext(ServerContext).url;
export const useServerVersion = () => useContext(ServerContext).version;
export const useSetServerURL = () => useContext(ServerContext).setURL;
export const useMultiuserEnabled = () => {
  const { multiuserEnabled } = useContext(ServerContext);
  const loginMethod = useLoginMethod();
  return multiuserEnabled && loginMethod === 'openid';
};

export const useLoginMethod = () => {
  const availableLoginMethods = useContext(ServerContext).availableLoginMethods;

  if (!availableLoginMethods || availableLoginMethods.length === 0) {
    return 'password';
  }

  return availableLoginMethods.filter(m => m.active)[0]?.method ?? 'password';
};
export const useAvailableLoginMethods = () =>
  useContext(ServerContext).availableLoginMethods;

async function getServerVersion() {
  const result = await send('get-server-version');
  if ('version' in result) {
    return result.version;
  }
  return '';
}

export const useRefreshLoginMethods = () =>
  useContext(ServerContext).refreshLoginMethods;

export function ServerProvider({ children }: { children: ReactNode }) {
  const [serverURL, setServerURL] = useState('');
  const [version, setVersion] = useState('');
  const [multiuserEnabled, setMultiuserEnabled] = useState(false);
  const [availableLoginMethods, setAvailableLoginMethods] = useState<
    LoginMethods[]
  >([]);

  useEffect(() => {
    async function run() {
      setServerURL(await send('get-server-url'));
      setVersion(await getServerVersion());
    }
    run();
  }, []);

  const refreshLoginMethods = useCallback(async () => {
    if (serverURL) {
      const data = await send('subscribe-get-login-methods');
      setAvailableLoginMethods(data.methods);
    }
  }, [serverURL]);

  useEffect(() => {
    refreshLoginMethods();
    send('multiuser-get').then(data => {
      setMultiuserEnabled(data);
    });
  }, [serverURL, refreshLoginMethods]);

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
        multiuserEnabled,
        availableLoginMethods,
        setURL,
        version: version ? `v${version}` : 'N/A',
        refreshLoginMethods,
      }}
    >
      {children}
    </ServerContext.Provider>
  );
}
