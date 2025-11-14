import React, { type ReactNode } from 'react';
import { Provider } from 'react-redux';

import { QueryClient } from '@tanstack/react-query';

import { configureAppStore, type AppStore } from './store';

let mockQueryClient = new QueryClient();

export let mockStore: AppStore = configureAppStore({
  queryClient: mockQueryClient,
});

export function resetMockStore() {
  mockQueryClient = new QueryClient();
  mockStore = configureAppStore({ queryClient: mockQueryClient });
}

export function TestProvider({ children }: { children: ReactNode }) {
  return <Provider store={mockStore}>{children}</Provider>;
}
