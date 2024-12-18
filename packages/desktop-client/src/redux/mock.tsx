import React, { type ReactNode } from 'react';
import { Provider } from 'react-redux';

import { mockStore } from 'loot-core/client/store/mock';

export function TestProvider({ children }: { children: ReactNode }) {
  return <Provider store={mockStore}>{children}</Provider>;
}
