import type { ReactNode } from 'react';
import { Trans } from 'react-i18next';

import { useServerVersion } from '#components/ServerContext';
import { cmpSemanticVersion } from '#util/versions';

type ServerVersionErrorProps = {
  minimumVersion: string;
  children: ReactNode;
};

// Use only after a request fails: nightly builds may report an older version.
export function ServerVersionError({
  minimumVersion,
  children,
}: ServerVersionErrorProps) {
  const version = useServerVersion();
  if (
    /^v?\d+\.\d+\.\d+$/.test(version) &&
    cmpSemanticVersion(version, minimumVersion) < 0
  ) {
    return (
      <Trans>Requires server version {{ minimumVersion }} or newer.</Trans>
    );
  }
  return children;
}
