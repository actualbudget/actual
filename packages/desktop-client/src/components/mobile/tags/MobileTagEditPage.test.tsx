import { MemoryRouter, Route, Routes } from 'react-router';

import { send } from '@actual-app/core/platform/client/connection';
import type { TagEntity } from '@actual-app/core/types/models';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useNavigate } from '#hooks/useNavigate';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { tagQueries } from '#tags';

import { MobileTagEditPage } from './MobileTagEditPage';
import { sanitiseTagName, sanitiseTagNameInput } from './utils';

vi.mock('#hooks/useNavigate');
vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn(),
  listen: vi.fn().mockReturnValue(vi.fn()),
}));
vi.mock('@actual-app/components/hooks/useResponsive', () => ({
  useResponsive: () => ({ isNarrowWidth: true }),
}));

const mockTags: TagEntity[] = [
  { id: 'tag-1', tag: 'groceries', color: '#1976D2', description: 'Food' },
  { id: 'tag-2', tag: 'holiday', color: null, description: null },
];

describe('sanitiseTagName', () => {
  it('turns spaces into single dashes and strips hashes', () => {
    expect(sanitiseTagName('#road trip')).toBe('road-trip');
    expect(sanitiseTagName('  road   trip  ')).toBe('road-trip');
    expect(sanitiseTagName('road - trip')).toBe('road-trip');
    expect(sanitiseTagName('a--b')).toBe('a--b');
  });

  it('keeps one trailing space while typing so the next word joins with a dash', () => {
    expect(sanitiseTagNameInput('road ')).toBe('road ');
    expect(sanitiseTagNameInput('road t')).toBe('road-t');
    expect(sanitiseTagNameInput(' ')).toBe('');
  });
});

