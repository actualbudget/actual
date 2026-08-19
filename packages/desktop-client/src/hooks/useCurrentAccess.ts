import type { RemoteFile, SyncedLocalFile } from '@actual-app/core/types/file';

import { useAuth } from '#auth/AuthProvider';
import { Permissions } from '#auth/types';
import { useMultiuserEnabled } from '#components/ServerContext';
import { useMetadataPref } from '#hooks/useMetadataPref';
import { useSelector } from '#redux';

export function useCurrentAccess() {
  const [cloudFileId] = useMetadataPref('cloudFileId');
  const allFiles = useSelector(state => state.budgetfiles.allFiles || []);
  const userData = useSelector(state => state.user.data);
  const { hasPermission } = useAuth();
  const multiuserEnabled = useMultiuserEnabled();
  const currentFile = allFiles.find(
    (file): file is SyncedLocalFile | RemoteFile =>
      (file.state === 'remote' ||
        file.state === 'synced' ||
        file.state === 'detached') &&
      file.cloudFileId === cloudFileId,
  );

  return {
    cloudFileId,
    isAdmin: !multiuserEnabled || hasPermission(Permissions.ADMINISTRATOR),
    isFileOwner: Boolean(
      userData?.userId && currentFile?.owner === userData.userId,
    ),
  };
}
