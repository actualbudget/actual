import { HotkeysProvider } from 'react-hotkeys-hook';

import { initServer } from '@actual-app/core/platform/client/connection';
import type { TagEntity } from '@actual-app/core/types/models';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { createTestQueryClient, TestProviders } from '#mocks';
import { tagQueries } from '#tags/queries';

import { TransactionTagsModal } from './TransactionTagsModal';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const existingTags: TagEntity[] = [
  { id: 'tag1', tag: 'vacation' },
  { id: 'tag2', tag: 'taxes' },
];

function renderModal({
  onSubmit = vi.fn(),
  tags = existingTags,
}: {
  onSubmit?: (action: 'add' | 'remove' | 'remove-all', tags?: string[]) => void;
  tags?: TagEntity[];
} = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(tagQueries.list().queryKey, tags);

  const createTag = vi.fn(async (tag: Omit<TagEntity, 'id'>) => ({
    id: `created-${tag.tag}`,
    ...tag,
  }));

  initServer({
    'tags-create': createTag,
  });

  render(
    <HotkeysProvider initiallyActiveScopes={['app']}>
      <TestProviders queryClient={queryClient}>
        <TransactionTagsModal onSubmit={onSubmit} />
      </TestProviders>
    </HotkeysProvider>,
  );

  return { createTag, onSubmit };
}

afterEach(() => {
  global.__resetWorld();
});

describe('TransactionTagsModal', () => {
  it('creates typed custom tags when adding them to transactions', async () => {
    const user = userEvent.setup();
    const { createTag, onSubmit } = renderModal();

    await user.click(screen.getByRole('button', { name: '#vacation' }));
    await user.type(screen.getByPlaceholderText('Tag'), 'custom{Enter}');
    await user.click(screen.getByRole('button', { name: 'Add tags' }));

    await waitFor(() => {
      expect(createTag).toHaveBeenCalledTimes(1);
    });
    expect(createTag).toHaveBeenCalledWith({ tag: 'custom' });
    expect(onSubmit).toHaveBeenCalledWith('add', ['vacation', 'custom']);
  });
});
