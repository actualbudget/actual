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
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [cloudFileId] = useLocalPref('cloudFileId');

  useEffect(() => {
    if (permissionGranted) {
      return;
    }

    setPermissionGranted(hasPermission(permission));

    if (!permissionGranted && validateOwner) {
      send('check-file-access', cloudFileId).then(
        ({ granted }: { granted: boolean }) => {
          setPermissionGranted(granted);
        },
      );
    }
  }, [cloudFileId, permission, validateOwner, hasPermission, permissionGranted]);

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
