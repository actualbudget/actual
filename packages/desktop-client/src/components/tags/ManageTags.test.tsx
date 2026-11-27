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

  function expectNoTagEditor() {
    expect(document.querySelector('[data-testid="tag"] input')).toBeNull();
  }

  // The outline is drawn on the cell whose test id matches the selected field
  function expectOutlinedCell(field: string) {
    const row = document.querySelector('[data-cursor-field]');
    expect(row?.getAttribute('data-cursor-field')).toBe(field);
    expect(row?.querySelector(`[data-testid="${field}"]`)).not.toBeNull();
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
    expectNoTagEditor();
  });

  it('can rename after canceling an earlier edit without saving the canceled draft', async () => {
    await startRenaming('Reimbursable');
    const input = screen.getByDisplayValue('Reimbursable');
    await userEvent.clear(input);
    await userEvent.type(input, 'Discarded{Escape}');
    expectNoTagEditor();
    expect(renameTag).not.toHaveBeenCalled();

    await startRenaming('Reimbursable');
    const reopenedInput = screen.getByDisplayValue('Reimbursable');
    await userEvent.clear(reopenedInput);
    await userEvent.type(reopenedInput, 'ToBeReimbursed{Enter}');
    expect(renameTag).toHaveBeenCalledExactlyOnceWith({
      id: 'tag-1',
      tag: 'ToBeReimbursed',
    });
    expectNoTagEditor();
  });

  it('outlines every column the keyboard can select', async () => {
    const select = screen
      .getByText('#Reimbursable')
      .closest<HTMLElement>('[data-testid="row"]')!
      .querySelector<HTMLElement>('[data-testid="select"]')!;
    // The checkbox only renders on hover
    await userEvent.hover(select);
    await userEvent.click(within(select).getByTestId('cell-button'));
    // Leaves the checkbox selected; the check stays until the next Escape
    await userEvent.keyboard('{Escape}');
    expectOutlinedCell('select');

    for (const field of ['tag', 'color', 'description']) {
      await userEvent.keyboard('{Tab}');
      expectOutlinedCell(field);
    }
  });

  it('toggles and clears checks from the selected cell', async () => {
    const table = screen.getByTestId('table');
    const rowBackground = (index: number) =>
      getComputedStyle(within(table).getAllByTestId('row')[index])
        .backgroundColor;
    act(() => table.focus());
    // Selects the first row's checkbox without editing
    await userEvent.keyboard('{ArrowDown}');
    expectOutlinedCell('select');
    const selectedColor = rowBackground(0);

    await userEvent.keyboard(' ');
    expect(screen.getByTestId('selected-tags-select-button')).toBeVisible();
    // A checked row keeps its own color under the selection
    expect(rowBackground(0)).not.toBe(selectedColor);

    await userEvent.keyboard('{Escape}');
    expect(
      screen.queryByTestId('selected-tags-select-button'),
    ).not.toBeInTheDocument();
    expectOutlinedCell('select');
    expect(rowBackground(0)).toBe(selectedColor);
  });
});
