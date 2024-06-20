// @ts-strict-ignore
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

const BudgetMonthCountContext =
  createContext<BudgetMonthCountContextValue>(null);

type BudgetMonthCountProviderProps = {
  children: ReactNode;
};

export function BudgetMonthCountProvider({
  children,
}: BudgetMonthCountProviderProps) {
  const [displayMax, setDisplayMax] = useState(1);

  return (
    <BudgetMonthCountContext.Provider value={{ displayMax, setDisplayMax }}>
      {children}
    </BudgetMonthCountContext.Provider>
  );
}

export function useBudgetMonthCount() {
  return useContext(BudgetMonthCountContext);
}
