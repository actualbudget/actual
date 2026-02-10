import React from 'react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { configureAppStore } from './redux/store';
import type { AppStore } from './redux/store';

let mockQueryClient = new QueryClient();

export let mockStore: AppStore = configureAppStore({
  queryClient: mockQueryClient,
});

export function resetTestProviders() {
  mockQueryClient = new QueryClient();
  mockStore = configureAppStore({ queryClient: mockQueryClient });
}

export function TestProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={mockQueryClient}>
      <Provider store={mockStore}>{children}</Provider>
    </QueryClientProvider>
  );
}
