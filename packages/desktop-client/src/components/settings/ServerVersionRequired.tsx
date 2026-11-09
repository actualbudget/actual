import type { ReactNode } from 'react';
import { Trans } from 'react-i18next';

import { useServerVersion } from '#components/ServerContext';
import { cmpSemanticVersion } from '#util/versions';

import { SettingsRow } from './SettingsRow';

type ServerVersionRequiredProps = {
  minimumVersion: string;
  title: ReactNode;
  children: ReactNode;
};

export function ServerVersionRequired({
  minimumVersion,
  title,
  children,
}: ServerVersionRequiredProps) {
  const version = useServerVersion();
  if (cmpSemanticVersion(version, minimumVersion) >= 0) {
    return children;
  }
  return (
    <SettingsRow
      title={title}
      description={
        <Trans>Requires server version {{ minimumVersion }} or newer.</Trans>
      }
    />
  );
}
