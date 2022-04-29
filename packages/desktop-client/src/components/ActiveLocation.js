import React, { useContext } from 'react';

let ActiveLocationContext = React.createContext(null);

export function ActiveLocationProvider({ location, children }) {
  return (
    <ActiveLocationContext.Provider value={location} children={children} />
  );
}

export function useActiveLocation() {
  return useContext(ActiveLocationContext);
}
