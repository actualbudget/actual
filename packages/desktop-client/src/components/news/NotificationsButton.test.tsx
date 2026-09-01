import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TestProviders } from '#mocks';

import { NotificationsButton } from './NotificationsButton';

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
        <NotificationsButton />
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </TestProviders>,
  );
}

describe('NotificationsButton', () => {
  beforeEach(() => {
    mockIsEnabled = true;
    mockUnseenCount = 0;
  });

  it('renders nothing while the news feed is disabled', () => {
    mockIsEnabled = false;
    renderButton();
    expect(
      screen.queryByTestId('notifications-button'),
    ).not.toBeInTheDocument();
  });

  it('shows the bell without a count when everything has been seen', () => {
    renderButton();
    expect(
      screen.getByRole('button', { name: 'Notifications' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('notifications-unseen-count'),
    ).not.toBeInTheDocument();
  });

  it('shows the unread count and caps it at 9+', () => {
    mockUnseenCount = 3;
    const { unmount } = renderButton();
    expect(screen.getByTestId('notifications-unseen-count')).toHaveTextContent(
      '3',
    );
    expect(
      screen.getByRole('button', { name: 'Notifications: 3 unread' }),
    ).toBeInTheDocument();
    unmount();

    mockUnseenCount = 12;
    renderButton();
    expect(screen.getByTestId('notifications-unseen-count')).toHaveTextContent(
      '9+',
    );
  });

  it('navigates to the notifications page when pressed', async () => {
    renderButton();
    expect(screen.getByTestId('location')).toHaveTextContent('/budget');

    await userEvent.click(screen.getByTestId('notifications-button'));

    expect(screen.getByTestId('location')).toHaveTextContent('/notifications');
  });
});
