import { type FC, type ReactElement } from 'react';
import { useLocation, Navigate } from 'react-router-dom';

import { useAuth } from './AuthProvider';
import { type Permissions } from './types';

type ProtectedRouteProps = {
  permission: Permissions;
  element: ReactElement;
};

const ProtectedRoute = ({ element, permission }: ProtectedRouteProps) => {
  const { hasPermission } = useAuth();
  const location = useLocation();

  return hasPermission(permission) ? (
    element
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
};

export default ProtectedRoute;
