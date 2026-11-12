import { DEFAULT_COLOR_SET } from '@actual-app/components/color-picker';
import type { TagEntity } from '@actual-app/core/types/models';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { pushModal } from '#modals/modalsSlice';
import { tagQueries } from '#tags';

import { TagColorModal } from './TagColorModal';

vi.mock('@actual-app/components/hooks/useResponsive', () => ({
  useResponsive: () => ({ isNarrowWidth: true }),
}));

function renderModal(color: string | null) {
  const onSelect = vi.fn<(color: string | null) => void>();
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(tagQueries.list().queryKey, [] as TagEntity[]);
  const store = configureTestAppStore({ queryClient });
  const options = { tagName: 'groceries', color, onSelect };
  store.dispatch(pushModal({ modal: { name: 'tag-color', options } }));
  render(
    <TestProviders queryClient={queryClient} store={store}>
      <TagColorModal {...options} />
    </TestProviders>,
  );
  return { onSelect, store };
}

describe('TagColorModal', () => {
  it('shows a preview, the theme default row and every palette color', async () => {
    renderModal(null);

    const dialog = await screen.findByRole('dialog', { name: 'Color' });
    expect(within(dialog).getByText('#groceries')).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Theme default' }),
    ).toBeInTheDocument();
    const swatches = within(
      within(dialog).getByRole('group', { name: 'Colors' }),
    ).getAllByRole('button');
    expect(swatches).toHaveLength(DEFAULT_COLOR_SET.length);
    expect(
      within(dialog).queryByRole('button', { name: 'Close' }),
    ).not.toBeInTheDocument();
  });

  it('selects no swatch when the tag uses the theme default', async () => {
    renderModal(null);

    await screen.findByRole('dialog', { name: 'Color' });
    expect(screen.queryByRole('button', { pressed: true })).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Hex color' })).toHaveValue('');
  });

  it('marks the current color as selected', async () => {
    renderModal('#388E3C');

    await screen.findByRole('dialog', { name: 'Color' });
    const selected = screen.getByRole('button', { pressed: true });
    expect(selected).toHaveAccessibleName(/#388E3C$/);
    expect(selected).toHaveAccessibleName(/green/);
  });

  it('applies a picked swatch and closes', async () => {
    const user = userEvent.setup();
    const { onSelect, store } = renderModal(null);

    await user.click(await screen.findByRole('button', { name: /#1976D2$/ }));

    expect(onSelect).toHaveBeenCalledWith('#1976D2');
    await waitFor(() =>
      expect(store.getState().modals.modalStack).toHaveLength(0),
    );
  });

  it('resets to the theme default and closes', async () => {
    const user = userEvent.setup();
    const { onSelect, store } = renderModal('#388E3C');

    await user.click(
      await screen.findByRole('button', { name: 'Theme default' }),
    );

    expect(onSelect).toHaveBeenCalledWith(null);
    await waitFor(() =>
      expect(store.getState().modals.modalStack).toHaveLength(0),
    );
  });

  it('applies a typed hex color without closing until Enter', async () => {
    const user = userEvent.setup();
    const { onSelect, store } = renderModal(null);

    const hexInput = await screen.findByRole('textbox', { name: 'Hex color' });
    await user.type(hexInput, '#12ab');
    expect(onSelect).not.toHaveBeenCalled();

    await user.type(hexInput, 'ef');
    expect(onSelect).toHaveBeenCalledWith('#12ABEF');
    expect(store.getState().modals.modalStack).toHaveLength(1);

    await user.type(hexInput, '{Enter}');
    await waitFor(() =>
      expect(store.getState().modals.modalStack).toHaveLength(0),
    );
  });

  it('does not focus the hex input when it opens', async () => {
    renderModal('#388E3C');

    await screen.findByRole('dialog', { name: 'Color' });
    expect(
      screen.getByRole('textbox', { name: 'Hex color' }),
    ).not.toHaveFocus();
  });
});