describe('MobileTagEditPage', () => {
  const mockNavigate = vi.fn();
  const queryClient = createTestQueryClient();
  let store = configureTestAppStore({ queryClient });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(send).mockResolvedValue(mockTags);

    queryClient.setQueryData(tagQueries.list().queryKey, mockTags);
    store = configureTestAppStore({ queryClient });
  });

  const renderEditPage = (initialEntry: string) => {
    return render(
      <TestProviders queryClient={queryClient} store={store}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/tags/:id" element={<MobileTagEditPage />} />
          </Routes>
        </MemoryRouter>
      </TestProviders>,
    );
  };

  const getNotificationMessages = () =>
    store.getState().notifications.notifications.map(n => n.message);

  it('shows the fields of an existing tag', () => {
    renderEditPage('/tags/tag-1');

    expect(
      screen.getByRole('heading', { name: 'Edit tag' }),
    ).toBeInTheDocument();
    const nameInput = screen.getByRole('textbox', { name: 'Name' });
    expect(nameInput).toHaveValue('groceries');
    expect(nameInput).not.toHaveFocus();
    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveValue(
      'Food',
    );
    expect(
      screen.getByRole('button', { name: 'Color, #1976D2' }),
    ).toBeInTheDocument();
  });

  it('focuses the name field for a new tag', () => {
    renderEditPage('/tags/new');

    const nameInput = screen.getByRole('textbox', { name: 'Name' });
    expect(nameInput).toHaveFocus();
    expect(nameInput).not.toHaveAttribute('aria-invalid');
  });

  it('turns autocorrect back on for the description only', () => {
    renderEditPage('/tags/new');

    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAttribute(
      'autocapitalize',
      'none',
    );
    const descriptionInput = screen.getByRole('textbox', {
      name: 'Description',
    });
    expect(descriptionInput).toHaveAttribute('autocapitalize', 'sentences');
    expect(descriptionInput).toHaveAttribute('autocorrect', 'on');
  });

  it('prefills the name of a new tag from the list filter', () => {
    renderEditPage('/tags/new?filter=%23road%20trip');

    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue(
      'road-trip',
    );
  });

  it('creates a tag, turning spaces into dashes, and clears the filter', async () => {
    const user = userEvent.setup();
    renderEditPage('/tags/new?filter=gro');

    expect(
      screen.getByRole('heading', { name: 'New tag' }),
    ).toBeInTheDocument();
    const nameInput = screen.getByRole('textbox', { name: 'Name' });
    expect(nameInput).toHaveValue('gro');

    await user.clear(nameInput);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    await user.type(nameInput, '#road  trip ');
    await user.type(
      screen.getByRole('textbox', { name: 'Description' }),
      'Summer',
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(send).toBeCalledWith('tags-create', {
        tag: 'road-trip',
        color: null,
        description: 'Summer',
      }),
    );
    await waitFor(() => expect(mockNavigate).toBeCalledWith('/settings/tags'));
    expect(getNotificationMessages()).toEqual(['Tag "#road-trip" created']);
  });

  it('ties the duplicate name error to the field and blocks saving', async () => {
    const user = userEvent.setup();
    renderEditPage('/tags/tag-1');

    const nameInput = screen.getByRole('textbox', { name: 'Name' });
    await user.clear(nameInput);
    await user.type(nameInput, 'holiday');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'A tag with this name already exists.',
    );
    expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    expect(nameInput).toHaveAccessibleDescription(
      'A tag with this name already exists.',
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('compares names with case, as desktop does', async () => {
    const user = userEvent.setup();
    renderEditPage('/tags/tag-1');

    const nameInput = screen.getByRole('textbox', { name: 'Name' });
    await user.clear(nameInput);
    await user.type(nameInput, 'Holiday');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('opens the color sheet and applies what it selects', async () => {
    const user = userEvent.setup();
    renderEditPage('/tags/tag-1');

    await user.click(screen.getByRole('button', { name: 'Color, #1976D2' }));

    const [modal] = store.getState().modals.modalStack;
    if (modal?.name !== 'tag-color') {
      throw new Error('Expected the tag color sheet to be open');
    }
    expect(modal.options).toMatchObject({
      tagName: 'groceries',
      color: '#1976D2',
    });

    act(() => modal.options.onSelect(null));
    expect(
      screen.getByRole('button', { name: 'Color, theme default' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(send).toBeCalledWith('tags-update', {
        id: 'tag-1',
        tag: 'groceries',
        color: null,
        description: 'Food',
      }),
    );
  });

  it('renames a tag and updates its description', async () => {
    const user = userEvent.setup();
    renderEditPage('/tags/tag-1?filter=gro');

    const nameInput = screen.getByRole('textbox', { name: 'Name' });
    await user.clear(nameInput);
    await user.type(nameInput, 'food');
    const descriptionInput = screen.getByRole('textbox', {
      name: 'Description',
    });
    await user.clear(descriptionInput);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(send).toBeCalledWith('tags-update', {
        id: 'tag-1',
        tag: 'food',
        color: '#1976D2',
        description: null,
      }),
    );
    await waitFor(() =>
      expect(send).toBeCalledWith('tags-rename', { id: 'tag-1', tag: 'food' }),
    );
    await waitFor(() =>
      expect(mockNavigate).toBeCalledWith('/settings/tags?filter=gro'),
    );
    expect(getNotificationMessages()).toEqual(['Tag "#food" saved']);
  });

  it('saves nothing when no field changed', async () => {
    const user = userEvent.setup();
    renderEditPage('/tags/tag-2');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockNavigate).toBeCalledWith('/settings/tags'));
    expect(send).not.toBeCalled();
  });

  it('opens the transactions that use the tag', async () => {
    const user = userEvent.setup();
    renderEditPage('/tags/tag-2');

    await user.click(screen.getByRole('button', { name: 'View transactions' }));

    expect(mockNavigate).toBeCalledWith('/accounts', {
      state: {
        goBack: true,
        filterConditions: [
          { field: 'notes', op: 'hasTags', value: '#holiday', type: 'string' },
        ],
      },
    });
  });

  it('deletes the tag and returns to the list', async () => {
    const user = userEvent.setup();
    renderEditPage('/tags/tag-2?filter=hol');

    await user.click(screen.getByRole('button', { name: 'Delete tag' }));

    await waitFor(() =>
      expect(send).toBeCalledWith('tags-delete', { id: 'tag-2' }),
    );
    await waitFor(() =>
      expect(mockNavigate).toBeCalledWith('/settings/tags?filter=hol', {
        replace: true,
      }),
    );
    expect(getNotificationMessages()).toEqual(['Tag "#holiday" deleted']);
  });

  it('offers no delete or transactions actions for a new tag', () => {
    renderEditPage('/tags/new');

    expect(
      screen.queryByRole('button', { name: 'Delete tag' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'View transactions' }),
    ).not.toBeInTheDocument();
  });

  it('returns to the list when the tag does not exist', async () => {
    renderEditPage('/tags/missing');

    await waitFor(() =>
      expect(mockNavigate).toBeCalledWith('/settings/tags', { replace: true }),
    );
  });

  it('marks the name as required', () => {
    renderEditPage('/tags/new');

    expect(screen.getByRole('textbox', { name: 'Name' })).toBeRequired();
  });

  it('treats a hidden tag with the same name as a duplicate', async () => {
    const user = userEvent.setup();
    queryClient.setQueryData(tagQueries.list().queryKey, [
      ...mockTags,
      { id: 'tag-3', tag: 'secret', color: null, hidden: true },
    ]);
    renderEditPage('/tags/new');

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'secret');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'A hidden tag with this name already exists.',
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('renames before updating and sends the new name with the update', async () => {
    const user = userEvent.setup();
    renderEditPage('/tags/tag-1');

    const nameInput = screen.getByRole('textbox', { name: 'Name' });
    await user.clear(nameInput);
    await user.type(nameInput, 'food');
    await user.type(
      screen.getByRole('textbox', { name: 'Description' }),
      ' shop',
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockNavigate).toBeCalledWith('/settings/tags'));
    const mutations = vi
      .mocked(send)
      .mock.calls.map(([name]) => name)
      .filter(name => name !== 'tags-get');
    expect(mutations).toEqual(['tags-rename', 'tags-update']);
  });

  it('keeps the form while the tag refetches between the two saves', async () => {
    const user = userEvent.setup();
    let failUpdate: (error: Error) => void = vi.fn();
    let currentTags = mockTags;
    vi.mocked(send).mockImplementation(((name: string) => {
      if (name === 'tags-rename') {
        currentTags = mockTags.map(tag =>
          tag.id === 'tag-1' ? { ...tag, tag: 'food' } : tag,
        );
        return Promise.resolve('tag-1');
      }
      if (name === 'tags-update') {
        return new Promise((_, reject) => {
          failUpdate = reject;
        });
      }
      return Promise.resolve(currentTags);
    }) as typeof send);
    renderEditPage('/tags/tag-1');

    const nameInput = screen.getByRole('textbox', { name: 'Name' });
    await user.clear(nameInput);
    await user.type(nameInput, 'food');
    const descriptionInput = screen.getByRole('textbox', {
      name: 'Description',
    });
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Weekly shop');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(send).toBeCalledWith('tags-update', expect.anything()),
    );
    await waitFor(() =>
      expect(
        queryClient
          .getQueryData(tagQueries.list().queryKey)
          ?.find(tag => tag.id === 'tag-1')?.tag,
      ).toBe('food'),
    );

    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveValue(
      'Weekly shop',
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete tag' })).toBeDisabled();

    await act(async () => {
      failUpdate(new Error('update failed'));
    });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled(),
    );
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('food');
    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveValue(
      'Weekly shop',
    );
    expect(getNotificationMessages()).toContain('Tag "#food" saved');
    expect(mockNavigate).not.toBeCalled();
  });

  it('saves nothing and keeps the typed values when the rename fails', async () => {
    const user = userEvent.setup();
    vi.mocked(send).mockImplementation(((name: string) => {
      if (name === 'tags-rename') {
        return Promise.reject(new Error('A tag with that name already exists'));
      }
      return Promise.resolve(mockTags);
    }) as typeof send);
    renderEditPage('/tags/tag-1');

    const nameInput = screen.getByRole('textbox', { name: 'Name' });
    await user.clear(nameInput);
    await user.type(nameInput, 'deleted-name');
    await user.type(
      screen.getByRole('textbox', { name: 'Description' }),
      ' shop',
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled(),
    );
    expect(send).not.toBeCalledWith('tags-update', expect.anything());
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue(
      'deleted-name',
    );
    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveValue(
      'Food shop',
    );
    expect(getNotificationMessages()).not.toContain(
      'Tag "#deleted-name" saved',
    );
    expect(
      store.getState().notifications.notifications.map(n => n.pre),
    ).toContain('A tag with that name already exists');
    expect(mockNavigate).not.toBeCalled();
  });

  it('shows values restored elsewhere when the form has no edits', async () => {
    renderEditPage('/tags/tag-1');

    act(() => {
      queryClient.setQueryData(
        tagQueries.list().queryKey,
        mockTags.map(tag =>
          tag.id === 'tag-1'
            ? { ...tag, tag: 'restored', description: 'Before' }
            : tag,
        ),
      );
    });

    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue(
        'restored',
      ),
    );
    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveValue(
      'Before',
    );
  });

  it('keeps typed edits when the tag changes elsewhere', async () => {
    const user = userEvent.setup();
    renderEditPage('/tags/tag-1');

    await user.type(screen.getByRole('textbox', { name: 'Name' }), '-mine');
    act(() => {
      queryClient.setQueryData(
        tagQueries.list().queryKey,
        mockTags.map(tag =>
          tag.id === 'tag-1' ? { ...tag, description: 'Changed' } : tag,
        ),
      );
    });

    await waitFor(() =>
      expect(
        queryClient
          .getQueryData(tagQueries.list().queryKey)
          ?.find(tag => tag.id === 'tag-1')?.description,
      ).toBe('Changed'),
    );
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue(
      'groceries-mine',
    );
    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveValue(
      'Food',
    );
  });
});
