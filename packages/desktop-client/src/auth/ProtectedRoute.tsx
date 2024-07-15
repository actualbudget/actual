import { type ReactElement } from 'react';

import { View } from '../components/common/View';
import { useResponsive } from '../ResponsiveProvider';
import { theme } from '../style';

import { useAuth } from './AuthProvider';
import { type Permissions } from './types';

type ProtectedRouteProps = {
  permission: Permissions;
  element: ReactElement;
};

export const ProtectedRoute = ({
  element,
  permission,
}: ProtectedRouteProps) => {
  const { hasPermission } = useAuth();
  const { isNarrowWidth } = useResponsive();

  return hasPermission(permission) ? (
    element
  ) : (
    <View
      style={{
        margin: '50px',
        backgroundColor: isNarrowWidth
          ? theme.mobilePageBackground
          : theme.pageBackground,
      }}
    >
      <h3>You don&apos;t have permission to view this</h3>
    </View>
  );
};
