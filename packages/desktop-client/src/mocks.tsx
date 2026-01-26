import { type ReactNode } from 'react';
import { Provider } from 'react-redux';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { configureAppStore, type AppStore } from './redux/store';

let mockQueryClient = new QueryClient();
let mockStore: AppStore = configureAppStore();

export function resetTestProviders() {
  mockQueryClient = new QueryClient();
  mockStore = configureAppStore();
}

export function TestProviders({ children }: { children: ReactNode }) {
  return (
    <Provider store={mockStore}>
      <QueryClientProvider client={mockQueryClient}>
        {children}
      </QueryClientProvider>
    </Provider>
  );
}
