import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';

import type * as PlatformModule from '@actual-app/core/shared/platform';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestAppStore, resetTestProviders, TestProviders } from '#mocks';
import { newsFeedFixture } from '#news/fixtures';

import { useNewsNotification } from './useNewsNotification';

let mockLastSeenNewsDate: string | undefined = undefined;
const mockSetLastSeenNewsDate = vi.fn();

let mockShowNewsFeed = true;

vi.mock('#hooks/useGlobalPref', () => ({
  useGlobalPref: (key: string) =>
    key === 'showNewsFeed'
      ? [mockShowNewsFeed, vi.fn()]
      : [mockLastSeenNewsDate, mockSetLastSeenNewsDate],
}));

vi.mock('@actual-app/core/shared/platform', async () => {
  const actual = await vi.importActual<typeof PlatformModule>(
    '@actual-app/core/shared/platform',
  );
  return { ...actual, isPlaywright: false };
});

describe('useNewsNotification', () => {
  const fetchMock = vi.fn();
  let store: ReturnType<typeof createTestAppStore>;

  function wrapper({ children }: { children: ReactNode }) {
    return (
      <TestProviders store={store}>
        <MemoryRouter>{children}</MemoryRouter>
      </TestProviders>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    resetTestProviders();
    store = createTestAppStore();
    mockLastSeenNewsDate = '2025-01-01';
    mockShowNewsFeed = true;
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(newsFeedFixture),
    });
    window.Actual = { ...window.Actual, ACTUAL_VERSION: '99.9.9' };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows a notification for an unseen release', async () => {
    renderHook(() => useNewsNotification(), { wrapper });

    await waitFor(() =>
      expect(store.getState().notifications.notifications).toHaveLength(1),
    );
    expect(store.getState().notifications.notifications[0]).toMatchObject({
      id: 'news-release-notification',
      title: "What's new in Actual 99.9.9",
      sticky: true,
    });
  });

  it('only marks the shown release as seen, not releases newer than the client', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          ...newsFeedFixture,
          entries: [
            {
              ...newsFeedFixture.entries[0],
              id: 'release-100.0.0',
              version: '100.0.0',
              date: '2026-02-01',
            },
            ...newsFeedFixture.entries,
          ],
        }),
    });
    renderHook(() => useNewsNotification(), { wrapper });

    await waitFor(() =>
      expect(store.getState().notifications.notifications).toHaveLength(1),
    );
    const notification = store.getState().notifications.notifications[0];
    expect(notification.title).toBe("What's new in Actual 99.9.9");

    notification.onClose?.();

    // 99.9.9 is dated 2026-01-01; the not-yet-installed 100.0.0 (2026-02-01)
    // must remain unseen so it gets its own notification after updating.
    expect(mockSetLastSeenNewsDate).toHaveBeenCalledWith('2026-01-01');
  });

  it('records the current position instead of notifying on first enable', async () => {
    mockLastSeenNewsDate = undefined;
    renderHook(() => useNewsNotification(), { wrapper });

    await waitFor(() =>
      expect(mockSetLastSeenNewsDate).toHaveBeenCalledWith('2026-01-01'),
    );
    expect(store.getState().notifications.notifications).toEqual([]);
  });

  it('does nothing when the user has turned the news feed off', async () => {
    mockShowNewsFeed = false;
    renderHook(() => useNewsNotification(), { wrapper });

    await act(() => Promise.resolve());

    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.getState().notifications.notifications).toEqual([]);
    expect(mockSetLastSeenNewsDate).not.toHaveBeenCalled();
  });
});
