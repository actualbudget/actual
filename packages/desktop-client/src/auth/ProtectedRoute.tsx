import { useEffect, useState, type ReactElement } from 'react';

import { View } from '../components/common/View';

import { useAuth } from './AuthProvider';
import { type Permissions } from './types';
import { useLocalPref } from '../hooks/useLocalPref';
import { useSelector } from 'react-redux';
import { State } from 'loot-core/client/state-types';
import { send } from 'loot-core/platform/client/fetch';

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
  const [permissionGrated, setPermissionGrated] = useState(false)
  const [budgetId] = useLocalPref('cloudFileId');

  useEffect(() => {
    setPermissionGrated(hasPermission(permission));

    if (!permissionGrated && validateOwner) {
      send('check-file-access', budgetId).then(({ granted }) => {
        setPermissionGrated(granted);
      });
    }
  }, []);

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
