import { DEFAULT_DASHBOARD_PAGE_ID } from '@actual-app/core/shared/dashboard';
import type { Query } from '@actual-app/core/shared/query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetTestProviders, TestProviders } from '#mocks';

import { useDashboardPageWidgets } from './useDashboardPages';

type TestPage = { id: string; name: string };
type TestWidget = { id: string; dashboard_page_id: string | null };

let pages: TestPage[] = [];
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
    pages = [];
    widgets = [];
  });

  it('returns the widgets belonging to the page', async () => {
    pages = [
      { id: DEFAULT_DASHBOARD_PAGE_ID, name: 'Main' },
      { id: 'second-page', name: 'Second' },
    ];
    widgets = [
      { id: 'a', dashboard_page_id: DEFAULT_DASHBOARD_PAGE_ID },
      { id: 'b', dashboard_page_id: 'second-page' },
    ];

    const { result } = renderWidgets('second-page');

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data?.map(w => w.id)).toEqual(['b']);
  });

  it('shows a widget whose page does not exist on the default page', async () => {
    pages = [
      { id: DEFAULT_DASHBOARD_PAGE_ID, name: 'Main' },
      { id: 'second-page', name: 'Second' },
    ];
    widgets = [
      { id: 'a', dashboard_page_id: DEFAULT_DASHBOARD_PAGE_ID },
      // Synced in from a device with a different default page id
      { id: 'orphan', dashboard_page_id: 'page-from-the-other-device' },
      { id: 'page-less', dashboard_page_id: null },
    ];

    const { result } = renderWidgets(DEFAULT_DASHBOARD_PAGE_ID);

    await waitFor(() => expect(result.current.data).toHaveLength(3));
    expect(result.current.data?.map(w => w.id)).toEqual([
      'a',
      'orphan',
      'page-less',
    ]);
  });

  it('does not show orphaned widgets on the other pages', async () => {
    pages = [
      { id: DEFAULT_DASHBOARD_PAGE_ID, name: 'Main' },
      { id: 'second-page', name: 'Second' },
    ];
    widgets = [
      { id: 'b', dashboard_page_id: 'second-page' },
      { id: 'orphan', dashboard_page_id: 'page-from-the-other-device' },
    ];

    const { result } = renderWidgets('second-page');

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data?.map(w => w.id)).toEqual(['b']);
  });

  it('falls back to the first page when there is no default page', async () => {
    pages = [{ id: 'only-page', name: 'Only' }];
    widgets = [
      { id: 'orphan', dashboard_page_id: 'page-from-the-other-device' },
    ];

    const { result } = renderWidgets('only-page');

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data?.map(w => w.id)).toEqual(['orphan']);
  });
});
