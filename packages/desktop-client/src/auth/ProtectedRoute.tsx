import { type ReactElement } from 'react';
import { useLocation, Navigate } from 'react-router-dom';

import { useAuth } from './AuthProvider';
import { type Permissions } from './types';
import { View } from '../components/common/View';
import { useResponsive } from '../ResponsiveProvider';
import { theme } from '../style';

type ProtectedRouteProps = {
  permission: Permissions;
  element: ReactElement;
};

export const ProtectedRoute = ({
  element,
  permission,
}: ProtectedRouteProps) => {
  const { hasPermission } = useAuth();
  const location = useLocation();
  const { isNarrowWidth } = useResponsive();

  return hasPermission(permission) ? (
    element
  ) : (
    <View style={{margin: '50px',
      backgroundColor: isNarrowWidth
          ? theme.mobilePageBackground
          : theme.pageBackground
    }}>
      <h3>You don't have permission to view this</h3>
    </View>
  );
};
