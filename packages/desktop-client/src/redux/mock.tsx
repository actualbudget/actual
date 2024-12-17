import React, { ReactNode } from 'react';
import { Provider } from 'react-redux';

import { store, resetStore } from 'loot-core/client/store/mock';

resetStore();

export function TestProvider({ children }: { children: ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
