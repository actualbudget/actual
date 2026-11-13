import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { OAuthConsentApp } from './OAuthConsentApp';

vi.mock('#components/Background', () => ({
  Background: () => null,
}));

afterEach(() => vi.unstubAllGlobals());

it('requires an explicit budget selection before allowing access', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'ok',
        data: {
          clientName: 'Budget helper',
          csrfToken: 'csrf-example',
          budgets: [
            { id: 'budget-1', name: 'Household' },
            { id: 'budget-2', name: 'Shared' },
          ],
        },
      }),
    }),
  );
  render(<OAuthConsentApp />);

  expect(await screen.findByText(/Budget helper/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Allow access' })).toBeDisabled();
  const budgetPicker = screen.getByRole('button', {
    name: 'Choose a budget Budget',
  });
  fireEvent.click(budgetPicker);
  fireEvent.click(await screen.findByRole('option', { name: /Household/ }));
  expect(screen.getByRole('button', { name: 'Allow access' })).toBeEnabled();
  expect(budgetPicker).toHaveTextContent('Household');
  fireEvent.click(budgetPicker);
  fireEvent.click(await screen.findByRole('option', { name: /Shared/ }));
  expect(budgetPicker).toHaveTextContent('Shared');

  expect(fetch).toHaveBeenCalledWith(
    `/oauth/browser/request${window.location.search}`,
    expect.objectContaining({ credentials: 'same-origin' }),
  );
});
