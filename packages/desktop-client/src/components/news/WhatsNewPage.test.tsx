import { MemoryRouter } from 'react-router';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TestProviders } from '#mocks';
import type { NewsEntry } from '#news/types';

import { WhatsNewPage } from './WhatsNewPage';

const mockMarkAllSeen = vi.fn();
let mockEntries: NewsEntry[] = [];
let mockIsLoading = false;
let mockError: Error | null = null;
let mockLastSeenNewsDate: string | undefined = undefined;

vi.mock('#hooks/useNewsFeed', () => ({
  useNewsFeed: () => ({
    isEnabled: true,
    entries: mockEntries,
    unseenCount: 0,
    lastSeenNewsDate: mockLastSeenNewsDate,
    markAllSeen: mockMarkAllSeen,
    isLoading: mockIsLoading,
    error: mockError,
  }),
}));

vi.mock('#hooks/useDateFormat', () => ({
  useDateFormat: () => 'yyyy-MM-dd',
}));

const releaseEntry: NewsEntry = {
  id: 'release-26.8.1',
  type: 'release',
  title: 'Release 26.8.1',
  date: '2026-08-07',
  version: '26.8.1',
  url: 'https://actualbudget.org/docs/releases#2681',
  summary: 'A hotfix.',
  body: 'A hotfix.\n\n- Fixes **freezes**',
  details: '#### Bugfixes\n\n- [#8628](https://example.com/8628) Fix freezes',
};

const postEntry: NewsEntry = {
  id: 'post-hello',
  type: 'post',
  title: 'Hello world',
  date: '2026-07-01',
  url: 'https://actualbudget.org/blog/hello',
  summary: 'An announcement.',
  body: 'An announcement.',
  tags: ['announcement'],
};

function renderPage() {
  return render(
    <TestProviders>
      <MemoryRouter>
        <WhatsNewPage />
      </MemoryRouter>
    </TestProviders>,
  );
}

describe('WhatsNewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEntries = [];
    mockIsLoading = false;
    mockError = null;
    mockLastSeenNewsDate = undefined;
  });

  it('renders entries with markdown, dates and links, and marks them seen', async () => {
    mockEntries = [releaseEntry, postEntry];
    mockLastSeenNewsDate = '2026-07-15';
    renderPage();

    expect(screen.getByText('Release 26.8.1')).toBeInTheDocument();
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText('2026-08-07')).toBeInTheDocument();
    expect(screen.getByText('freezes')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'View on actualbudget.org' }),
    ).toHaveAttribute('href', 'https://actualbudget.org/docs/releases#2681');
    expect(
      screen.getByRole('link', { name: 'Read the full post' }),
    ).toHaveAttribute('href', 'https://actualbudget.org/blog/hello');

    // Only the release is newer than the last seen date.
    expect(screen.getAllByTitle('Unread')).toHaveLength(1);
    expect(
      screen.getByTestId('whats-new-entry-release-26.8.1'),
    ).toContainElement(screen.getByTitle('Unread'));

    // Full changelog is collapsed until requested.
    expect(screen.queryByText('Bugfixes')).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Show all changes' }),
    );
    expect(screen.getByText('Bugfixes')).toBeInTheDocument();

    expect(mockMarkAllSeen).toHaveBeenCalled();
  });

  it('shows a loading indicator while fetching', () => {
    mockIsLoading = true;
    renderPage();

    expect(
      screen.queryByText('Nothing new to show yet.'),
    ).not.toBeInTheDocument();
    expect(mockMarkAllSeen).not.toHaveBeenCalled();
  });

  it('shows a friendly offline message when the feed cannot be loaded', () => {
    mockError = new Error('offline');
    renderPage();

    expect(screen.getByTestId('whats-new-offline')).toHaveTextContent(
      "The latest news isn't available right now",
    );
    expect(screen.getByTestId('whats-new-offline')).toHaveTextContent(
      /usually means you're offline/,
    );
    expect(
      screen.getByRole('link', { name: 'All release notes' }),
    ).toHaveAttribute('href', 'https://actualbudget.org/docs/releases');
  });

  it('shows an empty state when there are no entries', () => {
    renderPage();
    expect(screen.getByText('Nothing new to show yet.')).toBeInTheDocument();
  });
});
