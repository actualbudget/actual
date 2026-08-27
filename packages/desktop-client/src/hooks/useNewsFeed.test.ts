import type * as PlatformModule from '@actual-app/core/shared/platform';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetTestProviders, TestProviders } from '#mocks';
import { newsFeedFixture } from '#news/fixtures';

import { useNewsFeed } from './useNewsFeed';

let mockIsFlagEnabled = false;
let mockLastSeenNewsDate: string | undefined = undefined;
const mockSetLastSeenNewsDate = vi.fn();

vi.mock('#hooks/useFeatureFlag', () => ({
  useFeatureFlag: () => mockIsFlagEnabled,
}));

vi.mock('#hooks/useGlobalPref', () => ({
  useGlobalPref: () => [mockLastSeenNewsDate, mockSetLastSeenNewsDate],
}));

vi.mock('@actual-app/core/shared/platform', async () => {
  const actual = await vi.importActual<typeof PlatformModule>(
    '@actual-app/core/shared/platform',
  );
  return { ...actual, isPlaywright: false };
});

describe('useNewsFeed', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    resetTestProviders();
    mockIsFlagEnabled = false;
    mockLastSeenNewsDate = undefined;
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(newsFeedFixture),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('never fetches while the feature flag is off', async () => {
    const { result } = renderHook(() => useNewsFeed(), {
      wrapper: TestProviders,
    });

    expect(result.current.isEnabled).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.entries).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches the feed and reports unseen entries when enabled', async () => {
    mockIsFlagEnabled = true;
    mockLastSeenNewsDate = '2025-12-15';

    const { result } = renderHook(() => useNewsFeed(), {
      wrapper: TestProviders,
    });

    await waitFor(() => expect(result.current.entries).toHaveLength(2));
    expect(fetchMock).toHaveBeenCalledWith(
      'https://actualbudget.org/news.json',
    );
    expect(result.current.unseenCount).toBe(1);

    result.current.markAllSeen();
    expect(mockSetLastSeenNewsDate).toHaveBeenCalledWith('2026-01-01');
  });
});
