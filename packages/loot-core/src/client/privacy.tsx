import React, { createContext, useContext } from 'react';
import { useSelector } from 'react-redux';

type TPrivacyModeContext = {
  enabled: boolean;
};

let PrivacyContext = createContext<TPrivacyModeContext>(null);

export function PrivacyProvider({ children }) {
  let prefs = useSelector(state => state.prefs);
  let isPrivacyEnabled = prefs?.local?.isPrivacyEnabled || false;

  return (
    <PrivacyContext.Provider
      value={{ enabled: isPrivacyEnabled }}
      children={children}
    />
  );
}

export function usePrivacyMode() {
  let context = useContext(PrivacyContext);
  return context?.enabled || false;
}
