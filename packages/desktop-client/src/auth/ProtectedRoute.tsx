import { useEffect, useState, type ReactElement } from 'react';

import { type RemoteFile, type SyncedLocalFile } from 'loot-core/types/file';

import { View } from '../components/common/View';
import { useMetadataPref } from '../hooks/useMetadataPref';
import { useAppSelector } from '../redux';

import { useAuth } from './AuthProvider';
import { type Permissions } from './types';

type ProtectedRouteProps = {
  permission: Permissions;
  element: ReactElement;
  validateOwner?: boolean;
};

export const ProtectedRoute = ({
  element,
  permission,
  validateOwner,
}: ProtectedRouteProps) => {
  const { hasPermission } = useAuth();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [cloudFileId] = useMetadataPref('cloudFileId');
  const allFiles = useAppSelector(state => state.budgets.allFiles || []);
  const remoteFiles = allFiles.filter(
    (f): f is SyncedLocalFile | RemoteFile =>
      f.state === 'remote' || f.state === 'synced' || f.state === 'detached',
  );
  const currentFile = remoteFiles.find(f => f.cloudFileId === cloudFileId);
  const userData = useAppSelector(state => state.user.data);

  useEffect(() => {
    const hasRequiredPermission = hasPermission(permission);
    setPermissionGranted(hasRequiredPermission);

    if (!hasRequiredPermission && validateOwner) {
      if (currentFile) {
        setPermissionGranted(
          currentFile.usersWithAccess.some(u => u.userId === userData?.userId),
        );
      }
    }
  }, [
    cloudFileId,
    permission,
    validateOwner,
    hasPermission,
    currentFile,
    userData,
  ]);

  return permissionGranted ? (
    element
  ) : (
    <View
      style={{
        margin: '50px',
      }}
    >
      <h3>You don&apos;t have permission to view this page</h3>
    </View>
  );
};
