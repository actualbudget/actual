import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

type CurrencyFormatOverride = { currencyCode: string; precision: number };

const CurrencyFormatContext = createContext<CurrencyFormatOverride | null>(
  null,
);

/** Formats amounts inside in an account's recorded currency and precision. */
export function CurrencyFormatProvider({
  currencyCode,
  precision,
  children,
}: CurrencyFormatOverride & { children: ReactNode }) {
  return (
    <CurrencyFormatContext.Provider value={{ currencyCode, precision }}>
      {children}
    </CurrencyFormatContext.Provider>
  );
}

/** Restores budget-currency formatting for base amounts nested inside. */
export function BudgetCurrencyFormat({ children }: { children: ReactNode }) {
  return (
    <CurrencyFormatContext.Provider value={null}>
      {children}
    </CurrencyFormatContext.Provider>
  );
}

/** Wraps an account's own displays in its currency when it is foreign. */
export function AccountCurrencyFormat({
  account,
  children,
}: {
  account?: { currency: string | null; currency_precision: number | null };
  children: ReactNode;
}) {
  if (!account?.currency || account.currency_precision == null) {
    return children;
  }
  return (
    <CurrencyFormatProvider
      currencyCode={account.currency}
      precision={account.currency_precision}
    >
      {children}
    </CurrencyFormatProvider>
  );
}

export function useCurrencyFormatOverride() {
  return useContext(CurrencyFormatContext);
}
