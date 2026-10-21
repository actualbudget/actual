import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { send } from '@actual-app/core/platform/client/connection';
import { render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { TestProviders } from '#mocks';

import { useBudgetBounds } from './useBudgetBounds';

vi.mock('@actual-app/core/platform/client/connection');

afterEach(() => {
  vi.restoreAllMocks();
});

function BudgetBounds() {
  const { data } = useBudgetBounds();
  return <div>{data?.end}</div>;
}

it('passes a failed bounds request to the error boundary instead of leaving the budget loading', async () => {
  const error = new Error('Unable to load budget bounds');
  vi.mocked(send).mockRejectedValue(error);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const onError = vi.fn();

  render(
    <TestProviders>
      <ErrorBoundary
        fallback={<div role="alert">Load failed</div>}
        onError={onError}
      >
        <BudgetBounds />
      </ErrorBoundary>
    </TestProviders>,
  );

  expect(await screen.findByRole('alert')).toHaveTextContent('Load failed');
  expect(onError).toHaveBeenCalledWith(error, expect.anything());
});
