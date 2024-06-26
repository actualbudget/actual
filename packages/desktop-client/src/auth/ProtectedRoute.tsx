import React from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { Permissions } from './types';
import { useAuth } from './AuthProvider';

interface ProtectedRouteProps {
  permission: Permissions;
  element: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ element, permission }) => {
  const { hasPermission } = useAuth();
  const location = useLocation();

  return hasPermission(permission) ? (
    element
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
};

export default ProtectedRoute;