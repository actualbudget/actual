import React from 'react';
import { MemoryRouter } from 'react-router';

import { initServer } from '@actual-app/core/platform/client/connection';
import type { TagEntity } from '@actual-app/core/types/models';
import { act, render, screen, within } from '@testing-library/react';
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

  async function selectTag(tagName: string) {
    const row = screen
      .getByText(`#${tagName}`)
      .closest<HTMLElement>('[data-testid="row"]');
    if (!row) {
      throw new Error(`Row for #${tagName} not found`);
    }
    await userEvent.click(within(row).getByTestId('select'));
  }

  async function openSelectionMenu() {
    await userEvent.click(screen.getByTestId('selected-tags-select-button'));
    return screen.getByTestId('selected-tags-select-tooltip');
  }

  it('offers renaming from the selection menu for a single tag', async () => {
    await selectTag('Reimbursable');

    const menu = await openSelectionMenu();
    await userEvent.click(within(menu).getByText('Rename'));

    expect(await screen.findByDisplayValue('Reimbursable')).toBeInTheDocument();
    // The selection is cleared so the closing menu cannot pull focus back
    // out of the input, which would leave the delete/hide hotkeys live
    expect(
      screen.queryByTestId('selected-tags-select-button'),
    ).not.toBeInTheDocument();
  });

  it('drops renaming from the row context menu for a multi-selection', async () => {
    await selectTag('Reimbursable');
    await selectTag('Work');
    await userEvent.pointer({
      target: screen.getByText('#Reimbursable'),
      keys: '[MouseRight]',
    });

    expect(contextMenuItem('rename')).toBeUndefined();
    expect(contextMenuItem('delete')).toBeDefined();
  });

  it('keeps renaming in the row context menu for one selected tag', async () => {
    await selectTag('Reimbursable');
    await userEvent.pointer({
      target: screen.getByText('#Reimbursable'),
      keys: '[MouseRight]',
    });

    expect(contextMenuItem('rename')).toBeDefined();
  });

  it('drops renaming from the selection menu for a multi-selection', async () => {
    await selectTag('Reimbursable');
    await selectTag('Work');

    const menu = await openSelectionMenu();

    expect(within(menu).queryByText('Rename')).not.toBeInTheDocument();
    expect(within(menu).getByText('Delete')).toBeInTheDocument();
  });

  it('renames the tag on submit', async () => {
    await startRenaming('Reimbursable');

    const input = screen.getByDisplayValue('Reimbursable');
    await userEvent.clear(input);
    await userEvent.type(input, 'ToBeReimbursed{Enter}');

    expect(renameTag).toHaveBeenCalledTimes(1);
    expect(renameTag).toHaveBeenCalledWith({
      id: 'tag-1',
      tag: 'ToBeReimbursed',
    });
    // No editor is left open anywhere: the navigator would otherwise carry
    // editing on to the next row's tag field
    expect(screen.queryAllByTestId('tag')).toHaveLength(0);
  });
});
