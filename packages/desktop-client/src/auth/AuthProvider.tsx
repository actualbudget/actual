import React, { createContext, useContext, ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { State } from 'loot-core/client/state-types';

interface AuthContextType {
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType>(undefined);

type AuthProviderProps = {
  children?: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const userData = useSelector((state: State) => state.user.data);

  const hasPermission = (permission: string) => {
    return userData.offline || (userData.permissions?.includes(permission?.toUpperCase()) ?? false);
  };

  return (
    <AuthContext.Provider value={{ hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};