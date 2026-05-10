import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { Title } from './Title';

const ROUTE_TITLES: Array<[RegExp, string]> = [
  [/^\/budget$/, 'Budget'],
  [/^\/reports/, 'Reports'],
  [/^\/schedules\/[^/]+$/, 'Edit Schedule'],
  [/^\/schedules$/, 'Schedules'],
  [/^\/payees\/[^/]+$/, 'Edit Payee'],
  [/^\/payees$/, 'Payees'],
  [/^\/rules\/[^/]+$/, 'Edit Rule'],
  [/^\/rules$/, 'Rules'],
  [/^\/bank-sync\/account\/[^/]+\/edit$/, 'Edit Account'],
  [/^\/bank-sync$/, 'Bank Sync'],
  [/^\/tags$/, 'Tags'],
  [/^\/settings$/, 'Settings'],
  [/^\/gocardless\/link$/, 'GoCardless Link'],
  [/^\/accounts$/, 'All Accounts'],
  [/^\/transactions\/[^/]+$/, 'Edit Transaction'],
  [/^\/user-directory$/, 'User Directory'],
  [/^\/user-access$/, 'User Access'],
];

type TitleContextType = {
  setDynamicTitle: (title: string | null) => void;
};

const TitleContext = createContext<TitleContextType>({
  setDynamicTitle: () => {
    throw new Error('TitleContext not initialized');
  },
});

type TitleProviderProps = {
  children: ReactNode;
};

export function TitleProvider({ children }: TitleProviderProps) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [dynamicTitle, setDynamicTitle] = useState<string | null>(null);

  const staticEntry = ROUTE_TITLES.find(([pattern]) => pattern.test(pathname));
  const title = dynamicTitle ?? (staticEntry ? t(staticEntry[1]) : null);

  return (
    <TitleContext.Provider value={{ setDynamicTitle }}>
      {title && <Title value={title} />}
      {children}
    </TitleContext.Provider>
  );
}

export function useSetPageTitle(title: string) {
  const { setDynamicTitle } = useContext(TitleContext);
  useEffect(() => {
    setDynamicTitle(title);
    return () => setDynamicTitle(null);
  }, [title, setDynamicTitle]);
}
