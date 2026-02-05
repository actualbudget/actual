import React from 'react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { configureAppStore } from './redux/store';
import type { AppStore } from './redux/store';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

let testQueryClient = createTestQueryClient();

export function createTestAppStore() {
  return configureAppStore({
    queryClient: testQueryClient,
  });
}

export let testStore: AppStore = createTestAppStore();

export function resetTestProviders() {
  testQueryClient = createTestQueryClient();
  testStore = createTestAppStore();
}

export function TestProviders({
  children,
  queryClient,
  store,
}: {
  queryClient?: QueryClient;
  store?: AppStore;
  children: ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient ?? testQueryClient}>
      <Provider store={store ?? testStore}>{children}</Provider>
    </QueryClientProvider>
  );
}
