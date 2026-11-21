import { MemoryRouter, useLocation } from 'react-router';

import { send } from '@actual-app/core/platform/client/connection';
import type { TagEntity } from '@actual-app/core/types/models';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useNavigate } from '#hooks/useNavigate';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { tagQueries } from '#tags';

import { MobileTagsPage } from './MobileTagsPage';

vi.mock('@use-gesture/react', () => ({
  useDrag: vi.fn().mockReturnValue(() => ({})),
}));
vi.mock('#hooks/useNavigate');
vi.mock('@actual-app/components/hooks/useResponsive', () => ({
  useResponsive: () => ({ isNarrowWidth: true }),
}));
vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn(),
  listen: vi.fn().mockReturnValue(vi.fn()),
}));

const mockTags: TagEntity[] = [
  { id: 'tag-1', tag: 'groceries', color: '#1976D2', description: 'Food' },
  { id: 'tag-2', tag: 'holiday', color: null, description: null },
  { id: 'tag-3', tag: 'work', color: null, description: 'Expenses to claim' },
];

function LocationSearch() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

describe('MobileTagsPage', () => {
  const mockNavigate = vi.fn();
  const queryClient = createTestQueryClient();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(send).mockResolvedValue(mockTags);

    queryClient.setQueryData(tagQueries.list().queryKey, mockTags);
  });

  const renderTagsPage = (initialEntry = '/tags') => {
    return render(
      <TestProviders queryClient={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <MobileTagsPage />
          <LocationSearch />
        </MemoryRouter>
      </TestProviders>,
    );
  };

  it('renders the header, search box and add button', () => {
    renderTagsPage();

    expect(screen.getByRole('heading', { name: 'Tags' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Filter tags…')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add new tag' }),
    ).toBeInTheDocument();
  });

  it('lists every tag with its description', () => {
    renderTagsPage();

    const list = screen.getByRole('grid', { name: 'Tags' });
    expect(within(list).getAllByRole('row')).toHaveLength(3);
    expect(screen.getByText('#groceries')).toBeInTheDocument();
    expect(screen.getByText('#holiday')).toBeInTheDocument();
    expect(screen.getByText('#work')).toBeInTheDocument();
    expect(screen.getByText('Expenses to claim')).toBeInTheDocument();
  });

  it('filters tags by name', async () => {
    const user = userEvent.setup();
    renderTagsPage();

    await user.type(screen.getByPlaceholderText('Filter tags…'), 'HOLI');

    expect(screen.getByText('#holiday')).toBeInTheDocument();
    expect(screen.queryByText('#groceries')).not.toBeInTheDocument();
    expect(screen.queryByText('#work')).not.toBeInTheDocument();
  });

  it('filters tags by description and ignores a leading hash', async () => {
    const user = userEvent.setup();
    renderTagsPage();

    const searchBox = screen.getByPlaceholderText('Filter tags…');
    await user.type(searchBox, 'claim');

    expect(screen.getByText('#work')).toBeInTheDocument();
    expect(screen.queryByText('#holiday')).not.toBeInTheDocument();

    await user.clear(searchBox);
    await user.type(searchBox, '#groc');

    expect(screen.getByText('#groceries')).toBeInTheDocument();
    expect(screen.queryByText('#work')).not.toBeInTheDocument();
  });

  it('shows a message when no tags match the filter', async () => {
    const user = userEvent.setup();
    renderTagsPage();

    await user.type(screen.getByPlaceholderText('Filter tags…'), 'nonsense');

    expect(screen.getByText('No tags found.')).toBeInTheDocument();
  });

  it('shows a message when there are no tags', () => {
    queryClient.setQueryData(tagQueries.list().queryKey, []);

    renderTagsPage();

    expect(screen.getByText('No tags yet.')).toBeInTheDocument();
  });

  it('opens the edit page when a tag is pressed', async () => {
    const user = userEvent.setup();
    renderTagsPage();

    await user.click(screen.getByText('#groceries'));

    expect(mockNavigate).toBeCalledWith('/tags/tag-1');
  });

  it('opens the new tag page from the add button', async () => {
    const user = userEvent.setup();
    renderTagsPage('/tags?filter=work');

    await user.click(screen.getByRole('button', { name: 'Add new tag' }));

    expect(mockNavigate).toBeCalledWith('/tags/new?filter=work');
  });

  it('keeps the filter in the URL and carries it to the edit page', async () => {
    const user = userEvent.setup();
    renderTagsPage();

    await user.type(screen.getByPlaceholderText('Filter tags…'), 'work');

    expect(screen.getByTestId('location-search')).toHaveTextContent(
      'filter=work',
    );

    await user.click(screen.getByText('#work'));

    expect(mockNavigate).toBeCalledWith('/tags/tag-3?filter=work');
  });

  it('restores the filter from the URL', () => {
    renderTagsPage('/tags?filter=work');

    expect(screen.getByPlaceholderText('Filter tags…')).toHaveValue('work');
    expect(screen.getByText('#work')).toBeInTheDocument();
    expect(screen.queryByText('#holiday')).not.toBeInTheDocument();
  });

  it('opens the transactions that use a tag', async () => {
    const user = userEvent.setup();
    renderTagsPage();

    const row = screen.getByRole('row', { name: /#holiday/ });
    await user.click(
      within(row).getByRole('button', { name: 'View transactions' }),
    );

    expect(mockNavigate).toBeCalledWith('/accounts', {
      state: {
        goBack: true,
        filterConditions: [
          { field: 'notes', op: 'hasTags', value: '#holiday', type: 'string' },
        ],
      },
    });
  });

  it('deletes a tag from its row actions', async () => {
    const user = userEvent.setup();
    renderTagsPage();

    const row = screen.getByRole('row', { name: /#holiday/ });
    await user.click(within(row).getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(send).toBeCalledWith('tags-delete', { id: 'tag-2' }),
    );
  });

  it('shows an undo toast for every delete when several run at once', async () => {
    const user = userEvent.setup();
    const store = configureTestAppStore({ queryClient });
    render(
      <TestProviders queryClient={queryClient} store={store}>
        <MemoryRouter initialEntries={['/tags']}>
          <MobileTagsPage />
        </MemoryRouter>
      </TestProviders>,
    );

    const resolvers: Array<() => void> = [];
    vi.mocked(send).mockImplementation(((name: string) => {
      if (name === 'tags-delete') {
        return new Promise<void>(resolve => {
          resolvers.push(resolve);
        });
      }
      return Promise.resolve(mockTags);
    }) as typeof send);

    for (const name of [/#holiday/, /#work/]) {
      const row = screen.getByRole('row', { name });
      await user.click(within(row).getByRole('button', { name: 'Delete' }));
    }
    await waitFor(() => expect(resolvers).toHaveLength(2));
    await act(async () => {
      for (const resolve of resolvers) {
        resolve();
      }
    });

    await waitFor(() =>
      expect(
        store.getState().notifications.notifications.map(n => n.message),
      ).toEqual(['Tag "#holiday" deleted', 'Tag "#work" deleted']),
    );
  });
});
