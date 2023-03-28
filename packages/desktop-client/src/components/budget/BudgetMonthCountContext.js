import React, { useContext, useState } from 'react';

export let BudgetMonthCountContext = React.createContext();

export function BudgetMonthCountProvider({ children }) {
  let [displayMax, setDisplayMax] = useState(1);

  return (
    <BudgetMonthCountContext.Provider value={{ displayMax, setDisplayMax }}>
      {children}
    </BudgetMonthCountContext.Provider>
  );
}

export function useBudgetMonthCount() {
  return useContext(BudgetMonthCountContext);
}
