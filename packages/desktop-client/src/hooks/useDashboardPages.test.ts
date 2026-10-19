import type { Query } from '@actual-app/core/shared/query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetTestProviders, TestProviders } from '#mocks';

import { useDashboardPageWidgets } from './useDashboardPages';

type TestWidget = { id: string; dashboard_page_id: string | null };

// Pages come back ordered by sort_order, so the first entry is the page
// that adopts widgets whose own page is missing
let pages: Array<{ id: string; name: string }> = [];
let widgets: TestWidget[] = [];

vi.mock('#queries/aqlQuery', () => ({
  aqlQuery: (query: Query) => {
    switch (query.state.table) {
      case 'dashboard_pages':
        return Promise.resolve({ data: pages });
      case 'dashboard':
        return Promise.resolve({ data: widgets });
      default:
        throw new Error(`Unexpected query table: ${query.state.table}`);
    }
  },
}));

function renderWidgets(dashboardPageId: string) {
  return renderHook(() => useDashboardPageWidgets(dashboardPageId), {
    wrapper: TestProviders,
  });
}

describe('useDashboardPageWidgets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTestProviders();
    pages = [
      { id: 'first-page', name: 'Main' },
      { id: 'second-page', name: 'Second' },
    ];
    widgets = [];
  });

  it('returns the widgets belonging to the page', async () => {
    widgets = [
      { id: 'a', dashboard_page_id: 'first-page' },
      { id: 'b', dashboard_page_id: 'second-page' },
    ];

    const { result } = renderWidgets('second-page');

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data?.map(w => w.id)).toEqual(['b']);
  });

  it('shows a widget whose page does not exist on the first page', async () => {
    widgets = [
      { id: 'a', dashboard_page_id: 'first-page' },
      // Synced in from a device whose seeded page has a different id
      { id: 'orphan', dashboard_page_id: 'page-from-the-other-device' },
      { id: 'page-less', dashboard_page_id: null },
    ];

    const { result } = renderWidgets('first-page');

    await waitFor(() => expect(result.current.data).toHaveLength(3));
    expect(result.current.data?.map(w => w.id)).toEqual([
      'a',
      'orphan',
      'page-less',
    ]);
  });

  it('does not show orphaned widgets on the other pages', async () => {
    widgets = [
      { id: 'b', dashboard_page_id: 'second-page' },
      { id: 'orphan', dashboard_page_id: 'page-from-the-other-device' },
    ];

    const { result } = renderWidgets('second-page');

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data?.map(w => w.id)).toEqual(['b']);
  });

  it('adopts onto whichever page sorts first', async () => {
    pages = [{ id: 'only-page', name: 'Only' }];
    widgets = [
      { id: 'orphan', dashboard_page_id: 'page-from-the-other-device' },
    ];

    const { result } = renderWidgets('only-page');

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data?.map(w => w.id)).toEqual(['orphan']);
  });
});
