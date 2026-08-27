import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TestProviders } from '#mocks';

import { WhatsNewButton } from './WhatsNewButton';

let mockIsEnabled = true;
let mockUnseenCount = 0;

vi.mock('#hooks/useNewsFeed', () => ({
  useNewsFeed: () => ({
    isEnabled: mockIsEnabled,
    entries: [],
    unseenCount: mockUnseenCount,
    lastSeenNewsDate: undefined,
    markAllSeen: vi.fn(),
    isLoading: false,
    error: null,
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderButton() {
  return render(
    <TestProviders>
      <MemoryRouter initialEntries={['/budget']}>
        <WhatsNewButton />
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </TestProviders>,
  );
}

describe('WhatsNewButton', () => {
  beforeEach(() => {
    mockIsEnabled = true;
    mockUnseenCount = 0;
  });

  it('renders nothing while the feature flag is off', () => {
    mockIsEnabled = false;
    renderButton();
    expect(screen.queryByTestId('whats-new-button')).not.toBeInTheDocument();
  });

  it('shows the bell without a count when everything has been seen', () => {
    renderButton();
    expect(
      screen.getByRole('button', { name: "What's new" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('whats-new-unread-count'),
    ).not.toBeInTheDocument();
  });

  it('shows the unread count and caps it at 9+', () => {
    mockUnseenCount = 3;
    const { unmount } = renderButton();
    expect(screen.getByTestId('whats-new-unread-count')).toHaveTextContent('3');
    expect(
      screen.getByRole('button', { name: "What's new: 3 unread" }),
    ).toBeInTheDocument();
    unmount();

    mockUnseenCount = 12;
    renderButton();
    expect(screen.getByTestId('whats-new-unread-count')).toHaveTextContent(
      '9+',
    );
  });

  it("navigates to the What's new page when pressed", async () => {
    renderButton();
    expect(screen.getByTestId('location')).toHaveTextContent('/budget');

    await userEvent.click(screen.getByTestId('whats-new-button'));

    expect(screen.getByTestId('location')).toHaveTextContent('/whats-new');
  });
});
