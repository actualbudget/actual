import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { TestProviders } from '#mocks';
import type * as Redux from '#redux';

import { EditFieldModal } from './EditFieldModal';

const dispatch = vi.fn();

vi.mock('#redux', async importOriginal => ({
  ...(await importOriginal<typeof Redux>()),
  useDispatch: () => dispatch,
}));

vi.mock('#hooks/useTags', () => ({
  useTags: () => ({ data: [] }),
  useFilteredTags: () => ({ data: [], refetch: vi.fn() }),
}));

vi.mock('#tags', () => ({
  useCreateTagMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe('EditFieldModal', () => {
  test('confirms before removing all tags from notes', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <TestProviders>
        <EditFieldModal name="notes" onSubmit={onSubmit} onClose={vi.fn()} />
      </TestProviders>,
    );

    await user.click(screen.getByRole('button', { name: 'Remove all tags' }));

    expect(dispatch).toHaveBeenCalledTimes(1);
    const action = dispatch.mock.calls[0][0];
    expect(action.payload.modal.name).toBe('confirm-delete');

    action.payload.modal.options.onConfirm();

    expect(onSubmit).toHaveBeenCalledWith('notes', '', 'removeAllTags');
  });
});
