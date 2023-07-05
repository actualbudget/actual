import React, { createContext, useContext } from 'react';
import { useSelector } from 'react-redux';

type TPrivacyModeContext = {
  enabled: boolean;
};

let PrivacyContext = createContext<TPrivacyModeContext>(null);

export function PrivacyProvider({ children }) {
  let prefs = useSelector(state => state.prefs);
  let isPrivacyEnabled = prefs
    ? prefs.local
      ? prefs.local.isPrivacyEnabled
      : false
    : false;

  return (
    <PrivacyContext.Provider
      value={{ enabled: isPrivacyEnabled }}
      children={children}
    />
  );
}

export function usePrivacyMode() {
  let { enabled } = useContext(PrivacyContext);
  return enabled || false;
}
