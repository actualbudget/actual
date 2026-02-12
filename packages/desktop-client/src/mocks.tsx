import type { ReactNode } from 'react';
import { Provider } from 'react-redux';

import { QueryClientProvider } from '@tanstack/react-query';

import { configureAppStore } from './redux/store';

import { createQueryClient } from '.';

export function createTestQueryClient() {
  return createQueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

export function configureTestAppStore(
  ...args: Parameters<typeof configureAppStore>
) {
  return configureAppStore(...args);
}

let testQueryClient = createTestQueryClient();
let testStore = configureTestAppStore({
  queryClient: testQueryClient,
});

export function resetTestProviders() {
  testQueryClient = createTestQueryClient();
  testStore = configureTestAppStore({ queryClient: testQueryClient });
}

export function TestProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={testQueryClient}>
      <Provider store={testStore}>{children}</Provider>
    </QueryClientProvider>
  );
}
