import React from 'react';
import { MemoryRouter } from 'react-router';

import { initServer } from '@actual-app/core/platform/client/connection';
import type { TagEntity } from '@actual-app/core/types/models';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { tagQueries } from '#tags';

import { ManageTags } from './ManageTags';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const tags: TagEntity[] = [
  { id: 'tag-1', tag: 'Reimbursable', color: null, description: null },
  { id: 'tag-2', tag: 'Work', color: null, description: null },
];

const createRenameTagMock = () =>
  vi.fn(async ({ id }: { id: string; tag: string }) => id);

describe('ManageTags', () => {
  let store: ReturnType<typeof configureTestAppStore>;
  let renameTag: ReturnType<typeof createRenameTagMock>;

  beforeEach(async () => {
    renameTag = createRenameTagMock();
    initServer({ 'tags-get': async () => tags, 'tags-rename': renameTag });

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(tagQueries.list().queryKey, tags);
    store = configureTestAppStore({ queryClient });

    render(
      <TestProviders store={store} queryClient={queryClient}>
        <MemoryRouter>
          <ManageTags />
        </MemoryRouter>
      </TestProviders>,
    );
    await act(() => Promise.resolve());
  });

  function contextMenuItem(name: string) {
    const item = store
      .getState()
      .contextMenu.items.find(
        item => typeof item === 'object' && item.name === name,
      );
    return typeof item === 'object' ? item : undefined;
  }

  async function startRenaming(tagName: string) {
    await userEvent.pointer({
      target: screen.getByText(`#${tagName}`),
      keys: '[MouseRight]',
    });

    const rename = contextMenuItem('rename');
    if (!rename) {
      throw new Error('Rename context menu item not found');
    }
    await act(async () => rename.onClick?.());
  }

  it('offers renaming from the row context menu', async () => {
    await startRenaming('Reimbursable');

    expect(screen.getByDisplayValue('Reimbursable')).toBeInTheDocument();
  });

  it('renames the tag on submit', async () => {
    await startRenaming('Reimbursable');

    const input = screen.getByDisplayValue('Reimbursable');
    await userEvent.clear(input);
    await userEvent.type(input, 'ToBeReimbursed{Enter}');

    expect(renameTag).toHaveBeenCalledWith({
      id: 'tag-1',
      tag: 'ToBeReimbursed',
    });
  });

  it('does not rename when the name is unchanged', async () => {
    await startRenaming('Reimbursable');

    await userEvent.type(screen.getByDisplayValue('Reimbursable'), '{Enter}');

    expect(renameTag).not.toHaveBeenCalled();
  });
});
