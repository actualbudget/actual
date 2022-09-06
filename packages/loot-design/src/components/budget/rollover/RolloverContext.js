import React, { useContext } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

let Context = React.createContext(null);

export function RolloverContext({
  categoryGroups,
  summaryCollapsed,
  onBudgetAction,
  onToggleSummaryCollapse,
  children
}) {
  let currentMonth = monthUtils.currentMonth();

  return (
    <Context.Provider
      value={{
        currentMonth,
        categoryGroups,
        summaryCollapsed,
        onBudgetAction,
        onToggleSummaryCollapse
      }}
      children={children}
    />
  );
}

export function useRollover() {
  return useContext(Context);
}
