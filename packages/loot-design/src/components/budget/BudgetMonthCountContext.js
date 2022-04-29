import React, { useContext, useState } from 'react';
import mitt from 'mitt';

export let BudgetMonthCountContext = React.createContext();

export function BudgetMonthCountProvider({ children }) {
  let [displayMax, setDisplayMax] = useState(1);
  let emitter = mitt();

  return (
    <BudgetMonthCountContext.Provider value={{ displayMax, setDisplayMax }}>
      {children}
    </BudgetMonthCountContext.Provider>
  );
}

export function useBudgetMonthCount() {
  return useContext(BudgetMonthCountContext);
}
