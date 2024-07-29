import { useEffect, useState, type ReactElement } from 'react';

import { send } from 'loot-core/platform/client/fetch';

import { View } from '../components/common/View';
import { useLocalPref } from '../hooks/useLocalPref';

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
  const [permissionGrated, setPermissionGrated] = useState(false);
  const [cloudFileId] = useLocalPref('cloudFileId');

  useEffect(() => {
    if (permissionGrated) {
      return;
    }

    setPermissionGrated(hasPermission(permission));

    if (!permissionGrated && validateOwner) {
      send('check-file-access', cloudFileId).then(
        ({ granted }: { granted: boolean }) => {
          setPermissionGrated(granted);
        },
      );
    }
  }, [cloudFileId, permission, validateOwner, hasPermission, permissionGrated]);

  return permissionGrated ? (
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
