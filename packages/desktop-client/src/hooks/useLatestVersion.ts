import { useState, useEffect } from 'react';

import { getIsOutdated, getLatestVersion } from '../util/versions';

export function useIsOutdated(): boolean {
  const [isOutdated, setIsOutdated] = useState(false);
  const latestVersion = useLatestVersion();

  useEffect(() => {
    (async () => {
      setIsOutdated(await getIsOutdated(latestVersion));
    })();
  }, [latestVersion]);

  return isOutdated;
}

export function useLatestVersion(): string {
  const [latestVersion, setLatestVersion] = useState('');
  useEffect(() => {
    (async () => {
      setLatestVersion(await getLatestVersion());
    })();
  }, []);

  return latestVersion;
}
