import React, { createContext, useContext } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

let Context = createContext(null);

export function ReportProvider({
  summaryCollapsed,
  onBudgetAction,
  onToggleSummaryCollapse,
  children,
}) {
  let currentMonth = monthUtils.currentMonth();

  return (
    <Context.Provider
      value={{
        currentMonth,
        summaryCollapsed,
        onBudgetAction,
        onToggleSummaryCollapse,
      }}
      children={children}
    />
  );
}

export function useReport() {
  return useContext(Context);
}
