import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { t } from 'i18next';

import { send } from 'loot-core/platform/client/fetch';
import { type Handlers } from 'loot-core/types/handlers';

import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';

type LoginMethod = {
  method: string;
  displayName: string;
  active: boolean;
};

type ServerContextValue = {
  url: string | null;
  version: string;
  multiuserEnabled: boolean;
  availableLoginMethods: LoginMethod[];
  setURL: (
    url: string,
    opts?: { validate?: boolean },
  ) => Promise<{ error?: string }>;
  refreshLoginMethods: () => Promise<void>;
  setMultiuserEnabled: (enabled: boolean) => void;
  setLoginMethods: (methods: LoginMethod[]) => void;
};

const ServerContext = createContext<ServerContextValue>({
  url: null,
  version: '',
  multiuserEnabled: false,
  availableLoginMethods: [],
  setURL: () => Promise.reject(new Error('ServerContext not initialized')),
  refreshLoginMethods: () =>
    Promise.reject(new Error('ServerContext not initialized')),
  setMultiuserEnabled: () => {
    throw new Error('ServerContext not initialized');
  },
  setLoginMethods: () => {
    throw new Error('ServerContext not initialized');
  },
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

export const useSetMultiuserEnabled = () =>
  useContext(ServerContext).setMultiuserEnabled;

export const useSetLoginMethods = () =>
  useContext(ServerContext).setLoginMethods;

export function ServerProvider({ children }: { children: ReactNode }) {
  const dispatch = useDispatch();
  const [serverURL, setServerURL] = useState('');
  const [version, setVersion] = useState('');
  const [multiuserEnabled, setMultiuserEnabled] = useState(false);
  const [availableLoginMethods, setAvailableLoginMethods] = useState<
    LoginMethod[]
  >([]);

  useEffect(() => {
    async function run() {
      const serverURL = await send('get-server-url');
      if (!serverURL) {
        return;
      }
      setServerURL(serverURL);
      setVersion(await getServerVersion());
    }
    run();
  }, []);

  const refreshLoginMethods = useCallback(async () => {
    if (serverURL) {
      const data: Awaited<ReturnType<Handlers['subscribe-get-login-methods']>> =
        await send('subscribe-get-login-methods');
      if ('error' in data) {
        dispatch(
          addNotification({
            notification: {
              type: 'error',
              title: t('Failed to refresh login methods'),
              message: data.error ?? t('Unknown'),
            },
          }),
        );
        setAvailableLoginMethods([]);
      } else if (data.methods) {
        setAvailableLoginMethods(data.methods);
      } else {
        setAvailableLoginMethods([]);
      }
    }
  }, [dispatch, serverURL]);

  useEffect(() => {
    if (serverURL) {
      send('subscribe-needs-bootstrap').then(
        (data: Awaited<ReturnType<Handlers['subscribe-needs-bootstrap']>>) => {
          if ('hasServer' in data && data.hasServer) {
            setAvailableLoginMethods(data.availableLoginMethods || []);
            setMultiuserEnabled(data.multiuser || false);
          }
        },
      );
    }
  }, [serverURL]);

  const setURL = useCallback(
    async (url: string, opts: { validate?: boolean } = {}) => {
      const { error } = await send('set-server-url', { ...opts, url });
      if (!error) {
        const serverURL = await send('get-server-url');
        setServerURL(serverURL!);
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
        setMultiuserEnabled,
        setLoginMethods: setAvailableLoginMethods,
      }}
    >
      {children}
    </ServerContext.Provider>
  );
}
