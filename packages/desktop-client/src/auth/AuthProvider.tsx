import React, { createContext, useContext, type ReactNode } from 'react';
import { useSelector } from 'react-redux';

import { type State } from 'loot-core/client/state-types';

import { useServerURL } from '../components/ServerContext';

import { type Permissions } from './types';

type AuthContextType = {
  hasPermission: (permission?: Permissions) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthProviderProps = {
  children?: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const userData = useSelector((state: State) => state.user.data);
  const serverUrl = useServerURL();

  const hasPermission = (permission?: Permissions) => {
    if (!permission) {
      return true;
    }

    return (
      !serverUrl ||
      userData?.permission?.toUpperCase() === permission?.toUpperCase()
    );
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
