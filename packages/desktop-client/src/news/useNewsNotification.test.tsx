import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';

import type * as PlatformModule from '@actual-app/core/shared/platform';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestAppStore, TestProviders } from '#mocks';
import { newsFeedFixture } from '#news/fixtures';

import { useNewsNotification } from './useNewsNotification';

let mockIsFlagEnabled = false;
let mockLastSeenNewsDate: string | undefined = undefined;
const mockSetLastSeenNewsDate = vi.fn();

vi.mock('#hooks/useFeatureFlag', () => ({
  useFeatureFlag: () => mockIsFlagEnabled,
}));

let mockShowNewsFeed: boolean | undefined = undefined;

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
    store = createTestAppStore();
    mockIsFlagEnabled = false;
    mockLastSeenNewsDate = '2025-01-01';
    mockShowNewsFeed = undefined;
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

  it('does nothing while the feature flag is off', async () => {
    renderHook(() => useNewsNotification(), { wrapper });

    // Give any (unexpected) fetch/dispatch a chance to happen.
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.getState().notifications.notifications).toEqual([]);
    expect(mockSetLastSeenNewsDate).not.toHaveBeenCalled();
  });

  it('shows a notification for an unseen release once the flag is on', async () => {
    mockIsFlagEnabled = true;
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

  it('records the current position instead of notifying on first enable', async () => {
    mockIsFlagEnabled = true;
    mockLastSeenNewsDate = undefined;
    renderHook(() => useNewsNotification(), { wrapper });

    await waitFor(() =>
      expect(mockSetLastSeenNewsDate).toHaveBeenCalledWith('2026-01-01'),
    );
    expect(store.getState().notifications.notifications).toEqual([]);
  });

  it('does nothing when the user has turned the news feed off', async () => {
    mockIsFlagEnabled = true;
    mockShowNewsFeed = false;
    renderHook(() => useNewsNotification(), { wrapper });

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.getState().notifications.notifications).toEqual([]);
  });
});
