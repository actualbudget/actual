import React, {
  createContext,
  useState,
  useCallback,
  useEffect,
  useContext,
} from 'react';

import { send } from 'loot-core/src/platform/client/fetch';

const URLContext = createContext(null);
const SetURLContext = createContext(null);
const VersionContext = createContext(null);

export const useServerURL = () => useContext(URLContext);
export const useServerVersion = () => useContext(VersionContext);
export const useSetServerURL = () => useContext(SetURLContext);

async function getServerUrl() {
  let url = (await send('get-server-url')) || '';
  if (url === 'https://not-configured/') {
    url = '';
  }
  return url;
}

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
      setServerURL(await getServerUrl());
      setVersion(await getServerVersion());
    }
    run();
  }, []);

  let setURL = useCallback(
    async url => {
      await send('set-server-url', { url });
      setServerURL(await getServerUrl());
      setVersion(await getServerVersion());
    },
    [setServerURL],
  );

  return (
    <URLContext.Provider value={serverURL}>
      <SetURLContext.Provider value={setURL}>
        <VersionContext.Provider value={version ? `v${version}` : 'N/A'}>
          {children}
        </VersionContext.Provider>
      </SetURLContext.Provider>
    </URLContext.Provider>
  );
}
