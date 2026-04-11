import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import type { PayPeriodConfig } from '@actual-app/core/types/prefs';

const PayPeriodContext = createContext<PayPeriodConfig | undefined>(undefined);

type PayPeriodProviderProps = {
  config: PayPeriodConfig | undefined;
  children: ReactNode;
};

export function PayPeriodProvider({
  config,
  children,
}: PayPeriodProviderProps) {
  return (
    <PayPeriodContext.Provider value={config}>
      {children}
    </PayPeriodContext.Provider>
  );
}

export function usePayPeriodConfig(): PayPeriodConfig | undefined {
  return useContext(PayPeriodContext);
}
