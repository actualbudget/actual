import React, {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useState,
} from 'react';

type BudgetMonthCountContextValue = {
  displayMax: number;
  setDisplayMax: Dispatch<SetStateAction<number>>;
};

let BudgetMonthCountContext = createContext<BudgetMonthCountContextValue>(null);

type BudgetMonthCountProviderProps = {
  children: ReactNode;
};

export function BudgetMonthCountProvider({
  children,
}: BudgetMonthCountProviderProps) {
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
