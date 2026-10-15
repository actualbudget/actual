import { MemoryRouter } from 'react-router';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TestProviders } from '#mocks';
import type { NewsEntry } from '#news/types';

import { NotificationsPage } from './NotificationsPage';

const mockMarkAllSeen = vi.fn();
const mockRetry = vi.fn();
let mockEntries: NewsEntry[] = [];
let mockIsLoading = false;
let mockErrorKind: 'unavailable' | 'unsupported' | undefined = undefined;
let mockLastSeenNewsDate: string | undefined = undefined;

vi.mock('#hooks/useNewsFeed', () => ({
  useNewsFeed: () => ({
    isEnabled: true,
    entries: mockEntries,
    unseenCount: 0,
    lastSeenNewsDate: mockLastSeenNewsDate,
    markAllSeen: mockMarkAllSeen,
    isLoading: mockIsLoading,
    errorKind: mockErrorKind,
    retry: mockRetry,
  }),
}));

vi.mock('#hooks/useDateFormat', () => ({
  useDateFormat: () => 'dd.MM.yyyy',
}));

vi.mock('#hooks/useGlobalPref', () => ({
  useGlobalPref: () => [undefined, vi.fn()],
}));

const releaseEntry: NewsEntry = {
  id: 'release-26.8.1',
  type: 'release',
  title: 'Release 26.8.1',
  date: '2026-08-07',
  version: '26.8.1',
  url: 'https://actualbudget.org/docs/releases#2681',
  body: 'A hotfix.\n\n- Fixes **freezes**\n\n:::warning Deprecation\n\nTemplating is deprecated.\n\n:::\n\n> Plain quote.',
  details: '#### Bugfixes\n\n- [#8628](https://example.com/8628) Fix freezes',
};

const postEntry: NewsEntry = {
  id: 'post-hello',
  type: 'post',
  title: 'Hello world',
  date: '2026-07-01',
  url: 'https://actualbudget.org/blog/hello',
  body: 'An announcement.',
};

function renderPage() {
  return render(
    <TestProviders>
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    </TestProviders>,
  );
}

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEntries = [];
    mockIsLoading = false;
    mockErrorKind = undefined;
    mockLastSeenNewsDate = undefined;
  });

  it('renders entries with markdown, dates and links, and marks them seen', async () => {
    mockEntries = [releaseEntry, postEntry];
    mockLastSeenNewsDate = '2026-07-15';
    renderPage();

    // The pill already says "Release", so the title is just the version.
    expect(screen.getByRole('heading', { name: '26.8.1' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Hello world' }),
    ).toBeInTheDocument();
    // Dates follow the format chosen in Settings.
    expect(screen.getByText('07.08.2026')).toHaveAttribute(
      'datetime',
      '2026-08-07',
    );
    expect(screen.getByText('freezes')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'View on actualbudget.org' }),
    ).toHaveAttribute('href', 'https://actualbudget.org/docs/releases#2681');
    expect(
      screen.getByRole('link', { name: 'Read the full post' }),
    ).toHaveAttribute('href', 'https://actualbudget.org/blog/hello');

    // Only the release is newer than the last seen date.
    expect(screen.getAllByText('Unread')).toHaveLength(1);

    // Docusaurus admonitions render as callouts; ordinary quotes stay quotes.
    expect(screen.getByText('Deprecation')).toBeInTheDocument();
    expect(screen.getByText('Templating is deprecated.')).toBeInTheDocument();
    expect(screen.queryByText(/\[!warning\]/)).not.toBeInTheDocument();
    expect(
      screen.getByText('Plain quote.').closest('blockquote'),
    ).not.toBeNull();

    // Each category of changes is collapsed, with its count, until requested.
    const bugfixes = screen.getByRole('button', { name: 'Bugfixes (1)' });
    expect(bugfixes).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByRole('link', { name: '#8628' }),
    ).not.toBeInTheDocument();

    await userEvent.click(bugfixes);

    expect(bugfixes).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: '#8628' })).toBeInTheDocument();

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

  it('shows a calm notice with a retry when the feed cannot be loaded', async () => {
    mockErrorKind = 'unavailable';
    renderPage();

    expect(
      screen.getByText("Notifications aren't available right now."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/usually means you're offline/),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(mockRetry).toHaveBeenCalled();

    expect(
      screen.getByRole('link', { name: 'All release notes' }),
    ).toHaveAttribute('href', 'https://actualbudget.org/docs/releases');
    expect(
      screen.getByRole('link', { name: 'Community (Discord)' }),
    ).toHaveAttribute('href', 'https://discord.gg/pRYNYr4W5A');
  });

  it('asks the user to update when the feed format is not understood', () => {
    mockErrorKind = 'unsupported';
    renderPage();

    expect(
      screen.getByText('Update Actual to see the latest notifications.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Try again' }),
    ).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no entries', () => {
    renderPage();
    expect(screen.getByText('Nothing new to show yet.')).toBeInTheDocument();
  });
});
