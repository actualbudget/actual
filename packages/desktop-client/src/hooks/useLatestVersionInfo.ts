import { useState, useEffect } from 'react';

import { getIsOutdated, getLatestVersion } from '@desktop-client/util/versions';

type LatestVersionInfo = {
  latestVersion: string;
  isOutdated: boolean;
};

export function useLatestVersionInfo(): LatestVersionInfo {
  const [latestVersion, setLatestVersion] = useState('');
  const [isOutdated, setIsOutdated] = useState(false);

  useEffect(() => {
    (async () => {
      const theLatestVersion = await getLatestVersion();
      setLatestVersion(theLatestVersion);
      setIsOutdated(await getIsOutdated(theLatestVersion));
    })();
  }, []);

  return { latestVersion, isOutdated };
}
