import React, { createContext, useContext, useState } from 'react';

let BudgetMonthCountContext = createContext();

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
