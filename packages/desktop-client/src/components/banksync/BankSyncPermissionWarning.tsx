import { Trans } from 'react-i18next';

import { Warning } from '#components/alerts';

type BankSyncPermissionWarningProps = {
  permissionWarning: 'general' | 'file-owner';
};

export function BankSyncPermissionWarning({
  permissionWarning,
}: BankSyncPermissionWarningProps) {
  return (
    <Warning>
      {permissionWarning === 'file-owner' ? (
        <Trans>
          You don&apos;t have the required permissions to configure all bank
          sync providers. You can set up Pluggy.ai because you are the owner of
          this budget file.
        </Trans>
      ) : (
        <Trans>
          You don&apos;t have the required permissions to configure bank sync
          providers. Please contact an Admin.
        </Trans>
      )}
    </Warning>
  );
}
